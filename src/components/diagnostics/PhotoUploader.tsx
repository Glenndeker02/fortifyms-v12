/**
 * Photo Uploader Component
 *
 * Allows users to upload photos as evidence for diagnostic questions
 * Supports drag-and-drop, preview, and compression
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Camera, X, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';

interface Photo {
  id: string;
  url: string;
  preview: string;
  name: string;
  size: number;
  uploading?: boolean;
  uploaded?: boolean;
  error?: string;
}

interface PhotoUploaderProps {
  questionId: string;
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
  maxPhotos?: number;
  maxSizeM

B?: number;
}

export function PhotoUploader({
  questionId,
  photos,
  onChange,
  maxPhotos = 5,
  maxSizeMB = 5,
}: PhotoUploaderProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Check max photos limit
      if (photos.length + acceptedFiles.length > maxPhotos) {
        toast({
          title: 'Too Many Photos',
          description: `Maximum ${maxPhotos} photos allowed`,
          variant: 'destructive',
        });
        return;
      }

      // Process each file
      for (const file of acceptedFiles) {
        // Check file size
        if (file.size > maxSizeMB * 1024 * 1024) {
          toast({
            title: 'File Too Large',
            description: `${file.name} exceeds ${maxSizeMB}MB limit`,
            variant: 'destructive',
          });
          continue;
        }

        // Create temporary photo object
        const photoId = `photo-${Date.now()}-${Math.random()}`;
        const preview = URL.createObjectURL(file);

        const newPhoto: Photo = {
          id: photoId,
          url: '',
          preview,
          name: file.name,
          size: file.size,
          uploading: true,
        };

        // Add to photos array
        onChange([...photos, newPhoto]);

        // Compress and upload
        try {
          const compressedFile = await compressImage(file, maxSizeMB);
          const uploadedUrl = await uploadPhoto(compressedFile, questionId);

          // Update photo with uploaded URL
          onChange(
            photos.map((p) =>
              p.id === photoId
                ? { ...p, url: uploadedUrl, uploading: false, uploaded: true }
                : p
            )
          );

          toast({
            title: 'Photo Uploaded',
            description: `${file.name} uploaded successfully`,
          });
        } catch (error: any) {
          console.error('Upload error:', error);

          // Update photo with error
          onChange(
            photos.map((p) =>
              p.id === photoId
                ? {
                    ...p,
                    uploading: false,
                    error: error.message || 'Upload failed',
                  }
                : p
            )
          );

          toast({
            title: 'Upload Failed',
            description: `Failed to upload ${file.name}`,
            variant: 'destructive',
          });
        }
      }
    },
    [photos, onChange, maxPhotos, maxSizeMB, questionId, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxFiles: maxPhotos - photos.length,
  });

  const removePhoto = (photoId: string) => {
    onChange(photos.filter((p) => p.id !== photoId));
  };

  const retryUpload = async (photo: Photo, file: File) => {
    // Re-attempt upload
    onChange(
      photos.map((p) =>
        p.id === photo.id ? { ...p, uploading: true, error: undefined } : p
      )
    );

    try {
      const compressedFile = await compressImage(file, maxSizeMB);
      const uploadedUrl = await uploadPhoto(compressedFile, questionId);

      onChange(
        photos.map((p) =>
          p.id === photo.id
            ? { ...p, url: uploadedUrl, uploading: false, uploaded: true }
            : p
        )
      );
    } catch (error: any) {
      onChange(
        photos.map((p) =>
          p.id === photo.id
            ? {
                ...p,
                uploading: false,
                error: error.message || 'Upload failed',
              }
            : p
        )
      );
    }
  };

  return (
    <div className="space-y-4">
      <Label>Attach Photos (Optional)</Label>

      {/* Dropzone */}
      {photos.length < maxPhotos && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary hover:bg-muted/50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            {isDragActive ? (
              <>
                <Upload className="h-10 w-10 text-primary" />
                <p className="text-sm font-medium text-primary">Drop photos here...</p>
              </>
            ) : (
              <>
                <Camera className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, GIF up to {maxSizeMB}MB ({maxPhotos - photos.length} remaining)
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="relative overflow-hidden group">
              {/* Image Preview */}
              <div className="aspect-square relative">
                <img
                  src={photo.preview || photo.url}
                  alt={photo.name}
                  className="w-full h-full object-cover"
                />

                {/* Uploading Overlay */}
                {photo.uploading && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                    <p className="text-xs text-white">Uploading...</p>
                  </div>
                )}

                {/* Success Indicator */}
                {photo.uploaded && (
                  <div className="absolute top-2 right-2 bg-green-600 text-white rounded-full p-1">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                )}

                {/* Error Overlay */}
                {photo.error && (
                  <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center p-2">
                    <p className="text-xs text-white text-center">{photo.error}</p>
                  </div>
                )}

                {/* Remove Button */}
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  onClick={() => removePhoto(photo.id)}
                  disabled={photo.uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Photo Info */}
              <div className="p-2 border-t bg-muted/50">
                <p className="text-xs truncate font-medium">{photo.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(photo.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Helper Text */}
      {photos.length === maxPhotos && (
        <p className="text-sm text-muted-foreground">
          Maximum of {maxPhotos} photos reached. Remove a photo to add another.
        </p>
      )}
    </div>
  );
}

/**
 * Compress image to reduce file size
 * Uses canvas API for client-side compression
 */
async function compressImage(file: File, maxSizeMB: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions (max 1920px width)
        const maxWidth = 1920;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with quality adjustment
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          'image/jpeg',
          0.85 // Quality (0-1)
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
 * Upload photo to server/cloud storage
 * This is a placeholder - implement actual upload logic
 */
async function uploadPhoto(file: File, questionId: string): Promise<string> {
  // In a real implementation, you would:
  // 1. Get a presigned upload URL from your backend
  // 2. Upload directly to S3 or similar
  // 3. Return the public URL

  // For now, return a mock URL
  // TODO: Implement actual upload logic
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`https://storage.example.com/diagnostics/${questionId}/${file.name}`);
    }, 2000); // Simulate upload delay
  });
}
