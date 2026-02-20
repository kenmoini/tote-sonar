'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Package, ArrowLeft, Hash, Calendar, FileText, Camera, Upload, X, Trash2, ImageIcon, AlertTriangle, Check, Tag, Plus } from 'lucide-react';
import { Item, ItemPhoto, ItemMetadata } from '@/types';
import Breadcrumb from '@/components/Breadcrumb';

interface ItemDetail extends Item {
  tote_name: string;
  tote_location: string;
}

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toteId = params.id as string;
  const itemId = params.itemId as string;
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<ItemPhoto | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingItem, setDeletingItem] = useState(false);
  const [showAddMetadata, setShowAddMetadata] = useState(false);
  const [metadataKey, setMetadataKey] = useState('');
  const [metadataValue, setMetadataValue] = useState('');
  const [addingMetadata, setAddingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItem = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/items/${itemId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Item not found');
        throw new Error('Failed to load item');
      }
      const json = await res.json();
      setItem(json.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load item');
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    if (itemId) fetchItem();
  }, [itemId, fetchItem]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'Z');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleUploadClick = () => {
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    e.target.value = '';

    // Client-side validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid file type. Supported formats: JPEG, PNG, WebP');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const res = await fetch(`/api/items/${itemId}/photos`, {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setUploadError(json.error || 'Upload failed');
        return;
      }

      setToast({ message: 'Photo uploaded successfully!', type: 'success' });
      // Refresh item data to show new photo
      await fetchItem();
    } catch (err) {
      setUploadError('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!confirm('Delete this photo?')) return;

    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        setToast({ message: json.error || 'Failed to delete photo', type: 'error' });
        return;
      }
      setToast({ message: 'Photo deleted', type: 'success' });
      setViewingPhoto(null);
      await fetchItem();
    } catch {
      setToast({ message: 'Failed to delete photo', type: 'error' });
    }
  };

  const handleAddMetadata = async () => {
    if (!metadataKey.trim() || !metadataValue.trim()) {
      setMetadataError('Both key and value are required');
      return;
    }

    setAddingMetadata(true);
    setMetadataError(null);

    try {
      const res = await fetch(`/api/items/${itemId}/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: metadataKey.trim(), value: metadataValue.trim() }),
      });

      if (!res.ok) {
        const json = await res.json();
        setMetadataError(json.error || 'Failed to add metadata');
        return;
      }

      setToast({ message: `Metadata "${metadataKey.trim()}" added successfully!`, type: 'success' });
      setMetadataKey('');
      setMetadataValue('');
      setShowAddMetadata(false);
      await fetchItem();
    } catch {
      setMetadataError('Failed to add metadata. Please try again.');
    } finally {
      setAddingMetadata(false);
    }
  };

  const handleDeleteMetadata = async (metaId: number, metaKey: string) => {
    try {
      const res = await fetch(`/api/items/${itemId}/metadata/${metaId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const json = await res.json();
        setToast({ message: json.error || 'Failed to delete metadata', type: 'error' });
        return;
      }

      setToast({ message: `Metadata "${metaKey}" removed`, type: 'success' });
      await fetchItem();
    } catch {
      setToast({ message: 'Failed to delete metadata', type: 'error' });
    }
  };

  const handleDeleteItem = async () => {
    setDeletingItem(true);
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete item');
      }

      const json = await res.json();
      setToast({ message: json.message || 'Item deleted successfully', type: 'success' });
      setShowDeleteConfirm(false);

      // Navigate back to tote detail page after a brief delay so toast is visible
      setTimeout(() => {
        router.push(`/totes/${toteId}`);
      }, 500);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to delete item', type: 'error' });
      setDeletingItem(false);
    }
  };

  if (loading) {
    return (
      <main className="page-container">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading item...</p>
        </div>
      </main>
    );
  }

  if (error || !item) {
    return (
      <main className="page-container">
        <div className="error-state">
          <p>{error || 'Item not found'}</p>
          <Link href={`/totes/${toteId}`} className="btn btn-secondary">
            <ArrowLeft size={16} />
            Back to Tote
          </Link>
        </div>
      </main>
    );
  }

  const photos = item.photos || [];
  const canUpload = photos.length < 3;

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/' },
    { label: 'Totes', href: '/totes' },
    { label: item.tote_name, href: `/totes/${toteId}` },
    { label: item.name },
  ];

  return (
    <main className="page-container">
      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`} role="alert">
          <span className="toast-icon">
            {toast.type === 'success' ? <Check size={16} /> : <X size={16} />}
          </span>
          <span>{toast.message}</span>
          <button className="toast-close" onClick={() => setToast(null)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Delete Item Confirmation Dialog */}
      {showDeleteConfirm && item && (
        <div className="modal-overlay" onClick={() => { if (!deletingItem) setShowDeleteConfirm(false); }}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header modal-header-danger">
              <div className="modal-header-icon-title">
                <div className="confirm-icon-danger">
                  <AlertTriangle size={24} />
                </div>
                <h2>Delete Item</h2>
              </div>
              <button
                className="modal-close"
                onClick={() => { if (!deletingItem) setShowDeleteConfirm(false); }}
                aria-label="Close"
                disabled={deletingItem}
              >
                <X size={20} />
              </button>
            </div>
            <div className="confirm-body">
              <p>
                Are you sure you want to delete <strong>&ldquo;{item.name}&rdquo;</strong>?
              </p>
              <p className="confirm-text-muted">This will also remove all photos and metadata associated with this item. This action cannot be undone.</p>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingItem}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteItem}
                disabled={deletingItem}
              >
                {deletingItem ? 'Deleting...' : 'Delete Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-size photo lightbox */}
      {viewingPhoto && (
        <div className="photo-lightbox" onClick={() => setViewingPhoto(null)}>
          <div className="photo-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="photo-lightbox-header">
              <span className="photo-lightbox-title">{viewingPhoto.filename}</span>
              <div className="photo-lightbox-actions">
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeletePhoto(viewingPhoto.id)}
                  title="Delete photo"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  className="photo-lightbox-close"
                  onClick={() => setViewingPhoto(null)}
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="photo-lightbox-image-wrapper">
              <img
                src={`/api/photos/${viewingPhoto.id}`}
                alt="Full size"
                className="photo-lightbox-image"
              />
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Item header */}
      <div className="item-detail-header">
        <div className="item-detail-title-row">
          <div className="item-detail-icon">
            <Package size={28} />
          </div>
          <div>
            <h1>{item.name}</h1>
            <span className="item-detail-tote">
              in <Link href={`/totes/${toteId}`} className="item-detail-tote-link">{item.tote_name}</Link>
            </span>
          </div>
        </div>
        <button
          className="btn btn-danger"
          onClick={() => setShowDeleteConfirm(true)}
          title="Delete item"
        >
          <Trash2 size={16} />
          <span>Delete Item</span>
        </button>
      </div>

      {/* Item metadata */}
      <div className="item-detail-meta-grid">
        <div className="tote-detail-meta-card">
          <div className="meta-card-icon"><Hash size={18} /></div>
          <div>
            <span className="meta-card-label">Quantity</span>
            <span className="meta-card-value">{item.quantity}</span>
          </div>
        </div>
        <div className="tote-detail-meta-card">
          <div className="meta-card-icon"><Calendar size={18} /></div>
          <div>
            <span className="meta-card-label">Added</span>
            <span className="meta-card-value">{formatDate(item.created_at)}</span>
          </div>
        </div>
        {item.description && (
          <div className="tote-detail-meta-card item-desc-card">
            <div className="meta-card-icon"><FileText size={18} /></div>
            <div>
              <span className="meta-card-label">Description</span>
              <span className="meta-card-value">{item.description}</span>
            </div>
          </div>
        )}
      </div>

      {/* Photos section */}
      <div className="tote-detail-section">
        <div className="section-header">
          <h2>
            <Camera size={20} />
            Photos ({photos.length}/3)
          </h2>
          {canUpload && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleUploadClick}
              disabled={uploading}
            >
              <Upload size={16} />
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </button>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {/* Upload error */}
        {uploadError && (
          <div className="photo-upload-error">
            {uploadError}
          </div>
        )}

        {/* Photo gallery */}
        {photos.length > 0 ? (
          <div className="photo-gallery">
            {photos.map((photo: ItemPhoto) => (
              <div key={photo.id} className="photo-thumbnail-card">
                <div
                  className="photo-thumbnail-wrapper"
                  onClick={() => setViewingPhoto(photo)}
                  title="Click to view full size"
                >
                  <img
                    src={`/api/photos/${photo.id}/thumbnail`}
                    alt={`Photo of ${item.name}`}
                    className="photo-thumbnail-img"
                  />
                </div>
                <div className="photo-thumbnail-actions">
                  <button
                    className="photo-delete-btn"
                    onClick={() => handleDeletePhoto(photo.id)}
                    title="Delete photo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {/* Upload placeholder if under limit */}
            {canUpload && (
              <div
                className="photo-thumbnail-card photo-upload-placeholder"
                onClick={handleUploadClick}
                title="Upload a photo"
              >
                <div className="photo-placeholder-content">
                  <ImageIcon size={32} />
                  <span>Add Photo</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className="photo-empty-state"
            onClick={handleUploadClick}
            title="Upload a photo"
          >
            <ImageIcon size={48} />
            <p>No photos yet</p>
            <span className="photo-empty-hint">Click to upload a photo</span>
          </div>
        )}
      </div>

      {/* Metadata Tags Section */}
      <div className="tote-detail-section">
        <div className="section-header">
          <h2>
            <Tag size={20} />
            Metadata Tags
          </h2>
          {!showAddMetadata && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setShowAddMetadata(true);
                setMetadataError(null);
                setMetadataKey('');
                setMetadataValue('');
              }}
            >
              <Plus size={16} />
              Add Metadata
            </button>
          )}
        </div>

        {/* Add Metadata Form */}
        {showAddMetadata && (
          <div className="metadata-add-form">
            <div className="metadata-add-fields">
              <div className="form-group">
                <label className="form-label">Key <span className="form-required">*</span></label>
                <input
                  type="text"
                  className={`form-input ${metadataError ? 'form-input-error' : ''}`}
                  placeholder="e.g., Brand, Color, Size"
                  value={metadataKey}
                  onChange={(e) => setMetadataKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMetadata();
                    }
                  }}
                  disabled={addingMetadata}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Value <span className="form-required">*</span></label>
                <input
                  type="text"
                  className={`form-input ${metadataError ? 'form-input-error' : ''}`}
                  placeholder="e.g., Acme, Red, Large"
                  value={metadataValue}
                  onChange={(e) => setMetadataValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMetadata();
                    }
                  }}
                  disabled={addingMetadata}
                />
              </div>
            </div>
            {metadataError && (
              <div className="form-error-text" style={{ marginTop: '0.25rem' }}>{metadataError}</div>
            )}
            <div className="metadata-add-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setShowAddMetadata(false);
                  setMetadataError(null);
                }}
                disabled={addingMetadata}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleAddMetadata}
                disabled={addingMetadata}
              >
                {addingMetadata ? 'Adding...' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Metadata Tags Display */}
        {item.metadata && item.metadata.length > 0 ? (
          <div className="metadata-tags-list">
            {item.metadata.map((meta: ItemMetadata) => (
              <div key={meta.id} className="metadata-tag">
                <span className="metadata-tag-key">{meta.key}</span>
                <span className="metadata-tag-separator">:</span>
                <span className="metadata-tag-value">{meta.value}</span>
                <button
                  className="metadata-tag-remove"
                  onClick={() => handleDeleteMetadata(meta.id, meta.key)}
                  title={`Remove ${meta.key}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : !showAddMetadata ? (
          <div className="metadata-empty-state">
            <Tag size={32} />
            <p>No metadata tags</p>
            <span className="metadata-empty-hint">Add key-value metadata to organize and describe this item</span>
          </div>
        ) : null}
      </div>
    </main>
  );
}
