import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parseJsonBody, validateBody, IdParam, UpdateMetadataSchema } from '@/lib/validation';

// PUT /api/items/:id/metadata/:metadataId - Update a metadata entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; metadataId: string }> }
) {
  try {
    const { id, metadataId } = await params;
    const db = getDb();

    // Validate both IDs are positive integers
    const idResult = IdParam.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json(
        { error: 'Invalid item ID. Must be a positive integer.' },
        { status: 400 }
      );
    }
    const metaIdResult = IdParam.safeParse(metadataId);
    if (!metaIdResult.success) {
      return NextResponse.json(
        { error: 'Invalid metadata ID. Must be a positive integer.' },
        { status: 400 }
      );
    }
    const itemId = idResult.data;
    const metaId = metaIdResult.data;

    // Parse JSON body safely
    const parsed = await parseJsonBody(request);
    if (parsed.response) return parsed.response;

    // Validate with Zod schema
    const validated = validateBody(parsed.data, UpdateMetadataSchema);
    if (validated.response) return validated.response;

    const body = validated.data;

    // Verify the metadata entry exists and belongs to this item
    const existing = db.prepare(
      'SELECT * FROM item_metadata WHERE id = ? AND item_id = ?'
    ).get(metaId, itemId);

    if (!existing) {
      return NextResponse.json(
        { error: 'Metadata entry not found' },
        { status: 404 }
      );
    }

    // Build update fields
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (body.key !== undefined) {
      updates.push('key = ?');
      values.push(body.key.trim());

      // Also add key to metadata_keys for autocomplete
      db.prepare(
        'INSERT OR IGNORE INTO metadata_keys (key_name) VALUES (?)'
      ).run(body.key.trim());
    }

    if (body.value !== undefined) {
      updates.push('value = ?');
      values.push(body.value.trim());
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updates.push("updated_at = datetime('now')");
    values.push(metaId, itemId);

    db.prepare(
      `UPDATE item_metadata SET ${updates.join(', ')} WHERE id = ? AND item_id = ?`
    ).run(...values);

    const updated = db.prepare(
      'SELECT * FROM item_metadata WHERE id = ?'
    ).get(metaId);

    return NextResponse.json({
      data: updated,
      message: 'Metadata updated successfully'
    });
  } catch (error) {
    console.error('Error updating metadata:', error);
    return NextResponse.json(
      { error: 'Failed to update metadata' },
      { status: 500 }
    );
  }
}

// DELETE /api/items/:id/metadata/:metadataId - Delete a metadata entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; metadataId: string }> }
) {
  try {
    const { id, metadataId } = await params;
    const db = getDb();

    // Validate both IDs are positive integers
    const idResult = IdParam.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json(
        { error: 'Invalid item ID. Must be a positive integer.' },
        { status: 400 }
      );
    }
    const metaIdResult = IdParam.safeParse(metadataId);
    if (!metaIdResult.success) {
      return NextResponse.json(
        { error: 'Invalid metadata ID. Must be a positive integer.' },
        { status: 400 }
      );
    }

    // Verify the metadata entry exists and belongs to this item
    const existing = db.prepare(
      'SELECT * FROM item_metadata WHERE id = ? AND item_id = ?'
    ).get(metaIdResult.data, idResult.data);

    if (!existing) {
      return NextResponse.json(
        { error: 'Metadata entry not found' },
        { status: 404 }
      );
    }

    db.prepare(
      'DELETE FROM item_metadata WHERE id = ? AND item_id = ?'
    ).run(metaIdResult.data, idResult.data);

    return NextResponse.json({
      message: 'Metadata deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting metadata:', error);
    return NextResponse.json(
      { error: 'Failed to delete metadata' },
      { status: 500 }
    );
  }
}
