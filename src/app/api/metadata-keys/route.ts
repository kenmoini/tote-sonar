import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/metadata-keys - List all existing metadata keys for autocomplete
export async function GET() {
  try {
    const db = getDb();

    const keys = db.prepare(
      'SELECT * FROM metadata_keys ORDER BY key_name ASC'
    ).all();

    return NextResponse.json({ data: keys });
  } catch (error) {
    console.error('Error fetching metadata keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata keys' },
      { status: 500 }
    );
  }
}
