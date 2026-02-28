import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { IdParam } from '@/lib/validation';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

// GET /api/photos/:id - Serve full-size photo
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
        { error: 'Invalid photo ID. Must be a positive integer.' },
        { status: 400 }
      );
    }
    const photoId = idResult.data;

    const photo = db.prepare('SELECT * FROM item_photos WHERE id = ?').get(photoId) as Record<string, unknown> | undefined;
    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const filePath = path.join(DATA_DIR, photo.original_path as string);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Photo file not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': photo.mime_type as string,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving photo:', error);
    return NextResponse.json({ error: 'Failed to serve photo' }, { status: 500 });
  }
}

// DELETE /api/photos/:id - Delete a photo
export async function DELETE(
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
        { error: 'Invalid photo ID. Must be a positive integer.' },
        { status: 400 }
      );
    }
    const photoId = idResult.data;

    const photo = db.prepare('SELECT * FROM item_photos WHERE id = ?').get(photoId) as Record<string, unknown> | undefined;
    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const originalFile = path.join(DATA_DIR, photo.original_path as string);
    const thumbnailFile = path.join(DATA_DIR, photo.thumbnail_path as string);

    // Delete DB record first (this is the authoritative action)
    db.prepare('DELETE FROM item_photos WHERE id = ?').run(photoId);

    // Clean up files (log and continue on failure)
    try {
      if (fs.existsSync(originalFile)) fs.unlinkSync(originalFile);
    } catch (fileErr) {
      console.error('Error deleting original photo file:', fileErr);
    }
    try {
      if (fs.existsSync(thumbnailFile)) fs.unlinkSync(thumbnailFile);
    } catch (fileErr) {
      console.error('Error deleting thumbnail file:', fileErr);
    }

    return NextResponse.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}
