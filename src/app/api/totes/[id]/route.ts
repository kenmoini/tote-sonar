import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Tote, Item, ItemPhoto } from '@/types';
import { parseJsonBody, validateBody, UpdateToteSchema } from '@/lib/validation';
import { deletePhotoFiles } from '@/lib/photos';

type RouteContext = { params: Promise<{ id: string }> };

async function resolveId(params: Promise<{ id: string }>): Promise<string> {
  const resolved = await params;
  return resolved.id;
}

// Validate tote ID format: must be 6-character alphanumeric
function isValidToteId(id: string): boolean {
  return /^[a-zA-Z0-9]{6}$/.test(id);
}

function invalidIdResponse() {
  return NextResponse.json(
    { error: 'Invalid tote ID format. Tote IDs must be exactly 6 alphanumeric characters.' },
    { status: 400 }
  );
}

// GET /api/totes/:id - Get tote details with items
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const db = getDb();
    const id = await resolveId(context.params);

    // Validate tote ID format
    if (!isValidToteId(id)) {
      return invalidIdResponse();
    }

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

    // Validate tote ID format
    if (!isValidToteId(id)) {
      return invalidIdResponse();
    }

    // Parse JSON body safely
    const parsed = await parseJsonBody(request);
    if (parsed.response) return parsed.response;

    // Validate with Zod schema
    const validated = validateBody(parsed.data, UpdateToteSchema);
    if (validated.response) return validated.response;

    const body = validated.data;

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
      values.push(body.size ? body.size.trim() || null : null);
    }
    if (body.color !== undefined) {
      updates.push('color = ?');
      values.push(body.color ? body.color.trim() || null : null);
    }
    if (body.owner !== undefined) {
      updates.push('owner = ?');
      values.push(body.owner ? body.owner.trim() || null : null);
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

    // Validate tote ID format
    if (!isValidToteId(id)) {
      return invalidIdResponse();
    }

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

    // Get all photo files for items in this tote BEFORE deleting (CASCADE will remove DB records)
    const itemPhotos = db.prepare(`
      SELECT ip.original_path, ip.thumbnail_path
      FROM item_photos ip
      JOIN items i ON ip.item_id = i.id
      WHERE i.tote_id = ?
    `).all(id) as Array<{ original_path: string; thumbnail_path: string }>;

    // Also get tote's own photos before cascade delete
    const totePhotos = db.prepare(
      'SELECT original_path, thumbnail_path FROM tote_photos WHERE tote_id = ?'
    ).all(id) as Array<{ original_path: string; thumbnail_path: string }>;

    // Combine all photos for file cleanup
    const allPhotos = [...itemPhotos, ...totePhotos];

    // Delete the tote (cascade will handle items, photos, metadata, movement history in DB)
    db.prepare('DELETE FROM totes WHERE id = ?').run(id);

    // Clean up photo files from disk using shared utility
    for (const photo of allPhotos) {
      deletePhotoFiles(photo.original_path, photo.thumbnail_path);
    }

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
