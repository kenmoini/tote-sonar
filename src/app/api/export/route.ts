import { NextResponse } from 'next/server';
import { getDb, getUploadDir, getThumbnailDir } from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ZipArchive } = require('kemo-archiver');
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const db = getDb();

    // Fetch all data from the database
    const totes = db.prepare('SELECT * FROM totes ORDER BY created_at').all();
    const items = db.prepare('SELECT * FROM items ORDER BY created_at').all();
    const itemPhotos = db.prepare('SELECT * FROM item_photos ORDER BY created_at').all();
    const itemMetadata = db.prepare('SELECT * FROM item_metadata ORDER BY created_at').all();
    const metadataKeys = db.prepare('SELECT * FROM metadata_keys ORDER BY created_at').all();
    const movementHistory = db.prepare('SELECT * FROM item_movement_history ORDER BY moved_at').all();
    const settings = db.prepare('SELECT * FROM settings').all();

    // Build the JSON export data
    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      app: 'Tote Sonar',
      data: {
        totes,
        items,
        item_photos: itemPhotos,
        item_metadata: itemMetadata,
        metadata_keys: metadataKeys,
        item_movement_history: movementHistory,
        settings,
      },
    };

    // Create a ZIP archive using archiver
    const archive = new ZipArchive({ zlib: { level: 6 } });

    // Collect the archive into a buffer
    const chunks: Buffer[] = [];

    return new Promise<NextResponse>((resolve, reject) => {
      archive.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      archive.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const response = new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="tote-sonar-export-${new Date().toISOString().slice(0, 10)}.zip"`,
            'Content-Length': String(buffer.length),
          },
        });
        resolve(response);
      });

      archive.on('error', (err: Error) => {
        reject(err);
      });

      // Add JSON data file to the archive
      const jsonStr = JSON.stringify(exportData, null, 2);
      archive.append(jsonStr, { name: 'tote-sonar-data.json' });

      // Add uploaded images to the archive
      const uploadsDir = getUploadDir();
      const thumbnailsDir = getThumbnailDir();

      // Add original photos
      if (fs.existsSync(uploadsDir)) {
        const uploadFiles = fs.readdirSync(uploadsDir);
        for (const file of uploadFiles) {
          const filePath = path.join(uploadsDir, file);
          if (fs.statSync(filePath).isFile()) {
            archive.file(filePath, { name: `uploads/${file}` });
          }
        }
      }

      // Add thumbnails
      if (fs.existsSync(thumbnailsDir)) {
        const thumbFiles = fs.readdirSync(thumbnailsDir);
        for (const file of thumbFiles) {
          const filePath = path.join(thumbnailsDir, file);
          if (fs.statSync(filePath).isFile()) {
            archive.file(filePath, { name: `thumbnails/${file}` });
          }
        }
      }

      // Finalize the archive
      archive.finalize();
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
