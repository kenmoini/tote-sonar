import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { IdParam } from '@/lib/validation';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

// GET /api/photos/:id/thumbnail - Serve thumbnail photo (item or tote via ?source=tote)
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

    // Determine table based on source query param
    const source = request.nextUrl.searchParams.get('source');
    const table = source === 'tote' ? 'tote_photos' : 'item_photos';

    const photo = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(photoId) as Record<string, unknown> | undefined;
    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const filePath = path.join(DATA_DIR, photo.thumbnail_path as string);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Thumbnail not found' }, { status: 404 });
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
    console.error('Error serving thumbnail:', error);
    return NextResponse.json({ error: 'Failed to serve thumbnail' }, { status: 500 });
  }
}
