import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { IdParam } from '@/lib/validation';
import { deletePhotoFiles } from '@/lib/photos';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

/**
 * Determine which table to query based on the `source` query param.
 * `?source=tote` targets tote_photos; default is item_photos.
 */
function getPhotoTable(request: NextRequest): string {
  const source = request.nextUrl.searchParams.get('source');
  return source === 'tote' ? 'tote_photos' : 'item_photos';
}

// GET /api/photos/:id - Serve full-size photo (item or tote via ?source=tote)
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

    const table = getPhotoTable(request);
    const photo = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(photoId) as Record<string, unknown> | undefined;
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

// DELETE /api/photos/:id - Delete a photo (item or tote via ?source=tote)
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

    const table = getPhotoTable(request);
    const photo = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(photoId) as Record<string, unknown> | undefined;
    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Delete DB record first (this is the authoritative action)
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(photoId);

    // Clean up files using shared utility (log and continue on failure)
    deletePhotoFiles(photo.original_path as string, photo.thumbnail_path as string);

    return NextResponse.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}
