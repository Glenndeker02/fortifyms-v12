import { FILE_LIMITS, ALLOWED_FILE_TYPES } from './constants';

/**
 * File Upload Utilities
 *
 * Handles file uploads to cloud storage (AWS S3, Google Cloud Storage, or Cloudinary).
 * Includes validation, compression, and secure URL generation.
 *
 * Reference: TODO.md Phase 1, newprd.md (Module 3.2.1 - Evidence Capture)
 */

/**
 * Upload Result
 */
export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
  filename: string;
}

/**
 * Validate File Size
 *
 * @param file - File to validate
 * @param maxSize - Maximum size in bytes
 * @returns True if valid
 */
export function validateFileSize(file: File, maxSize: number = FILE_LIMITS.MAX_FILE_SIZE): boolean {
  return file.size <= maxSize;
}

/**
 * Validate File Type
 *
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns True if valid
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Validate Image File
 *
 * @param file - File to validate
 * @returns Validation result with error message
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!validateFileType(file, ALLOWED_FILE_TYPES.IMAGES)) {
    return { valid: false, error: 'Invalid image type. Allowed: JPEG, PNG, WebP, GIF' };
  }

  if (!validateFileSize(file, FILE_LIMITS.MAX_IMAGE_SIZE)) {
    return {
      valid: false,
      error: `Image size must be less than ${FILE_LIMITS.MAX_IMAGE_SIZE / (1024 * 1024)}MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate Document File
 *
 * @param file - File to validate
 * @returns Validation result with error message
 */
export function validateDocumentFile(file: File): { valid: boolean; error?: string } {
  if (!validateFileType(file, ALLOWED_FILE_TYPES.DOCUMENTS)) {
    return { valid: false, error: 'Invalid document type. Allowed: PDF, DOC, DOCX' };
  }

  if (!validateFileSize(file, FILE_LIMITS.MAX_DOCUMENT_SIZE)) {
    return {
      valid: false,
      error: `Document size must be less than ${FILE_LIMITS.MAX_DOCUMENT_SIZE / (1024 * 1024)}MB`,
    };
  }

  return { valid: true };
}

/**
 * Generate Unique Filename
 *
 * @param originalFilename - Original filename
 * @param prefix - Optional prefix
 * @returns Unique filename with timestamp
 */
export function generateUniqueFilename(originalFilename: string, prefix?: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalFilename.split('.').pop();
  const baseName = originalFilename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '-');

  const parts = [prefix, baseName, timestamp, randomString].filter(Boolean);
  return `${parts.join('-')}.${extension}`;
}

/**
 * Get File Extension
 *
 * @param filename - Filename
 * @returns File extension
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop() || '';
}

/**
 * Get MIME Type from Extension
 *
 * @param extension - File extension
 * @returns MIME type
 */
export function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
    mp4: 'video/mp4',
    webm: 'video/webm',
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Convert File to Base64
 *
 * @param file - File to convert
 * @returns Promise resolving to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Convert Base64 to Blob
 *
 * @param base64 - Base64 string
 * @param mimeType - MIME type
 * @returns Blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteString = atob(base64.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ab], { type: mimeType });
}

/**
 * Upload File to Cloud Storage
 * This is a placeholder that should be implemented based on your cloud provider
 *
 * @param file - File to upload
 * @param folder - Folder path
 * @returns Upload result
 */
export async function uploadFile(file: File, folder: string = 'uploads'): Promise<UploadResult> {
  // TODO: Implement actual cloud storage upload
  // Options:
  // 1. AWS S3: Use @aws-sdk/client-s3
  // 2. Google Cloud Storage: Use @google-cloud/storage
  // 3. Cloudinary: Use cloudinary SDK

  const filename = generateUniqueFilename(file.name, folder);

  // Placeholder implementation
  // In production, replace with actual upload to S3/GCS/Cloudinary
  console.warn('File upload not implemented. Using placeholder.');

  return {
    url: `/uploads/${filename}`, // Placeholder URL
    key: filename,
    size: file.size,
    mimeType: file.type,
    filename: file.name,
  };
}

/**
 * Upload Multiple Files
 *
 * @param files - Array of files to upload
 * @param folder - Folder path
 * @returns Array of upload results
 */
export async function uploadMultipleFiles(
  files: File[],
  folder: string = 'uploads'
): Promise<UploadResult[]> {
  return Promise.all(files.map((file) => uploadFile(file, folder)));
}

/**
 * Delete File from Cloud Storage
 *
 * @param key - File key/path
 * @returns Success boolean
 */
export async function deleteFile(key: string): Promise<boolean> {
  // TODO: Implement actual cloud storage deletion
  console.warn('File deletion not implemented. Using placeholder.');
  return true;
}

/**
 * Get Signed URL for Private File
 * For temporary access to private files
 *
 * @param key - File key/path
 * @param expiresIn - Expiration time in seconds
 * @returns Signed URL
 */
export async function getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  // TODO: Implement actual signed URL generation
  console.warn('Signed URL generation not implemented. Using placeholder.');
  return `/uploads/${key}?expires=${Date.now() + expiresIn * 1000}`;
}

/**
 * Compress Image (Client-side)
 * Reduces file size while maintaining quality
 *
 * @param file - Image file to compress
 * @param maxWidth - Maximum width
 * @param maxHeight - Maximum height
 * @param quality - Quality (0-1)
 * @returns Compressed file
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Create Thumbnail from Image
 *
 * @param file - Image file
 * @param size - Thumbnail size (width and height)
 * @returns Thumbnail file
 */
export async function createThumbnail(file: File, size: number = 200): Promise<File> {
  return compressImage(file, size, size, 0.7);
}
