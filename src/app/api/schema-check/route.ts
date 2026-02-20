import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface ForeignKeyInfo {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
  on_update: string;
  on_delete: string;
  match: string;
}

interface TableInfo {
  name: string;
}

export async function GET() {
  try {
    const db = getDb();
    const results: Record<string, unknown> = {};

    // List all tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence' ORDER BY name").all() as TableInfo[];
    results.tables = tables.map((t) => t.name);

    // Get columns for each table
    const tableSchemas: Record<string, unknown> = {};
    for (const t of tables) {
      const cols = db.prepare(`PRAGMA table_info(${t.name})`).all() as ColumnInfo[];
      const fks = db.prepare(`PRAGMA foreign_key_list(${t.name})`).all() as ForeignKeyInfo[];
      tableSchemas[t.name] = {
        columns: cols.map((c) => ({
          name: c.name,
          type: c.type,
          notnull: c.notnull === 1,
          pk: c.pk === 1,
          default_value: c.dflt_value,
        })),
        foreign_keys: fks.map((fk) => ({
          from: fk.from,
          references_table: fk.table,
          references_column: fk.to,
          on_delete: fk.on_delete,
        })),
      };
    }
    results.schemas = tableSchemas;

    // Check foreign keys enabled
    const fkStatus = db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number };
    results.foreign_keys_enabled = fkStatus.foreign_keys === 1;

    // Verify expected tables exist
    const expectedTables = [
      'totes', 'items', 'item_photos', 'item_metadata',
      'metadata_keys', 'item_movement_history', 'settings'
    ];
    const missingTables = expectedTables.filter(
      (t) => !tables.some((row) => row.name === t)
    );
    results.missing_tables = missingTables;
    results.all_tables_present = missingTables.length === 0;

    return NextResponse.json(results);
  } catch (error) {
    console.error('Schema check failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
