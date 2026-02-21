import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUploadDir, getThumbnailDir } from '@/lib/db';
import { UpdateToteInput, Tote, Item, ItemPhoto } from '@/types';
import fs from 'fs';
import path from 'path';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function resolveId(params: Promise<{ id: string }> | { id: string }): Promise<string> {
  const resolved = await Promise.resolve(params);
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

    // Parse JSON body - handle empty or invalid JSON
    let body: UpdateToteInput;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid or empty request body. JSON object is required.' },
        { status: 400 }
      );
    }

    // Handle non-object body (e.g. null, string, number)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object.' },
        { status: 400 }
      );
    }

    // Check tote exists
    const existing = db.prepare('SELECT * FROM totes WHERE id = ?').get(id) as Tote | undefined;
    if (!existing) {
      return NextResponse.json(
        { error: 'Tote not found' },
        { status: 404 }
      );
    }

    // Validate field types before building update query
    const stringFields = ['name', 'location', 'size', 'color', 'owner'] as const;
    for (const field of stringFields) {
      if (body[field] !== undefined && body[field] !== null && typeof body[field] !== 'string') {
        return NextResponse.json(
          { error: `${field.charAt(0).toUpperCase() + field.slice(1)} must be a string` },
          { status: 400 }
        );
      }
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (body.name !== undefined) {
      if (!body.name || !(body.name as string).trim()) {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      updates.push('name = ?');
      values.push((body.name as string).trim());
    }
    if (body.location !== undefined) {
      if (!body.location || !(body.location as string).trim()) {
        return NextResponse.json(
          { error: 'Location cannot be empty' },
          { status: 400 }
        );
      }
      updates.push('location = ?');
      values.push((body.location as string).trim());
    }
    if (body.size !== undefined) {
      updates.push('size = ?');
      values.push(body.size ? (body.size as string).trim() || null : null);
    }
    if (body.color !== undefined) {
      updates.push('color = ?');
      values.push(body.color ? (body.color as string).trim() || null : null);
    }
    if (body.owner !== undefined) {
      updates.push('owner = ?');
      values.push(body.owner ? (body.owner as string).trim() || null : null);
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
    const photos = db.prepare(`
      SELECT ip.original_path, ip.thumbnail_path
      FROM item_photos ip
      JOIN items i ON ip.item_id = i.id
      WHERE i.tote_id = ?
    `).all(id) as Array<{ original_path: string; thumbnail_path: string }>;

    // Delete the tote (cascade will handle items, photos, metadata, movement history in DB)
    db.prepare('DELETE FROM totes WHERE id = ?').run(id);

    // Clean up photo files from disk
    const uploadsDir = getUploadDir();
    const thumbnailsDir = getThumbnailDir();
    for (const photo of photos) {
      try {
        const originalFile = path.join(uploadsDir, path.basename(photo.original_path));
        const thumbnailFile = path.join(thumbnailsDir, path.basename(photo.thumbnail_path));
        if (fs.existsSync(originalFile)) fs.unlinkSync(originalFile);
        if (fs.existsSync(thumbnailFile)) fs.unlinkSync(thumbnailFile);
      } catch (fileErr) {
        console.error('Error deleting photo file during tote cascade:', fileErr);
        // Continue - DB records are already deleted via cascade
      }
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
