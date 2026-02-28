import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parseJsonBody, validateBody, IdParam, DuplicateItemSchema } from '@/lib/validation';

// POST /api/items/:id/duplicate - Duplicate item within same or different tote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    // Validate ID is a positive integer
    const idResult = IdParam.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json(
        { error: 'Invalid item ID. Must be a positive integer.' },
        { status: 400 }
      );
    }
    const itemId = idResult.data;

    // Check item exists
    const item = db.prepare(`
      SELECT i.*, t.name as tote_name
      FROM items i
      JOIN totes t ON i.tote_id = t.id
      WHERE i.id = ?
    `).get(itemId) as Record<string, unknown> | undefined;

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Optionally accept a target_tote_id; default to the same tote
    let targetToteId = item.tote_id as string;

    // Parse body - empty body or invalid JSON is fine (duplicate in same tote)
    const parsed = await parseJsonBody(request);
    if (parsed.data !== undefined) {
      // Validate with Zod schema (only if we got valid JSON)
      const validated = validateBody(parsed.data, DuplicateItemSchema);
      if (validated.response) return validated.response;

      if (validated.data.target_tote_id) {
        const candidateId = validated.data.target_tote_id.trim();
        // Verify the target tote exists
        const targetTote = db.prepare('SELECT id FROM totes WHERE id = ?').get(candidateId);
        if (!targetTote) {
          return NextResponse.json(
            { error: 'Target tote not found' },
            { status: 404 }
          );
        }
        targetToteId = candidateId;
      }
    }
    // If parseJsonBody returned a response (invalid JSON), that's ok for duplicate -
    // just duplicate in same tote with no body

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '');

    // Duplicate the item with its metadata in a transaction
    const duplicateTransaction = db.transaction(() => {
      // Insert the duplicate item
      const result = db.prepare(`
        INSERT INTO items (tote_id, name, description, quantity, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        targetToteId,
        `${item.name} (Copy)`,
        item.description,
        item.quantity,
        now,
        now
      );

      const newItemId = result.lastInsertRowid;

      // Duplicate metadata tags
      const metadata = db.prepare(
        'SELECT key, value FROM item_metadata WHERE item_id = ?'
      ).all(itemId) as Array<{ key: string; value: string }>;

      if (metadata.length > 0) {
        const insertMeta = db.prepare(`
          INSERT INTO item_metadata (item_id, key, value, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `);

        for (const meta of metadata) {
          insertMeta.run(newItemId, meta.key, meta.value, now, now);
        }
      }

      return newItemId;
    });

    const newItemId = duplicateTransaction();

    // Fetch the new item to return
    const newItem = db.prepare(`
      SELECT i.*, t.name as tote_name, t.location as tote_location
      FROM items i
      JOIN totes t ON i.tote_id = t.id
      WHERE i.id = ?
    `).get(newItemId);

    return NextResponse.json({
      message: `Item "${item.name}" duplicated successfully`,
      data: newItem,
    }, { status: 201 });
  } catch (error) {
    console.error('Error duplicating item:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate item' },
      { status: 500 }
    );
  }
}
