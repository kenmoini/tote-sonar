import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// POST /api/items/:id/move - Move an item to a different tote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const itemId = Number(id);

    // Check item exists
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId) as Record<string, unknown> | undefined;
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { target_tote_id } = body;

    // Validate target tote ID
    if (!target_tote_id || typeof target_tote_id !== 'string' || !target_tote_id.trim()) {
      return NextResponse.json(
        { error: 'target_tote_id is required' },
        { status: 400 }
      );
    }

    const targetToteId = target_tote_id.trim();

    // Check target tote exists
    const targetTote = db.prepare('SELECT * FROM totes WHERE id = ?').get(targetToteId) as Record<string, unknown> | undefined;
    if (!targetTote) {
      return NextResponse.json(
        { error: 'Target tote not found' },
        { status: 404 }
      );
    }

    // Cannot move to the same tote
    if (item.tote_id === targetToteId) {
      return NextResponse.json(
        { error: 'Item is already in this tote' },
        { status: 400 }
      );
    }

    const fromToteId = item.tote_id as string;
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '');

    // Use a transaction: update item's tote_id and record movement history
    const moveTransaction = db.transaction(() => {
      // Update item's tote_id
      db.prepare(`
        UPDATE items SET tote_id = ?, updated_at = ? WHERE id = ?
      `).run(targetToteId, now, itemId);

      // Record movement history
      db.prepare(`
        INSERT INTO item_movement_history (item_id, from_tote_id, to_tote_id, moved_at)
        VALUES (?, ?, ?, ?)
      `).run(itemId, fromToteId, targetToteId, now);
    });

    moveTransaction();

    // Fetch the updated item with tote info
    const updatedItem = db.prepare(`
      SELECT i.*, t.name as tote_name, t.location as tote_location
      FROM items i
      JOIN totes t ON i.tote_id = t.id
      WHERE i.id = ?
    `).get(itemId);

    return NextResponse.json({
      message: `Item "${item.name}" moved to "${targetTote.name}" successfully`,
      data: updatedItem,
    });
  } catch (error) {
    console.error('Error moving item:', error);
    return NextResponse.json(
      { error: 'Failed to move item' },
      { status: 500 }
    );
  }
}
