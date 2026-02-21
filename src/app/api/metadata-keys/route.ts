import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/metadata-keys - List all existing metadata keys for autocomplete
// Also includes default metadata keys configured in Settings
export async function GET() {
  try {
    const db = getDb();

    // Get keys from metadata_keys table (previously used keys)
    const existingKeys = db.prepare(
      'SELECT key_name FROM metadata_keys ORDER BY key_name ASC'
    ).all() as Array<{ key_name: string }>;

    const keySet = new Set(existingKeys.map(k => k.key_name));

    // Also get default metadata keys from settings
    const settingRow = db.prepare(
      "SELECT value FROM settings WHERE key = 'default_metadata_keys'"
    ).get() as { value: string } | undefined;

    if (settingRow) {
      try {
        const defaultKeys = JSON.parse(settingRow.value);
        if (Array.isArray(defaultKeys)) {
          for (const dk of defaultKeys) {
            if (typeof dk === 'string' && dk.trim()) {
              keySet.add(dk.trim());
            }
          }
        }
      } catch {
        // Invalid JSON in settings - ignore
      }
    }

    // Return merged and deduplicated keys sorted alphabetically
    const allKeys = Array.from(keySet).sort((a, b) => a.localeCompare(b));
    const data = allKeys.map(key_name => ({ key_name }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching metadata keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata keys' },
      { status: 500 }
    );
  }
}
