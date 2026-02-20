import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/settings - Get all settings
export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT key, value, updated_at FROM settings').all() as Array<{
      key: string;
      value: string;
      updated_at: string;
    }>;

    // Convert rows to a settings object
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Settings object is required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const updateStmt = db.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
    );

    const updateMany = db.transaction((entries: [string, string][]) => {
      for (const [key, value] of entries) {
        updateStmt.run(key, String(value));
      }
    });

    const entries = Object.entries(settings) as [string, string][];
    updateMany(entries);

    // Return updated settings
    const rows = db.prepare('SELECT key, value, updated_at FROM settings').all() as Array<{
      key: string;
      value: string;
      updated_at: string;
    }>;

    const updatedSettings: Record<string, string> = {};
    for (const row of rows) {
      updatedSettings[row.key] = row.value;
    }

    return NextResponse.json({ settings: updatedSettings });
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
