'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { PhotoRecord } from '@/types';
import { PhotoDeleteConfirm } from './PhotoDeleteConfirm';

interface PhotoGalleryProps {
  photos: PhotoRecord[];
  entityName: string;
  source: 'item' | 'tote';
  onPhotoDeleted: () => void;
}

export function PhotoGallery({ photos, entityName, source, onPhotoDeleted }: PhotoGalleryProps) {
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<PhotoRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sourceParam = source === 'tote' ? '?source=tote' : '';

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (viewingIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setViewingIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'ArrowRight') {
        setViewingIndex((prev) =>
          prev !== null && prev < photos.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'Escape') {
        setViewingIndex(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [viewingIndex, photos.length]);

  const handleDeletePhoto = useCallback(async () => {
    if (!photoToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/photos/${photoToDelete.id}${sourceParam}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const json = await res.json();
        console.error('Failed to delete photo:', json.error);
        return;
      }

      // Close lightbox if the deleted photo was being viewed
      if (viewingIndex !== null) {
        const deletedIdx = photos.findIndex((p) => p.id === photoToDelete.id);
        if (deletedIdx === viewingIndex) {
          setViewingIndex(null);
        } else if (deletedIdx < viewingIndex) {
          // Adjust index since a photo before the viewed one was removed
          setViewingIndex(viewingIndex - 1);
        }
      }

      setShowDeleteConfirm(false);
      setPhotoToDelete(null);
      onPhotoDeleted();
    } catch {
      console.error('Failed to delete photo');
    } finally {
      setDeleting(false);
    }
  }, [photoToDelete, sourceParam, viewingIndex, photos, onPhotoDeleted]);

  if (photos.length === 0) return null;

  const viewingPhoto = viewingIndex !== null ? photos[viewingIndex] : null;

  return (
    <>
      {/* Thumbnail grid */}
      <div className="photo-gallery">
        {photos.map((photo, index) => (
          <div key={photo.id} className="photo-thumbnail-card">
            <div
              className="photo-thumbnail-wrapper"
              onClick={() => setViewingIndex(index)}
              title="Click to view full size"
            >
              <img
                src={`/api/photos/${photo.id}/thumbnail${sourceParam}`}
                alt={`Photo of ${entityName}`}
                className="photo-thumbnail-img"
              />
            </div>
            <div className="photo-thumbnail-actions">
              <button
                className="photo-delete-btn"
                onClick={() => {
                  setPhotoToDelete(photo);
                  setShowDeleteConfirm(true);
                }}
                title="Delete photo"
                aria-label="Delete photo"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {viewingPhoto && viewingIndex !== null && (
        <div className="photo-lightbox" onClick={() => setViewingIndex(null)}>
          <div className="photo-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="photo-lightbox-header">
              <span className="photo-lightbox-title">
                {viewingIndex + 1} of {photos.length}
              </span>
              <div className="photo-lightbox-actions">
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    setPhotoToDelete(viewingPhoto);
                    setShowDeleteConfirm(true);
                  }}
                  title="Delete photo"
                  aria-label="Delete photo"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  className="photo-lightbox-close"
                  onClick={() => setViewingIndex(null)}
                  title="Close"
                  aria-label="Close lightbox"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="photo-lightbox-image-wrapper">
              {viewingIndex > 0 && (
                <button
                  className="photo-lightbox-nav photo-lightbox-nav-left"
                  onClick={() => setViewingIndex(viewingIndex - 1)}
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={32} />
                </button>
              )}
              <img
                src={`/api/photos/${viewingPhoto.id}${sourceParam}`}
                alt={`Photo of ${entityName}`}
                className="photo-lightbox-image"
              />
              {viewingIndex < photos.length - 1 && (
                <button
                  className="photo-lightbox-nav photo-lightbox-nav-right"
                  onClick={() => setViewingIndex(viewingIndex + 1)}
                  aria-label="Next photo"
                >
                  <ChevronRight size={32} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <PhotoDeleteConfirm
        isOpen={showDeleteConfirm}
        onConfirm={handleDeletePhoto}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setPhotoToDelete(null);
        }}
        deleting={deleting}
      />
    </>
  );
}
