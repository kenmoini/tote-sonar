import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { IdParam } from '@/lib/validation';
import { processPhotoUpload, getMaxUploadSize } from '@/lib/photos';

// POST /api/items/:id/photos - Upload a photo for an item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID is a positive integer
    const idResult = IdParam.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json(
        { error: 'Invalid item ID. Must be a positive integer.' },
        { status: 400 }
      );
    }
    const itemId = idResult.data;

    const db = getDb();

    // Verify item exists
    const item = db.prepare('SELECT id, tote_id FROM items WHERE id = ?').get(itemId) as Record<string, unknown> | undefined;
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check photo count limit (max 3)
    const photoCount = db.prepare('SELECT COUNT(*) as count FROM item_photos WHERE item_id = ?').get(itemId) as { count: number };
    if (photoCount.count >= 3) {
      return NextResponse.json({ error: 'Maximum 3 photos per item reached' }, { status: 400 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('photo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No photo file provided' }, { status: 400 });
    }

    // Use shared photo processing utility
    const result = await processPhotoUpload(file, getMaxUploadSize());

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: result.error.status }
      );
    }

    const { filename, originalPath, thumbnailPath, fileSize, mimeType } = result.data;

    // Insert photo record into database
    const stmt = db.prepare(`
      INSERT INTO item_photos (item_id, filename, original_path, thumbnail_path, file_size, mime_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const dbResult = stmt.run(itemId, filename, originalPath, thumbnailPath, fileSize, mimeType);

    // Get the created photo record
    const photo = db.prepare('SELECT * FROM item_photos WHERE id = ?').get(dbResult.lastInsertRowid);

    return NextResponse.json({
      data: photo,
      message: 'Photo uploaded successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading photo:', error);
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    );
  }
}

// GET /api/items/:id/photos - List photos for an item
export async function GET(
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

    const photos = db.prepare(
      'SELECT * FROM item_photos WHERE item_id = ? ORDER BY created_at DESC'
    ).all(idResult.data);

    return NextResponse.json({ data: photos });
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}
