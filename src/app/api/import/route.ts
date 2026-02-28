import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUploadDir, getThumbnailDir } from '@/lib/db';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';

interface ExportData {
  version: string;
  exported_at: string;
  app: string;
  data: {
    totes: Array<Record<string, unknown>>;
    items: Array<Record<string, unknown>>;
    item_photos: Array<Record<string, unknown>>;
    item_metadata: Array<Record<string, unknown>>;
    metadata_keys: Array<Record<string, unknown>>;
    item_movement_history: Array<Record<string, unknown>>;
    settings: Array<Record<string, unknown>>;
  };
}

function validateExportData(data: unknown): data is ExportData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

  // Check required top-level fields
  if (typeof d.version !== 'string') return false;
  if (typeof d.app !== 'string') return false;
  if (!d.data || typeof d.data !== 'object') return false;

  const tableData = d.data as Record<string, unknown>;
  // Check required data tables
  const requiredTables = [
    'totes',
    'items',
    'item_photos',
    'item_metadata',
    'metadata_keys',
    'item_movement_history',
    'settings',
  ];

  for (const table of requiredTables) {
    if (!Array.isArray(tableData[table])) return false;
  }

  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Read the uploaded file from the form data
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'No file uploaded. Please select a ZIP file.' },
        { status: 400 }
      );
    }

    // Check that it's a ZIP file (by name or content type)
    const fileName = (file as File).name || '';
    if (!fileName.endsWith('.zip') && file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a .zip file exported from Tote Sonar.' },
        { status: 400 }
      );
    }

    // Read the file into a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Try to open as ZIP
    let zip: AdmZip;
    try {
      zip = new AdmZip(buffer);
    } catch {
      return NextResponse.json(
        { error: 'Invalid ZIP file. The file could not be read as a ZIP archive.' },
        { status: 400 }
      );
    }

    // Look for the JSON data file
    const jsonEntry = zip.getEntry('tote-sonar-data.json');
    if (!jsonEntry) {
      return NextResponse.json(
        { error: 'Invalid export file. Missing tote-sonar-data.json in the ZIP archive.' },
        { status: 400 }
      );
    }

    // Parse and validate JSON data
    let exportData: ExportData;
    try {
      const jsonContent = jsonEntry.getData().toString('utf8');
      const parsed = JSON.parse(jsonContent);

      if (!validateExportData(parsed)) {
        return NextResponse.json(
          { error: 'Invalid export data structure. The JSON file is missing required fields or tables.' },
          { status: 400 }
        );
      }

      exportData = parsed;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in export file. The tote-sonar-data.json could not be parsed.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const data = exportData.data;

    // Validate individual records upfront before touching DB
    for (let i = 0; i < data.totes.length; i++) {
      const tote = data.totes[i];
      if (!tote.id || !tote.name || !tote.location) {
        return NextResponse.json(
          { error: `Import validation failed: tote at index ${i} is missing required field '${!tote.id ? 'id' : !tote.name ? 'name' : 'location'}'. No data was imported.` },
          { status: 400 }
        );
      }
    }
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      if (!item.id || !item.tote_id || !item.name) {
        return NextResponse.json(
          { error: `Import validation failed: item at index ${i} is missing required field '${!item.id ? 'id' : !item.tote_id ? 'tote_id' : 'name'}'. No data was imported.` },
          { status: 400 }
        );
      }
    }

    // Disable FK checks BEFORE starting transaction (PRAGMA is a no-op inside transactions)
    db.pragma('foreign_keys = OFF');

    try {
      // Use a transaction to ensure atomicity
      const importTransaction = db.transaction(() => {
        // Clear existing data in reverse dependency order
        db.prepare('DELETE FROM item_movement_history').run();
        db.prepare('DELETE FROM item_metadata').run();
        db.prepare('DELETE FROM item_photos').run();
        db.prepare('DELETE FROM items').run();
        db.prepare('DELETE FROM totes').run();
        db.prepare('DELETE FROM metadata_keys').run();
        db.prepare('DELETE FROM settings').run();

        // Import totes
        if (data.totes.length > 0) {
          const insertTote = db.prepare(
            'INSERT INTO totes (id, name, location, size, color, owner, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          );
          for (const tote of data.totes) {
            insertTote.run(
              tote.id,
              tote.name,
              tote.location,
              tote.size || null,
              tote.color || null,
              tote.owner || null,
              tote.created_at || new Date().toISOString(),
              tote.updated_at || new Date().toISOString()
            );
          }
        }

        // Import items
        if (data.items.length > 0) {
          const insertItem = db.prepare(
            'INSERT INTO items (id, tote_id, name, description, quantity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
          );
          for (const item of data.items) {
            insertItem.run(
              item.id,
              item.tote_id,
              item.name,
              item.description || null,
              item.quantity || 1,
              item.created_at || new Date().toISOString(),
              item.updated_at || new Date().toISOString()
            );
          }
        }

        // Import item_photos
        if (data.item_photos.length > 0) {
          const insertPhoto = db.prepare(
            'INSERT INTO item_photos (id, item_id, filename, original_path, thumbnail_path, file_size, mime_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          );
          for (const photo of data.item_photos) {
            insertPhoto.run(
              photo.id,
              photo.item_id,
              photo.filename,
              photo.original_path,
              photo.thumbnail_path,
              photo.file_size,
              photo.mime_type,
              photo.created_at || new Date().toISOString()
            );
          }
        }

        // Import item_metadata
        if (data.item_metadata.length > 0) {
          const insertMeta = db.prepare(
            'INSERT INTO item_metadata (id, item_id, key, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
          );
          for (const meta of data.item_metadata) {
            insertMeta.run(
              meta.id,
              meta.item_id,
              meta.key,
              meta.value,
              meta.created_at || new Date().toISOString(),
              meta.updated_at || new Date().toISOString()
            );
          }
        }

        // Import metadata_keys
        if (data.metadata_keys.length > 0) {
          const insertKey = db.prepare(
            'INSERT INTO metadata_keys (id, key_name, created_at) VALUES (?, ?, ?)'
          );
          for (const key of data.metadata_keys) {
            insertKey.run(
              key.id,
              key.key_name,
              key.created_at || new Date().toISOString()
            );
          }
        }

        // Import item_movement_history
        if (data.item_movement_history.length > 0) {
          const insertMove = db.prepare(
            'INSERT INTO item_movement_history (id, item_id, from_tote_id, to_tote_id, moved_at) VALUES (?, ?, ?, ?, ?)'
          );
          for (const move of data.item_movement_history) {
            insertMove.run(
              move.id,
              move.item_id,
              move.from_tote_id || null,
              move.to_tote_id,
              move.moved_at || new Date().toISOString()
            );
          }
        }

        // Import settings (use INSERT OR REPLACE to handle existing keys)
        if (data.settings.length > 0) {
          const insertSetting = db.prepare(
            'INSERT OR REPLACE INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)'
          );
          for (const setting of data.settings) {
            insertSetting.run(
              setting.id,
              setting.key,
              setting.value,
              setting.updated_at || new Date().toISOString()
            );
          }
        }
      });

      // Execute the import transaction
      importTransaction();
    } finally {
      // ALWAYS re-enable FK checks, regardless of success/failure
      db.pragma('foreign_keys = ON');
    }

    // Transaction succeeded -- now handle filesystem operations
    const uploadsDir = getUploadDir();
    const thumbnailsDir = getThumbnailDir();
    const writtenFiles: string[] = [];

    try {
      // Clear existing photo files AFTER successful transaction
      if (fs.existsSync(uploadsDir)) {
        const existingUploads = fs.readdirSync(uploadsDir);
        for (const f of existingUploads) {
          fs.unlinkSync(path.join(uploadsDir, f));
        }
      }
      if (fs.existsSync(thumbnailsDir)) {
        const existingThumbs = fs.readdirSync(thumbnailsDir);
        for (const f of existingThumbs) {
          fs.unlinkSync(path.join(thumbnailsDir, f));
        }
      }

      // Extract photo files from ZIP with path traversal protection
      const zipEntries = zip.getEntries();
      for (const entry of zipEntries) {
        if (entry.isDirectory) continue;

        if (entry.entryName.startsWith('uploads/')) {
          const entryFileName = path.basename(entry.entryName);
          if (entryFileName) {
            const targetPath = path.resolve(uploadsDir, entryFileName);
            // Path traversal check: resolved path must stay within target directory
            if (!targetPath.startsWith(uploadsDir + path.sep) && targetPath !== uploadsDir) {
              console.warn('Skipping ZIP entry with path traversal attempt:', entry.entryName);
              continue;
            }
            fs.writeFileSync(targetPath, entry.getData());
            writtenFiles.push(targetPath);
          }
        } else if (entry.entryName.startsWith('thumbnails/')) {
          const entryFileName = path.basename(entry.entryName);
          if (entryFileName) {
            const targetPath = path.resolve(thumbnailsDir, entryFileName);
            // Path traversal check: resolved path must stay within target directory
            if (!targetPath.startsWith(thumbnailsDir + path.sep) && targetPath !== thumbnailsDir) {
              console.warn('Skipping ZIP entry with path traversal attempt:', entry.entryName);
              continue;
            }
            fs.writeFileSync(targetPath, entry.getData());
            writtenFiles.push(targetPath);
          }
        }
      }
    } catch (fileError) {
      // Clean up any files written during failed extraction
      for (const filePath of writtenFiles) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // Ignore individual cleanup errors
        }
      }
      console.error('Import file extraction error:', fileError);
      return NextResponse.json(
        { error: 'Import data was saved but photo file extraction failed. Some photos may be missing.' },
        { status: 500 }
      );
    }

    // Calculate import summary
    const summary = {
      totes: data.totes.length,
      items: data.items.length,
      photos: data.item_photos.length,
      metadata: data.item_metadata.length,
      settings: data.settings.length,
    };

    return NextResponse.json({
      success: true,
      message: 'Import completed successfully',
      summary,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import data. An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
