import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { UpdateToteInput, Tote, Item, ItemPhoto } from '@/types';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function resolveId(params: Promise<{ id: string }> | { id: string }): Promise<string> {
  const resolved = await Promise.resolve(params);
  return resolved.id;
}

// GET /api/totes/:id - Get tote details with items
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const db = getDb();
    const id = await resolveId(context.params);
    const tote = db.prepare('SELECT * FROM totes WHERE id = ?').get(id) as Tote | undefined;

    if (!tote) {
      return NextResponse.json(
        { error: 'Tote not found' },
        { status: 404 }
      );
    }

    // Get items in this tote
    const items = db.prepare(
      'SELECT * FROM items WHERE tote_id = ? ORDER BY created_at DESC'
    ).all(id) as Item[];

    // Get item count
    const countResult = db.prepare(
      'SELECT COUNT(*) as count FROM items WHERE tote_id = ?'
    ).get(id) as { count: number };

    // Get photos for all items in this tote to display thumbnails in list view
    const itemIds = items.map(item => item.id);
    let photosByItem: Record<number, ItemPhoto[]> = {};
    if (itemIds.length > 0) {
      const placeholders = itemIds.map(() => '?').join(',');
      const photos = db.prepare(
        `SELECT * FROM item_photos WHERE item_id IN (${placeholders}) ORDER BY created_at ASC`
      ).all(...itemIds) as ItemPhoto[];
      for (const photo of photos) {
        if (!photosByItem[photo.item_id]) {
          photosByItem[photo.item_id] = [];
        }
        photosByItem[photo.item_id].push(photo);
      }
    }

    // Attach photos to each item
    const itemsWithPhotos = items.map(item => ({
      ...item,
      photos: photosByItem[item.id] || [],
    }));

    return NextResponse.json({
      data: {
        ...tote,
        items: itemsWithPhotos,
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
  context: RouteContext
) {
  try {
    const db = getDb();
    const id = await resolveId(context.params);
    const body: UpdateToteInput = await request.json();

    // Check tote exists
    const existing = db.prepare('SELECT * FROM totes WHERE id = ?').get(id) as Tote | undefined;
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
    ).run(...values, id);

    const updated = db.prepare('SELECT * FROM totes WHERE id = ?').get(id) as Tote;

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
  context: RouteContext
) {
  try {
    const db = getDb();
    const id = await resolveId(context.params);

    // Check tote exists
    const existing = db.prepare('SELECT * FROM totes WHERE id = ?').get(id) as Tote | undefined;
    if (!existing) {
      return NextResponse.json(
        { error: 'Tote not found' },
        { status: 404 }
      );
    }

    // Get item count for response
    const countResult = db.prepare(
      'SELECT COUNT(*) as count FROM items WHERE tote_id = ?'
    ).get(id) as { count: number };

    // Delete the tote (cascade will handle items due to foreign key)
    db.prepare('DELETE FROM totes WHERE id = ?').run(id);

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
