/**
 * Shared validation library for all API routes.
 *
 * Provides Zod schemas for every input-accepting route, a safe JSON body parser,
 * a schema validation helper with field-level error extraction, and a path
 * traversal prevention utility.
 */

import { z } from 'zod';
import { NextResponse } from 'next/server';
import path from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safely parse JSON from a Request body.
 * Returns { data } on success or { response } with a consistent 400 error.
 *
 * IMPORTANT: Only call this ONCE per request — request.json() consumes the stream.
 */
export async function parseJsonBody(
  request: Request
): Promise<{ data: unknown; response?: never } | { data?: never; response: NextResponse }> {
  try {
    const data: unknown = await request.json();
    return { data };
  } catch {
    return {
      response: NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validate an unknown value against a Zod schema.
 * Returns { data } on success or { response } with field-level 400 errors.
 */
export function validateBody<T extends z.ZodType>(
  body: unknown,
  schema: T
): { data: z.infer<T>; response?: never } | { data?: never; response: NextResponse } {
  const result = schema.safeParse(body);

  if (result.success) {
    return { data: result.data };
  }

  const errors = result.error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));

  return {
    response: NextResponse.json(
      { error: 'Validation failed', errors },
      { status: 400 }
    ),
  };
}

/**
 * Zod schema for integer ID route parameters (items, photos, metadata).
 * Coerces string → number and validates as positive integer.
 */
export const IdParam = z.coerce.number().int().positive();

/**
 * Prevent path traversal by resolving user input against a base directory.
 * Returns the resolved absolute path if safe, or null if the path escapes baseDir.
 */
export function safePath(baseDir: string, userInput: string): string | null {
  const resolved = path.resolve(baseDir, userInput);
  if (resolved === baseDir || resolved.startsWith(baseDir + path.sep)) {
    return resolved;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tote schemas
// ---------------------------------------------------------------------------

export const CreateToteSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  location: z.string().min(1, 'Location is required').max(255),
  size: z.string().max(100).optional().nullable(),
  color: z.string().max(100).optional().nullable(),
  owner: z.string().max(255).optional().nullable(),
});

export const UpdateToteSchema = z
  .object({
    name: z.string().min(1, 'Name cannot be empty').max(255).optional(),
    location: z.string().min(1, 'Location cannot be empty').max(255).optional(),
    size: z.string().max(100).optional().nullable(),
    color: z.string().max(100).optional().nullable(),
    owner: z.string().max(255).optional().nullable(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.location !== undefined ||
      data.size !== undefined ||
      data.color !== undefined ||
      data.owner !== undefined,
    { message: 'At least one field must be provided' }
  );

// ---------------------------------------------------------------------------
// Item schemas
// ---------------------------------------------------------------------------

export const CreateItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional().nullable(),
  quantity: z.coerce.number().int().min(1).default(1),
});

export const UpdateItemSchema = z
  .object({
    name: z.string().min(1, 'Name cannot be empty').max(255).optional(),
    description: z.string().max(1000).optional().nullable(),
    quantity: z.coerce.number().int().min(1).optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.quantity !== undefined,
    { message: 'At least one field must be provided' }
  );

// ---------------------------------------------------------------------------
// Metadata schemas
// ---------------------------------------------------------------------------

export const CreateMetadataSchema = z.object({
  key: z.string().min(1, 'Key is required').max(255),
  value: z.string().min(1, 'Value is required').max(1000),
});

export const UpdateMetadataSchema = z
  .object({
    key: z.string().min(1, 'Key cannot be empty').max(255).optional(),
    value: z.string().min(1, 'Value cannot be empty').max(1000).optional(),
  })
  .refine((data) => data.key !== undefined || data.value !== undefined, {
    message: 'At least one field must be provided',
  });

// ---------------------------------------------------------------------------
// Action schemas
// ---------------------------------------------------------------------------

export const MoveItemSchema = z.object({
  target_tote_id: z.string().min(1, 'target_tote_id is required').max(10),
});

export const DuplicateItemSchema = z.object({
  target_tote_id: z.string().min(1).max(10).optional(),
});

export const BulkQrSchema = z.object({
  tote_ids: z
    .array(z.string().min(1))
    .min(1, 'At least one tote_id is required')
    .max(100, 'Maximum 100 tote IDs allowed'),
});

// ---------------------------------------------------------------------------
// Settings schema
// ---------------------------------------------------------------------------

export const UpdateSettingsSchema = z.object({
  settings: z.record(z.string(), z.string()),
});

// ---------------------------------------------------------------------------
// Search params schema
// ---------------------------------------------------------------------------

export const SearchParamsSchema = z.object({
  q: z.string().max(500).optional(),
  location: z.string().max(255).optional(),
  owner: z.string().max(255).optional(),
  metadata_key: z.string().max(255).optional(),
});
