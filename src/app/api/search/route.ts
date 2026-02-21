import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/search - Search items by name, description, and metadata
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const query = request.nextUrl.searchParams.get('q') || '';
    const location = request.nextUrl.searchParams.get('location') || '';
    const owner = request.nextUrl.searchParams.get('owner') || '';
    const metadataKey = request.nextUrl.searchParams.get('metadata_key') || '';

    if (!query.trim() && !location.trim() && !owner.trim() && !metadataKey.trim()) {
      return NextResponse.json({ data: { items: [], total: 0 } });
    }

    const searchTerm = `%${query.trim()}%`;
    const conditions: string[] = [];
    const params: string[] = [];

    // Search by item name and description
    if (query.trim()) {
      conditions.push('(i.name LIKE ? OR i.description LIKE ?)');
      params.push(searchTerm, searchTerm);
    }

    // Filter by tote location
    if (location.trim()) {
      conditions.push('t.location LIKE ?');
      params.push(`%${location.trim()}%`);
    }

    // Filter by tote owner (exact match from dropdown)
    if (owner.trim()) {
      conditions.push('t.owner = ?');
      params.push(owner.trim());
    }

    // Filter by metadata key (exact match from dropdown)
    if (metadataKey.trim()) {
      conditions.push(`i.id IN (SELECT im.item_id FROM item_metadata im WHERE im.key = ?)`);
      params.push(metadataKey.trim());
    }

    // Also search metadata values if there's a query
    let metadataSearchCondition = '';
    if (query.trim()) {
      metadataSearchCondition = ` OR i.id IN (SELECT im.item_id FROM item_metadata im WHERE im.value LIKE ?)`;
      // We need to add this to the main search condition
      // Replace the name/description condition with one that also includes metadata
      const idx = conditions.findIndex(c => c.startsWith('(i.name LIKE'));
      if (idx !== -1) {
        conditions[idx] = `(i.name LIKE ? OR i.description LIKE ? OR i.id IN (SELECT im.item_id FROM item_metadata im WHERE im.value LIKE ?))`;
        // Insert the metadata search param after the description param
        params.splice(idx + 2, 0, searchTerm);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT i.*, t.name as tote_name, t.id as tote_id, t.location as tote_location
      FROM items i
      JOIN totes t ON i.tote_id = t.id
      ${whereClause}
      ORDER BY i.updated_at DESC
      LIMIT 100
    `;

    const items = db.prepare(sql).all(...params) as Array<{
      id: number;
      tote_id: string;
      name: string;
      description: string | null;
      quantity: number;
      created_at: string;
      updated_at: string;
      tote_name: string;
      tote_location: string;
    }>;

    return NextResponse.json({
      data: {
        items,
        total: items.length,
      },
    });
  } catch (error) {
    console.error('Error searching items:', error);
    return NextResponse.json(
      { error: 'Failed to search items' },
      { status: 500 }
    );
  }
}
