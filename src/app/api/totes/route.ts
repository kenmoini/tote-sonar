import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateToteId } from '@/lib/db';
import { CreateToteInput, Tote } from '@/types';

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
      SELECT t.*, COUNT(i.id) as item_count
      FROM totes t
      LEFT JOIN items i ON i.tote_id = t.id
      GROUP BY t.id
      ORDER BY t.${safeSortBy} ${safeSortOrder}
    `).all() as (Tote & { item_count: number })[];

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

    // Parse JSON body - handle empty or invalid JSON
    let body: CreateToteInput;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid or empty request body. JSON with at least "name" and "location" fields is required.' },
        { status: 400 }
      );
    }

    // Handle non-object body (e.g. null, string, number)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object with "name" and "location" fields.' },
        { status: 400 }
      );
    }

    // Validate required fields and types
    if (!body.name || (typeof body.name !== 'string')) {
      return NextResponse.json(
        { error: 'Name is required and must be a string' },
        { status: 400 }
      );
    }
    if (!body.name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    if (!body.location || (typeof body.location !== 'string')) {
      return NextResponse.json(
        { error: 'Location is required and must be a string' },
        { status: 400 }
      );
    }
    if (!body.location.trim()) {
      return NextResponse.json(
        { error: 'Location is required' },
        { status: 400 }
      );
    }

    // Validate optional fields are strings if provided
    if (body.size !== undefined && body.size !== null && typeof body.size !== 'string') {
      return NextResponse.json(
        { error: 'Size must be a string' },
        { status: 400 }
      );
    }
    if (body.color !== undefined && body.color !== null && typeof body.color !== 'string') {
      return NextResponse.json(
        { error: 'Color must be a string' },
        { status: 400 }
      );
    }
    if (body.owner !== undefined && body.owner !== null && typeof body.owner !== 'string') {
      return NextResponse.json(
        { error: 'Owner must be a string' },
        { status: 400 }
      );
    }

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
