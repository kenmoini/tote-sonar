import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUploadDir, getThumbnailDir } from '@/lib/db';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import crypto from 'crypto';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const THUMBNAIL_WIDTH = 200;
const THUMBNAIL_HEIGHT = 200;

// POST /api/items/:id/photos - Upload a photo for an item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = Number(id);
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

    // Get max upload size from settings
    const maxSizeSetting = db.prepare("SELECT value FROM settings WHERE key = 'max_upload_size'").get() as { value: string } | undefined;
    const maxSize = maxSizeSetting ? parseInt(maxSizeSetting.value, 10) : 5242880; // Default 5MB

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('photo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No photo file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Supported formats: JPEG, PNG, WebP` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { error: `File size exceeds maximum of ${maxSizeMB}MB` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.type === 'image/jpeg' ? '.jpg' : file.type === 'image/png' ? '.png' : '.webp';
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const filename = `${uniqueId}${ext}`;

    // Get upload paths
    const uploadDir = getUploadDir();
    const thumbnailDir = getThumbnailDir();
    const originalPath = path.join(uploadDir, filename);
    const thumbnailFilename = `thumb_${filename}`;
    const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);

    // Read file bytes
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Write original file
    fs.writeFileSync(originalPath, buffer);

    // Generate thumbnail with sharp
    await sharp(buffer)
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, { fit: 'cover', position: 'center' })
      .toFile(thumbnailPath);

    // Insert photo record into database
    const stmt = db.prepare(`
      INSERT INTO item_photos (item_id, filename, original_path, thumbnail_path, file_size, mime_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      itemId,
      filename,
      `uploads/${filename}`,
      `thumbnails/${thumbnailFilename}`,
      file.size,
      file.type
    );

    // Get the created photo record
    const photo = db.prepare('SELECT * FROM item_photos WHERE id = ?').get(result.lastInsertRowid);

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

    const photos = db.prepare(
      'SELECT * FROM item_photos WHERE item_id = ? ORDER BY created_at DESC'
    ).all(Number(id));

    return NextResponse.json({ data: photos });
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}
