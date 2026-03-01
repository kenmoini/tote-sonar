import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { processPhotoUpload, getMaxUploadSize } from '@/lib/photos';
import { TotePhoto } from '@/types';

type RouteContext = { params: Promise<{ id: string }> };

// Validate tote ID format: must be 6-character alphanumeric
function isValidToteId(id: string): boolean {
  return /^[a-zA-Z0-9]{6}$/.test(id);
}

// POST /api/totes/:id/photos - Upload a photo for a tote
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // Validate tote ID format
    if (!isValidToteId(id)) {
      return NextResponse.json(
        { error: 'Invalid tote ID format. Tote IDs must be exactly 6 alphanumeric characters.' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify tote exists
    const tote = db.prepare('SELECT id FROM totes WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!tote) {
      return NextResponse.json({ error: 'Tote not found' }, { status: 404 });
    }

    // Check photo count limit (max 3)
    const photoCount = db.prepare('SELECT COUNT(*) as count FROM tote_photos WHERE tote_id = ?').get(id) as { count: number };
    if (photoCount.count >= 3) {
      return NextResponse.json({ error: 'Maximum 3 photos per tote reached' }, { status: 400 });
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
      INSERT INTO tote_photos (tote_id, filename, original_path, thumbnail_path, file_size, mime_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const dbResult = stmt.run(id, filename, originalPath, thumbnailPath, fileSize, mimeType);

    // Get the created photo record
    const photo = db.prepare('SELECT * FROM tote_photos WHERE id = ?').get(dbResult.lastInsertRowid);

    return NextResponse.json({
      data: photo,
      message: 'Photo uploaded successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading tote photo:', error);
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    );
  }
}

// GET /api/totes/:id/photos - List photos for a tote
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // Validate tote ID format
    if (!isValidToteId(id)) {
      return NextResponse.json(
        { error: 'Invalid tote ID format. Tote IDs must be exactly 6 alphanumeric characters.' },
        { status: 400 }
      );
    }

    const db = getDb();

    const photos = db.prepare(
      'SELECT * FROM tote_photos WHERE tote_id = ? ORDER BY created_at ASC'
    ).all(id) as TotePhoto[];

    return NextResponse.json({ data: photos });
  } catch (error) {
    console.error('Error fetching tote photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}
