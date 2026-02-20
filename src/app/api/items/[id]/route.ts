import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUploadDir, getThumbnailDir } from '@/lib/db';
import fs from 'fs';
import path from 'path';

// GET /api/items/:id - Get item details with metadata, photos, movement history, and tote info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    // Get item with tote info
    const item = db.prepare(`
      SELECT i.*, t.name as tote_name, t.location as tote_location
      FROM items i
      JOIN totes t ON i.tote_id = t.id
      WHERE i.id = ?
    `).get(Number(id)) as Record<string, unknown> | undefined;

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Get metadata
    const metadata = db.prepare(`
      SELECT * FROM item_metadata WHERE item_id = ? ORDER BY created_at DESC
    `).all(Number(id));

    // Get photos
    const photos = db.prepare(`
      SELECT * FROM item_photos WHERE item_id = ? ORDER BY created_at DESC
    `).all(Number(id));

    // Get movement history with tote names
    const movementHistory = db.prepare(`
      SELECT
        imh.*,
        ft.name as from_tote_name,
        tt.name as to_tote_name
      FROM item_movement_history imh
      LEFT JOIN totes ft ON imh.from_tote_id = ft.id
      JOIN totes tt ON imh.to_tote_id = tt.id
      WHERE imh.item_id = ?
      ORDER BY imh.moved_at DESC
    `).all(Number(id));

    return NextResponse.json({
      data: {
        ...item,
        metadata,
        photos,
        movement_history: movementHistory,
      }
    });
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item' },
      { status: 500 }
    );
  }
}

// DELETE /api/items/:id - Delete an item and its associated photos, metadata, and movement history
export async function DELETE(
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

    // Get photos before deleting so we can remove files from disk
    const photos = db.prepare('SELECT * FROM item_photos WHERE item_id = ?').all(itemId) as Array<{ original_path: string; thumbnail_path: string }>;

    // Delete the item (cascade will handle metadata, photos records, movement history)
    db.prepare('DELETE FROM items WHERE id = ?').run(itemId);

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
        console.error('Error deleting photo file:', fileErr);
        // Continue - DB records are already deleted via cascade
      }
    }

    return NextResponse.json({
      message: `Item "${item.name}" deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}
