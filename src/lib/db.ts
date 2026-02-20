import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'tote-sonar.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure upload directories exist
const uploadsDir = path.join(DATA_DIR, 'uploads');
const thumbnailsDir = path.join(DATA_DIR, 'thumbnails');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(thumbnailsDir)) fs.mkdirSync(thumbnailsDir, { recursive: true });

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    console.log('Database connected:', DB_PATH);
    initializeSchema();
  }
  return db;
}

function initializeSchema(): void {
  const database = db;

  database.exec(`
    CREATE TABLE IF NOT EXISTS totes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      size TEXT,
      color TEXT,
      owner TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tote_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      quantity INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (tote_id) REFERENCES totes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS item_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_path TEXT NOT NULL,
      thumbnail_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS item_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS metadata_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS item_movement_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      from_tote_id TEXT,
      to_tote_id TEXT NOT NULL,
      moved_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (from_tote_id) REFERENCES totes(id),
      FOREIGN KEY (to_tote_id) REFERENCES totes(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT (datetime('now'))
    );
  `);

  // Insert default settings if they don't exist
  const insertSetting = database.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  );
  insertSetting.run('server_hostname', 'http://localhost:3000');
  insertSetting.run('max_upload_size', '5242880'); // 5MB in bytes
  insertSetting.run('default_tote_fields', '[]');
  insertSetting.run('default_metadata_keys', '[]');
  insertSetting.run('theme', 'light');

  console.log('Database schema initialized');
}

// Generate a 6-character alphanumeric ID
export function generateToteId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export function getUploadDir(): string {
  return uploadsDir;
}

export function getThumbnailDir(): string {
  return thumbnailsDir;
}
