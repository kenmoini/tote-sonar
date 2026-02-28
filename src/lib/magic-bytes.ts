/**
 * Magic bytes detection for image file validation.
 *
 * Validates file content (not MIME headers) to prevent spoofed uploads.
 * Supports JPEG, PNG, and WebP formats.
 */

const SIGNATURES = {
  jpeg: {
    mime: 'image/jpeg',
    // First 3 bytes: FF D8 FF
    check: (buf: Buffer): boolean =>
      buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  png: {
    mime: 'image/png',
    // First 8 bytes: 89 50 4E 47 0D 0A 1A 0A
    check: (buf: Buffer): boolean =>
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a,
  },
  webp: {
    mime: 'image/webp',
    // Bytes 0-3: 52 49 46 46 (RIFF) AND bytes 8-11: 57 45 42 50 (WEBP)
    // Bytes 4-7 are file size (skip them)
    // IMPORTANT: Must check BOTH locations — only checking RIFF would match WAV and AVI
    check: (buf: Buffer): boolean =>
      buf.length >= 12 &&
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50,
  },
} as const;

/**
 * Detect the MIME type of a buffer by examining its magic bytes.
 * Returns the detected MIME type string or null if unrecognized.
 */
export function detectMimeType(buffer: Buffer): string | null {
  for (const sig of Object.values(SIGNATURES)) {
    if (sig.check(buffer)) {
      return sig.mime;
    }
  }
  return null;
}

/**
 * Validate that a buffer contains one of the supported image formats
 * (JPEG, PNG, WebP) by checking its magic bytes.
 */
export function validateImageBuffer(buffer: Buffer): {
  valid: boolean;
  detectedType: string | null;
} {
  const detectedType = detectMimeType(buffer);
  return {
    valid: detectedType !== null,
    detectedType,
  };
}
