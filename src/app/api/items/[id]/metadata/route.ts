import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parseJsonBody, validateBody, IdParam, CreateMetadataSchema } from '@/lib/validation';

// GET /api/items/:id/metadata - Get all metadata for an item
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
        { error: 'Invalid item ID. Must be a positive integer.' },
        { status: 400 }
      );
    }
    const itemId = idResult.data;

    // Verify item exists
    const item = db.prepare('SELECT id FROM items WHERE id = ?').get(itemId);
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    const metadata = db.prepare(
      'SELECT * FROM item_metadata WHERE item_id = ? ORDER BY created_at DESC'
    ).all(itemId);

    return NextResponse.json({ data: metadata });
  } catch (error) {
    console.error('Error fetching item metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}

// POST /api/items/:id/metadata - Add a metadata key-value pair to an item
export async function POST(
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
        { error: 'Invalid item ID. Must be a positive integer.' },
        { status: 400 }
      );
    }
    const itemId = idResult.data;

    // Parse JSON body safely
    const parsed = await parseJsonBody(request);
    if (parsed.response) return parsed.response;

    // Validate with Zod schema
    const validated = validateBody(parsed.data, CreateMetadataSchema);
    if (validated.response) return validated.response;

    const body = validated.data;

    // Verify item exists
    const item = db.prepare('SELECT id FROM items WHERE id = ?').get(itemId);
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    const trimmedKey = body.key.trim();
    const trimmedValue = body.value.trim();

    // Insert the metadata entry
    const result = db.prepare(
      'INSERT INTO item_metadata (item_id, key, value) VALUES (?, ?, ?)'
    ).run(itemId, trimmedKey, trimmedValue);

    // Also add the key to the metadata_keys table for autocomplete
    db.prepare(
      'INSERT OR IGNORE INTO metadata_keys (key_name) VALUES (?)'
    ).run(trimmedKey);

    // Fetch the newly created metadata entry
    const newMetadata = db.prepare(
      'SELECT * FROM item_metadata WHERE id = ?'
    ).get(result.lastInsertRowid);

    return NextResponse.json(
      { data: newMetadata, message: 'Metadata added successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding item metadata:', error);
    return NextResponse.json(
      { error: 'Failed to add metadata' },
      { status: 500 }
    );
  }
}
