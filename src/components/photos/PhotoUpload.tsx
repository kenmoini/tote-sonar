'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, ImageIcon } from 'lucide-react';

interface PhotoUploadProps {
  entityType: 'item' | 'tote';
  entityId: string | number;
  currentPhotoCount: number;
  maxPhotos: number;
  onUploadComplete: () => void;
  maxUploadSize: number;
}

export function PhotoUpload({
  entityType,
  entityId,
  currentPhotoCount,
  maxPhotos,
  onUploadComplete,
  maxUploadSize,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const canUpload = currentPhotoCount < maxPhotos;

  const uploadFile = useCallback(async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Supported formats: JPEG, PNG, WebP');
      return;
    }

    if (file.size > maxUploadSize) {
      const maxSizeMB = (maxUploadSize / (1024 * 1024)).toFixed(1);
      setError(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum of ${maxSizeMB}MB. You can adjust this limit in Settings.`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const res = await fetch(`/api/${entityType}s/${entityId}/photos`, {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Upload failed');
        return;
      }

      setError(null);
      onUploadComplete();
    } catch {
      setError('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [entityType, entityId, maxUploadSize, onUploadComplete]);

  const handleUploadClick = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await uploadFile(file);
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setDragActive(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragActive(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragActive(false);

    if (!canUpload) {
      setError(`Photo limit reached (${maxPhotos} max). Delete a photo first.`);
      return;
    }

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, [canUpload, maxPhotos, uploadFile]);

  return (
    <div>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Upload error */}
      {error && (
        <div className="photo-upload-error">
          {error}
        </div>
      )}

      {/* Upload zone */}
      <div
        className={`photo-empty-state ${dragActive ? 'photo-empty-state-drag' : ''}`}
        onClick={canUpload ? handleUploadClick : undefined}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        title={canUpload ? 'Upload a photo' : `Photo limit reached (${maxPhotos} max)`}
        style={{ cursor: canUpload ? 'pointer' : 'default' }}
      >
        {uploading ? (
          <>
            <div className="spinner" />
            <p>Uploading...</p>
          </>
        ) : canUpload ? (
          <>
            <Upload size={32} />
            <p>{currentPhotoCount === 0 ? 'No photos yet' : 'Add another photo'}</p>
            <span className="photo-empty-hint">
              Click or drag & drop to upload ({currentPhotoCount} of {maxPhotos})
            </span>
          </>
        ) : (
          <>
            <ImageIcon size={32} />
            <p>Photo limit reached</p>
            <span className="photo-empty-hint">
              Maximum {maxPhotos} photos. Delete a photo to upload a new one.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
