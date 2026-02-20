import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { UpdateToteInput, Tote, Item } from '@/types';

// GET /api/totes/:id - Get tote details with items
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const tote = db.prepare('SELECT * FROM totes WHERE id = ?').get(params.id) as Tote | undefined;

    if (!tote) {
      return NextResponse.json(
        { error: 'Tote not found' },
        { status: 404 }
      );
    }

    // Get items in this tote
    const items = db.prepare(
      'SELECT * FROM items WHERE tote_id = ? ORDER BY created_at DESC'
    ).all(params.id) as Item[];

    // Get item count
    const countResult = db.prepare(
      'SELECT COUNT(*) as count FROM items WHERE tote_id = ?'
    ).get(params.id) as { count: number };

    return NextResponse.json({
      data: {
        ...tote,
        items,
        item_count: countResult.count,
      },
    });
  } catch (error) {
    console.error('Error fetching tote:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tote' },
      { status: 500 }
    );
  }
}

// PUT /api/totes/:id - Update tote metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const body: UpdateToteInput = await request.json();

    // Check tote exists
    const existing = db.prepare('SELECT * FROM totes WHERE id = ?').get(params.id) as Tote | undefined;
    if (!existing) {
      return NextResponse.json(
        { error: 'Tote not found' },
        { status: 404 }
      );
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name.trim());
    }
    if (body.location !== undefined) {
      updates.push('location = ?');
      values.push(body.location.trim());
    }
    if (body.size !== undefined) {
      updates.push('size = ?');
      values.push(body.size?.trim() || null);
    }
    if (body.color !== undefined) {
      updates.push('color = ?');
      values.push(body.color?.trim() || null);
    }
    if (body.owner !== undefined) {
      updates.push('owner = ?');
      values.push(body.owner?.trim() || null);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push("updated_at = datetime('now')");

    db.prepare(
      `UPDATE totes SET ${updates.join(', ')} WHERE id = ?`
    ).run(...values, params.id);

    const updated = db.prepare('SELECT * FROM totes WHERE id = ?').get(params.id) as Tote;

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error updating tote:', error);
    return NextResponse.json(
      { error: 'Failed to update tote' },
      { status: 500 }
    );
  }
}

// DELETE /api/totes/:id - Delete tote and cascade delete items
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();

    // Check tote exists
    const existing = db.prepare('SELECT * FROM totes WHERE id = ?').get(params.id) as Tote | undefined;
    if (!existing) {
      return NextResponse.json(
        { error: 'Tote not found' },
        { status: 404 }
      );
    }

    // Get item count for response
    const countResult = db.prepare(
      'SELECT COUNT(*) as count FROM items WHERE tote_id = ?'
    ).get(params.id) as { count: number };

    // Delete the tote (cascade will handle items due to foreign key)
    db.prepare('DELETE FROM totes WHERE id = ?').run(params.id);

    return NextResponse.json({
      message: `Tote '${existing.name}' deleted successfully`,
      items_deleted: countResult.count,
    });
  } catch (error) {
    console.error('Error deleting tote:', error);
    return NextResponse.json(
      { error: 'Failed to delete tote' },
      { status: 500 }
    );
  }
}
