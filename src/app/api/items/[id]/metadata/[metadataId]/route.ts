import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// PUT /api/items/:id/metadata/:metadataId - Update a metadata entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; metadataId: string }> }
) {
  try {
    const { id, metadataId } = await params;
    const db = getDb();
    const body = await request.json();

    const { key, value } = body;

    // Verify the metadata entry exists and belongs to this item
    const existing = db.prepare(
      'SELECT * FROM item_metadata WHERE id = ? AND item_id = ?'
    ).get(Number(metadataId), Number(id));

    if (!existing) {
      return NextResponse.json(
        { error: 'Metadata entry not found' },
        { status: 404 }
      );
    }

    // Build update fields
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (key !== undefined && typeof key === 'string' && key.trim() !== '') {
      updates.push('key = ?');
      values.push(key.trim());

      // Also add key to metadata_keys for autocomplete
      db.prepare(
        'INSERT OR IGNORE INTO metadata_keys (key_name) VALUES (?)'
      ).run(key.trim());
    }

    if (value !== undefined && typeof value === 'string' && value.trim() !== '') {
      updates.push('value = ?');
      values.push(value.trim());
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updates.push("updated_at = datetime('now')");
    values.push(Number(metadataId), Number(id));

    db.prepare(
      `UPDATE item_metadata SET ${updates.join(', ')} WHERE id = ? AND item_id = ?`
    ).run(...values);

    const updated = db.prepare(
      'SELECT * FROM item_metadata WHERE id = ?'
    ).get(Number(metadataId));

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

    // Verify the metadata entry exists and belongs to this item
    const existing = db.prepare(
      'SELECT * FROM item_metadata WHERE id = ? AND item_id = ?'
    ).get(Number(metadataId), Number(id));

    if (!existing) {
      return NextResponse.json(
        { error: 'Metadata entry not found' },
        { status: 404 }
      );
    }

    db.prepare(
      'DELETE FROM item_metadata WHERE id = ? AND item_id = ?'
    ).run(Number(metadataId), Number(id));

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
