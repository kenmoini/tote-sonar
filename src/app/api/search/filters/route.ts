import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/search/filters - Get distinct locations, owners, and metadata keys for filter dropdowns
export async function GET() {
  try {
    const db = getDb();

    const locations = db.prepare(
      `SELECT DISTINCT location FROM totes WHERE location IS NOT NULL AND location != '' ORDER BY location ASC`
    ).all() as Array<{ location: string }>;

    const owners = db.prepare(
      `SELECT DISTINCT owner FROM totes WHERE owner IS NOT NULL AND owner != '' ORDER BY owner ASC`
    ).all() as Array<{ owner: string }>;

    const metadataKeys = db.prepare(
      `SELECT DISTINCT key_name FROM metadata_keys ORDER BY key_name ASC`
    ).all() as Array<{ key_name: string }>;

    return NextResponse.json({
      data: {
        locations: locations.map(l => l.location),
        owners: owners.map(o => o.owner),
        metadataKeys: metadataKeys.map(k => k.key_name),
      },
    });
  } catch (error) {
    console.error('Error fetching search filters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch search filters' },
      { status: 500 }
    );
  }
}
