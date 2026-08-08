import { NextRequest } from 'next/server';

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

/**
 * Parse multipart/form-data from Next.js request
 * Returns form fields and uploaded files (similar to multer)
 */
export async function parseFormData(
  request: NextRequest
): Promise<{ fields: Record<string, any>; files: Record<string, UploadedFile> }> {
  const contentType = request.headers.get('content-type') || '';
  
  if (!contentType.includes('multipart/form-data')) {
    // Not multipart, try parsing as JSON
    try {
      const body = await request.json();
      return { fields: body, files: {} };
    } catch {
      return { fields: {}, files: {} };
    }
  }

  const formData = await request.formData();
  const fields: Record<string, any> = {};
  const files: Record<string, UploadedFile> = {};

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      const buffer = Buffer.from(await value.arrayBuffer());
      files[key] = {
        fieldname: key,
        originalname: value.name,
        encoding: '7bit',
        mimetype: value.type,
        buffer,
        size: buffer.length
      };
    } else {
      // Try to parse JSON values
      try {
        fields[key] = JSON.parse(value);
      } catch {
        fields[key] = value;
      }
    }
  }

  return { fields, files };
}

/**
 * Validate file upload (size, mimetype)
 */
export function validateFile(
  file: UploadedFile | undefined,
  options: {
    maxSize?: number; // in bytes
    allowedMimeTypes?: string[];
    required?: boolean;
  } = {}
): { valid: boolean; error?: string } {
  const { maxSize = 5 * 1024 * 1024, allowedMimeTypes, required = false } = options;

  if (!file) {
    return required 
      ? { valid: false, error: 'File is required' }
      : { valid: true };
  }

  if (file.size > maxSize) {
    return { valid: false, error: `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB` };
  }

  if (allowedMimeTypes && !allowedMimeTypes.includes(file.mimetype)) {
    return { valid: false, error: `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}` };
  }

  return { valid: true };
}
