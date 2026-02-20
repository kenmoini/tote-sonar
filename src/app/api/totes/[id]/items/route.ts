import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { CreateItemInput, Item } from '@/types';

// GET /api/totes/:toteId/items - List items in a tote
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb();
    const { id: toteId } = await params;

    // Verify tote exists
    const tote = db.prepare('SELECT id FROM totes WHERE id = ?').get(toteId);
    if (!tote) {
      return NextResponse.json(
        { error: 'Tote not found' },
        { status: 404 }
      );
    }

    const items = db.prepare(`
      SELECT * FROM items WHERE tote_id = ? ORDER BY created_at DESC
    `).all(toteId) as Item[];

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

// POST /api/totes/:toteId/items - Add item to a tote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb();
    const { id: toteId } = await params;
    const body: CreateItemInput = await request.json();

    // Verify tote exists
    const tote = db.prepare('SELECT id FROM totes WHERE id = ?').get(toteId);
    if (!tote) {
      return NextResponse.json(
        { error: 'Tote not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const quantity = body.quantity !== undefined ? body.quantity : 1;

    const stmt = db.prepare(`
      INSERT INTO items (tote_id, name, description, quantity)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      toteId,
      body.name.trim(),
      body.description?.trim() || null,
      quantity
    );

    // Fetch the created item
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid) as Item;

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    );
  }
}
