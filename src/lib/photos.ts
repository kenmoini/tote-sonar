/**
 * Shared photo processing utility for item and tote photo uploads.
 *
 * Extracts common upload logic (MIME pre-filter, size check, magic bytes
 * validation, file write, thumbnail generation) so item_photos and
 * tote_photos routes share a single code path.
 */

import { getDb, getUploadDir, getThumbnailDir } from '@/lib/db';
import { validateImageBuffer } from '@/lib/magic-bytes';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import crypto from 'crypto';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const THUMBNAIL_WIDTH = 200;
const THUMBNAIL_HEIGHT = 200;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PhotoUploadResult {
  filename: string;
  originalPath: string;
  thumbnailPath: string;
  fileSize: number;
  mimeType: string;
}

export interface PhotoUploadError {
  message: string;
  status: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Process a photo upload: validate MIME type and file size, verify magic bytes,
 * write the original file, and generate a thumbnail.
 *
 * Returns `{ data: PhotoUploadResult }` on success or
 * `{ error: PhotoUploadError }` on validation/processing failure.
 */
export async function processPhotoUpload(
  file: File,
  maxSize: number
): Promise<{ data: PhotoUploadResult; error?: never } | { data?: never; error: PhotoUploadError }> {
  // Fast pre-filter: reject obviously wrong MIME types before reading the full buffer
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      error: {
        message: `Invalid file type: ${file.type}. Supported formats: JPEG, PNG, WebP`,
        status: 400,
      },
    };
  }

  // Validate file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    return {
      error: {
        message: `File size exceeds maximum of ${maxSizeMB}MB`,
        status: 400,
      },
    };
  }

  // Read file bytes
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Magic bytes validation: verify actual file content matches an allowed image type
  const { valid, detectedType } = validateImageBuffer(buffer);
  if (!valid) {
    return {
      error: {
        message: `File type ${file.type} is not allowed. File content does not match a supported image format. Accepted: JPEG, PNG, WebP`,
        status: 400,
      },
    };
  }

  // Use detected type for file extension (authoritative over MIME header)
  const mimeType = detectedType!;
  const ext = mimeType === 'image/jpeg' ? '.jpg' : mimeType === 'image/png' ? '.png' : '.webp';
  const uniqueId = crypto.randomBytes(16).toString('hex');
  const filename = `${uniqueId}${ext}`;

  // Get upload paths
  const uploadDir = getUploadDir();
  const thumbnailDir = getThumbnailDir();
  const originalFilePath = path.join(uploadDir, filename);
  const thumbnailFilename = `thumb_${filename}`;
  const thumbnailFilePath = path.join(thumbnailDir, thumbnailFilename);

  // Write original file
  fs.writeFileSync(originalFilePath, buffer);

  // Generate thumbnail with sharp
  // .rotate() with no args auto-orients based on EXIF data (fixes mobile photo rotation)
  await sharp(buffer)
    .rotate()
    .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, { fit: 'cover', position: 'center' })
    .toFile(thumbnailFilePath);

  return {
    data: {
      filename,
      originalPath: `uploads/${filename}`,
      thumbnailPath: `thumbnails/${thumbnailFilename}`,
      fileSize: file.size,
      mimeType,
    },
  };
}

/**
 * Read the max upload size from the settings table.
 * Defaults to 5MB (5242880 bytes) if not configured.
 */
export function getMaxUploadSize(): number {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = 'max_upload_size'").get() as
    | { value: string }
    | undefined;
  return row ? parseInt(row.value, 10) : 5242880;
}

/**
 * Delete photo files (original + thumbnail) from disk.
 * Resolves paths via `path.basename` to prevent traversal, validates with
 * `startsWith` check, and swallows per-file errors so callers are not blocked.
 */
export function deletePhotoFiles(originalPath: string, thumbnailPath: string): void {
  const uploadsDir = getUploadDir();
  const thumbnailsDir = getThumbnailDir();

  try {
    const resolvedOriginal = path.resolve(uploadsDir, path.basename(originalPath));
    if (resolvedOriginal.startsWith(uploadsDir + path.sep) || resolvedOriginal === uploadsDir) {
      if (fs.existsSync(resolvedOriginal)) fs.unlinkSync(resolvedOriginal);
    }
  } catch (err) {
    console.error('Error deleting original photo file:', err);
  }

  try {
    const resolvedThumb = path.resolve(thumbnailsDir, path.basename(thumbnailPath));
    if (resolvedThumb.startsWith(thumbnailsDir + path.sep) || resolvedThumb === thumbnailsDir) {
      if (fs.existsSync(resolvedThumb)) fs.unlinkSync(resolvedThumb);
    }
  } catch (err) {
    console.error('Error deleting thumbnail file:', err);
  }
}
