import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateToteId } from '@/lib/db';
import { Tote } from '@/types';
import { parseJsonBody, validateBody, CreateToteSchema } from '@/lib/validation';

// GET /api/totes - List all totes with optional sorting
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sort') || 'created_at';
    const sortOrder = searchParams.get('order') || 'desc';

    // Whitelist allowed sort columns to prevent SQL injection
    const allowedSorts = ['name', 'location', 'owner', 'created_at', 'updated_at'];
    const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const totes = db.prepare(`
      SELECT t.*, COUNT(i.id) as item_count,
        (SELECT tp.id FROM tote_photos tp WHERE tp.tote_id = t.id ORDER BY tp.created_at ASC LIMIT 1) as cover_photo_id
      FROM totes t
      LEFT JOIN items i ON i.tote_id = t.id
      GROUP BY t.id
      ORDER BY t.${safeSortBy} ${safeSortOrder}
    `).all() as (Tote & { item_count: number; cover_photo_id: number | null })[];

    return NextResponse.json({ data: totes });
  } catch (error) {
    console.error('Error fetching totes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch totes' },
      { status: 500 }
    );
  }
}

// POST /api/totes - Create a new tote
export async function POST(request: NextRequest) {
  try {
    const db = getDb();

    // Parse JSON body safely
    const parsed = await parseJsonBody(request);
    if (parsed.response) return parsed.response;

    // Validate with Zod schema
    const validated = validateBody(parsed.data, CreateToteSchema);
    if (validated.response) return validated.response;

    const body = validated.data;

    // Generate unique 6-character ID
    let id = generateToteId();
    // Ensure uniqueness (extremely unlikely collision but handle it)
    while (db.prepare('SELECT id FROM totes WHERE id = ?').get(id)) {
      id = generateToteId();
    }

    const stmt = db.prepare(`
      INSERT INTO totes (id, name, location, size, color, owner)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      body.name.trim(),
      body.location.trim(),
      body.size?.trim() || null,
      body.color?.trim() || null,
      body.owner?.trim() || null
    );

    // Fetch the created tote to return it
    const tote = db.prepare('SELECT * FROM totes WHERE id = ?').get(id) as Tote;

    return NextResponse.json({ data: tote }, { status: 201 });
  } catch (error) {
    console.error('Error creating tote:', error);
    return NextResponse.json(
      { error: 'Failed to create tote' },
      { status: 500 }
    );
  }
}
