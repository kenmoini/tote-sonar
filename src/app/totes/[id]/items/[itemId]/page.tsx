'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Package, ArrowLeft, Hash, Calendar, FileText, Camera, Upload, X, Trash2, ImageIcon, AlertTriangle, Check, Tag, Plus, Pencil, ArrowRightLeft, Clock, MapPin, Copy } from 'lucide-react';
import { Item, ItemPhoto, ItemMetadata, MovementHistory, Tote } from '@/types';
import Breadcrumb from '@/components/Breadcrumb';
import ErrorDisplay from '@/components/ErrorDisplay';

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
  const [showEditItem, setShowEditItem] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editQuantity, setEditQuantity] = useState(1);
  const [editingItem, setEditingItem] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [showAddMetadata, setShowAddMetadata] = useState(false);
  const [metadataKey, setMetadataKey] = useState('');
  const [metadataValue, setMetadataValue] = useState('');
  const [addingMetadata, setAddingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [suggestedKeys, setSuggestedKeys] = useState<string[]>([]);
  const [showKeySuggestions, setShowKeySuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const keyInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [allTotes, setAllTotes] = useState<Tote[]>([]);
  const [selectedToteId, setSelectedToteId] = useState<string>('');
  const [movingItem, setMovingItem] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [loadingTotes, setLoadingTotes] = useState(false);
  const [duplicatingItem, setDuplicatingItem] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTargetToteId, setCopyTargetToteId] = useState<string>('');
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copyTotes, setCopyTotes] = useState<Tote[]>([]);
  const [loadingCopyTotes, setLoadingCopyTotes] = useState(false);
  const [maxUploadSize, setMaxUploadSize] = useState<number>(5242880); // Default 5MB
  const [editingMetadataId, setEditingMetadataId] = useState<number | null>(null);
  const [editMetaKey, setEditMetaKey] = useState('');
  const [editMetaValue, setEditMetaValue] = useState('');
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [editMetaError, setEditMetaError] = useState<string | null>(null);
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

  // Fetch max upload size from settings
  useEffect(() => {
    const fetchMaxUploadSize = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const json = await res.json();
          const sizeStr = json.settings?.max_upload_size;
          if (sizeStr) {
            const size = parseInt(sizeStr, 10);
            if (!isNaN(size) && size > 0) {
              setMaxUploadSize(size);
            }
          }
        }
      } catch {
        // Fall back to default 5MB
      }
    };
    fetchMaxUploadSize();
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch metadata keys for autocomplete when add form opens
  const fetchMetadataKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/metadata-keys');
      if (res.ok) {
        const json = await res.json();
        const keys = (json.data || []).map((k: { key_name: string }) => k.key_name);
        setSuggestedKeys(keys);
      }
    } catch {
      // Silently fail - autocomplete is optional
    }
  }, []);

  useEffect(() => {
    if (showAddMetadata) {
      fetchMetadataKeys();
    }
  }, [showAddMetadata, fetchMetadataKeys]);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        keyInputRef.current && !keyInputRef.current.contains(e.target as Node)
      ) {
        setShowKeySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter suggested keys based on current input (show all when empty for default key discovery)
  const filteredSuggestions = metadataKey.trim().length > 0
    ? suggestedKeys.filter((key) => key.toLowerCase().includes(metadataKey.toLowerCase().trim()))
    : suggestedKeys;

  const handleKeyInputChange = (value: string) => {
    setMetadataKey(value);
    setShowKeySuggestions(true);
    setSelectedSuggestionIndex(-1);
  };

  const handleSelectSuggestion = (key: string) => {
    setMetadataKey(key);
    setShowKeySuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

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

    // Client-side file size validation
    if (file.size > maxUploadSize) {
      const maxSizeMB = (maxUploadSize / (1024 * 1024)).toFixed(1);
      setUploadError(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum of ${maxSizeMB}MB. You can adjust this limit in Settings.`);
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

  const startEditMetadata = (meta: ItemMetadata) => {
    setEditingMetadataId(meta.id);
    setEditMetaKey(meta.key);
    setEditMetaValue(meta.value);
    setEditMetaError(null);
  };

  const cancelEditMetadata = () => {
    setEditingMetadataId(null);
    setEditMetaKey('');
    setEditMetaValue('');
    setEditMetaError(null);
  };

  const handleSaveMetadata = async () => {
    if (!editMetaKey.trim() || !editMetaValue.trim()) {
      setEditMetaError('Both key and value are required');
      return;
    }

    setSavingMetadata(true);
    setEditMetaError(null);

    try {
      const res = await fetch(`/api/items/${itemId}/metadata/${editingMetadataId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: editMetaKey.trim(), value: editMetaValue.trim() }),
      });

      if (!res.ok) {
        const json = await res.json();
        setEditMetaError(json.error || 'Failed to update metadata');
        return;
      }

      setToast({ message: `Metadata "${editMetaKey.trim()}" updated successfully!`, type: 'success' });
      setEditingMetadataId(null);
      setEditMetaKey('');
      setEditMetaValue('');
      await fetchItem();
    } catch {
      setEditMetaError('Failed to update metadata. Please try again.');
    } finally {
      setSavingMetadata(false);
    }
  };

  const openEditModal = () => {
    if (!item) return;
    setEditName(item.name);
    setEditDescription(item.description || '');
    setEditQuantity(item.quantity);
    setEditError(null);
    setShowEditItem(true);
  };

  const handleEditItem = async () => {
    if (!editName.trim()) {
      setEditError('Item name is required');
      return;
    }

    const qty = Number(editQuantity);
    if (isNaN(qty) || qty < 1 || !Number.isInteger(qty)) {
      setEditError('Quantity must be a positive whole number');
      return;
    }

    setEditingItem(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          quantity: qty,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        setEditError(json.error || 'Failed to update item');
        return;
      }

      setToast({ message: 'Item updated successfully!', type: 'success' });
      setShowEditItem(false);
      await fetchItem();
    } catch {
      setEditError('Failed to update item. Please try again.');
    } finally {
      setEditingItem(false);
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

  const openMoveModal = async () => {
    setMoveError(null);
    setSelectedToteId('');
    setLoadingTotes(true);
    setShowMoveModal(true);

    try {
      const res = await fetch('/api/totes');
      if (!res.ok) throw new Error('Failed to load totes');
      const json = await res.json();
      // Filter out the current tote so user can only pick a different one
      const otherTotes = (json.data || []).filter((t: Tote) => t.id !== toteId);
      setAllTotes(otherTotes);
    } catch {
      setMoveError('Failed to load totes. Please try again.');
    } finally {
      setLoadingTotes(false);
    }
  };

  const handleMoveItem = async () => {
    if (!selectedToteId) {
      setMoveError('Please select a destination tote');
      return;
    }

    setMovingItem(true);
    setMoveError(null);

    try {
      const res = await fetch(`/api/items/${itemId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_tote_id: selectedToteId }),
      });

      if (!res.ok) {
        const json = await res.json();
        setMoveError(json.error || 'Failed to move item');
        return;
      }

      const json = await res.json();
      setToast({ message: json.message || 'Item moved successfully!', type: 'success' });
      setShowMoveModal(false);

      // Redirect to the item in its new tote after a brief delay
      setTimeout(() => {
        router.push(`/totes/${selectedToteId}/items/${itemId}`);
      }, 500);
    } catch {
      setMoveError('Failed to move item. Please try again.');
    } finally {
      setMovingItem(false);
    }
  };

  const openCopyModal = async () => {
    setCopyError(null);
    setCopyTargetToteId('');
    setLoadingCopyTotes(true);
    setShowCopyModal(true);

    try {
      const res = await fetch('/api/totes');
      if (!res.ok) throw new Error('Failed to load totes');
      const json = await res.json();
      // Show all totes including current one (copy can be to same or different tote)
      const totes = (json.data || []);
      setCopyTotes(totes);
    } catch {
      setCopyError('Failed to load totes. Please try again.');
    } finally {
      setLoadingCopyTotes(false);
    }
  };

  const handleCopyItem = async () => {
    if (!copyTargetToteId) {
      setCopyError('Please select a destination tote');
      return;
    }

    setDuplicatingItem(true);
    setCopyError(null);

    try {
      const body: Record<string, string> = {};
      // Only send target_tote_id if copying to a different tote
      if (copyTargetToteId !== toteId) {
        body.target_tote_id = copyTargetToteId;
      }

      const res = await fetch(`/api/items/${itemId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json();
        setCopyError(json.error || 'Failed to copy item');
        return;
      }

      const json = await res.json();
      const newItem = json.data;
      setToast({ message: json.message || 'Item copied successfully!', type: 'success' });
      setShowCopyModal(false);

      // Navigate to the copied item after a brief delay
      setTimeout(() => {
        router.push(`/totes/${newItem.tote_id}/items/${newItem.id}`);
      }, 500);
    } catch {
      setCopyError('Failed to copy item. Please try again.');
    } finally {
      setDuplicatingItem(false);
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
    const isNotFound = error === 'Item not found' || (!item && !error);
    return (
      <main className="page-container">
        {isNotFound ? (
          <div className="error-state">
            <AlertTriangle size={48} className="error-icon" />
            <h2>Item Not Found</h2>
            <p>The item you&rsquo;re looking for doesn&rsquo;t exist or may have been deleted.</p>
            <Link href={`/totes/${toteId}`} className="btn btn-secondary">
              <ArrowLeft size={16} />
              Back to Tote
            </Link>
          </div>
        ) : (
          <ErrorDisplay error={error || 'Unknown error'} onRetry={fetchItem} retryLabel="Retry" />
        )}
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

      {/* Edit Item Modal */}
      {showEditItem && item && (
        <div className="modal-overlay" onClick={() => { if (!editingItem) setShowEditItem(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Item</h2>
              <button
                className="modal-close"
                onClick={() => { if (!editingItem) setShowEditItem(false); }}
                aria-label="Close"
                disabled={editingItem}
              >
                <X size={20} />
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Name <span className="form-required">*</span></label>
              <input
                type="text"
                className={`form-input ${editError && !editName.trim() ? 'form-input-error' : ''}`}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Item name"
                disabled={editingItem}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input form-textarea"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Item description (optional)"
                disabled={editingItem}
                rows={3}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input
                type="number"
                className="form-input"
                value={editQuantity}
                onChange={(e) => setEditQuantity(Number(e.target.value))}
                min={1}
                step={1}
                disabled={editingItem}
              />
            </div>
            {editError && (
              <div className="form-error-text">{editError}</div>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowEditItem(false)}
                disabled={editingItem}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleEditItem}
                disabled={editingItem}
              >
                {editingItem ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Item Modal */}
      {showMoveModal && item && (
        <div className="modal-overlay" onClick={() => { if (!movingItem) setShowMoveModal(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon-title">
                <div className="meta-card-icon">
                  <ArrowRightLeft size={22} />
                </div>
                <h2>Move Item</h2>
              </div>
              <button
                className="modal-close"
                onClick={() => { if (!movingItem) setShowMoveModal(false); }}
                aria-label="Close"
                disabled={movingItem}
              >
                <X size={20} />
              </button>
            </div>
            <div className="confirm-body">
              <p>
                Move <strong>&ldquo;{item.name}&rdquo;</strong> from <strong>{item.tote_name}</strong> to:
              </p>
              {loadingTotes ? (
                <div className="loading-state" style={{ padding: '1rem 0' }}>
                  <div className="spinner" />
                  <p>Loading totes...</p>
                </div>
              ) : allTotes.length === 0 ? (
                <div className="metadata-empty-state" style={{ padding: '1rem 0' }}>
                  <Package size={32} />
                  <p>No other totes available</p>
                  <span className="metadata-empty-hint">Create another tote first to move this item</span>
                </div>
              ) : (
                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label className="form-label">Destination Tote <span className="form-required">*</span></label>
                  <select
                    className="form-input form-select"
                    value={selectedToteId}
                    onChange={(e) => {
                      setSelectedToteId(e.target.value);
                      setMoveError(null);
                    }}
                    disabled={movingItem}
                  >
                    <option value="">Select a tote...</option>
                    {allTotes.map((t: Tote) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.location})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {moveError && (
                <div className="form-error-text" style={{ marginTop: '0.5rem' }}>{moveError}</div>
              )}
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowMoveModal(false)}
                disabled={movingItem}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleMoveItem}
                disabled={movingItem || !selectedToteId || loadingTotes}
              >
                {movingItem ? 'Moving...' : 'Move Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy/Duplicate modal */}
      {showCopyModal && item && (
        <div className="modal-overlay" onClick={() => { if (!duplicatingItem) setShowCopyModal(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon-title">
                <div className="meta-card-icon">
                  <Copy size={22} />
                </div>
                <h2>Copy Item</h2>
              </div>
              <button
                className="modal-close"
                onClick={() => { if (!duplicatingItem) setShowCopyModal(false); }}
                aria-label="Close"
                disabled={duplicatingItem}
              >
                <X size={20} />
              </button>
            </div>
            <div className="confirm-body">
              <p>
                Copy <strong>&ldquo;{item.name}&rdquo;</strong> to:
              </p>
              {loadingCopyTotes ? (
                <div className="loading-state" style={{ padding: '1rem 0' }}>
                  <div className="spinner" />
                  <p>Loading totes...</p>
                </div>
              ) : copyTotes.length === 0 ? (
                <div className="metadata-empty-state" style={{ padding: '1rem 0' }}>
                  <Package size={32} />
                  <p>No totes available</p>
                  <span className="metadata-empty-hint">Create a tote first</span>
                </div>
              ) : (
                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label className="form-label">Destination Tote <span className="form-required">*</span></label>
                  <select
                    className="form-input form-select"
                    value={copyTargetToteId}
                    onChange={(e) => {
                      setCopyTargetToteId(e.target.value);
                      setCopyError(null);
                    }}
                    disabled={duplicatingItem}
                  >
                    <option value="">Select a tote...</option>
                    {copyTotes.map((t: Tote) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.location}){t.id === toteId ? ' - Current' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {copyError && (
                <div className="form-error-text" style={{ marginTop: '0.5rem' }}>{copyError}</div>
              )}
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCopyModal(false)}
                disabled={duplicatingItem}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCopyItem}
                disabled={duplicatingItem || !copyTargetToteId || loadingCopyTotes}
              >
                {duplicatingItem ? 'Copying...' : 'Copy Item'}
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
        <div className="tote-detail-actions">
          <button
            className="btn btn-secondary"
            onClick={openEditModal}
            title="Edit item"
          >
            <Pencil size={16} />
            <span>Edit Item</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={openMoveModal}
            title="Move item to another tote"
          >
            <ArrowRightLeft size={16} />
            <span>Move</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={openCopyModal}
            disabled={duplicatingItem}
            title="Copy item to same or different tote"
          >
            <Copy size={16} />
            <span>{duplicatingItem ? 'Copying...' : 'Copy'}</span>
          </button>
          <button
            className="btn btn-danger"
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete item"
          >
            <Trash2 size={16} />
            <span>Delete Item</span>
          </button>
        </div>
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
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Key <span className="form-required">*</span></label>
                <input
                  ref={keyInputRef}
                  type="text"
                  className={`form-input ${metadataError ? 'form-input-error' : ''}`}
                  placeholder="e.g., Brand, Color, Size"
                  value={metadataKey}
                  onChange={(e) => handleKeyInputChange(e.target.value)}
                  onFocus={() => {
                    setShowKeySuggestions(true);
                  }}
                  onKeyDown={(e) => {
                    if (showKeySuggestions && filteredSuggestions.length > 0) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSelectedSuggestionIndex((prev) =>
                          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
                        );
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSelectedSuggestionIndex((prev) =>
                          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
                        );
                      } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
                        e.preventDefault();
                        handleSelectSuggestion(filteredSuggestions[selectedSuggestionIndex]);
                      } else if (e.key === 'Escape') {
                        setShowKeySuggestions(false);
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMetadata();
                      }
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMetadata();
                    }
                  }}
                  disabled={addingMetadata}
                  autoFocus
                  autoComplete="off"
                />
                {showKeySuggestions && filteredSuggestions.length > 0 && (
                  <div className="autocomplete-dropdown" ref={suggestionsRef}>
                    {filteredSuggestions.map((key, index) => (
                      <div
                        key={key}
                        className={`autocomplete-item ${index === selectedSuggestionIndex ? 'autocomplete-item-active' : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectSuggestion(key);
                        }}
                        onMouseEnter={() => setSelectedSuggestionIndex(index)}
                      >
                        {key}
                      </div>
                    ))}
                  </div>
                )}
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
              editingMetadataId === meta.id ? (
                <div key={meta.id} className="metadata-edit-form">
                  <div className="metadata-edit-fields">
                    <div className="form-group">
                      <label className="form-label">Key <span className="form-required">*</span></label>
                      <input
                        type="text"
                        className={`form-input form-input-sm ${editMetaError ? 'form-input-error' : ''}`}
                        value={editMetaKey}
                        onChange={(e) => setEditMetaKey(e.target.value)}
                        disabled={savingMetadata}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveMetadata();
                          }
                          if (e.key === 'Escape') {
                            cancelEditMetadata();
                          }
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Value <span className="form-required">*</span></label>
                      <input
                        type="text"
                        className={`form-input form-input-sm ${editMetaError ? 'form-input-error' : ''}`}
                        value={editMetaValue}
                        onChange={(e) => setEditMetaValue(e.target.value)}
                        disabled={savingMetadata}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveMetadata();
                          }
                          if (e.key === 'Escape') {
                            cancelEditMetadata();
                          }
                        }}
                      />
                    </div>
                  </div>
                  {editMetaError && (
                    <div className="form-error-text" style={{ marginTop: '0.25rem' }}>{editMetaError}</div>
                  )}
                  <div className="metadata-edit-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={cancelEditMetadata}
                      disabled={savingMetadata}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleSaveMetadata}
                      disabled={savingMetadata}
                    >
                      {savingMetadata ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div key={meta.id} className="metadata-tag">
                  <span className="metadata-tag-key">{meta.key}</span>
                  <span className="metadata-tag-separator">:</span>
                  <span className="metadata-tag-value">{meta.value}</span>
                  <button
                    className="metadata-tag-edit"
                    onClick={() => startEditMetadata(meta)}
                    title={`Edit ${meta.key}`}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="metadata-tag-remove"
                    onClick={() => handleDeleteMetadata(meta.id, meta.key)}
                    title={`Remove ${meta.key}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              )
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

      {/* Movement History Section */}
      <div className="tote-detail-section">
        <div className="section-header">
          <h2>
            <Clock size={20} />
            Movement History
          </h2>
        </div>
        {item.movement_history && item.movement_history.length > 0 ? (
          <div className="movement-history-list">
            {item.movement_history.map((move: MovementHistory) => (
              <div key={move.id} className="movement-history-item">
                <div className="movement-history-icon">
                  <ArrowRightLeft size={16} />
                </div>
                <div className="movement-history-content">
                  <div className="movement-history-description">
                    Moved from{' '}
                    {move.from_tote_name ? (
                      <Link href={`/totes/${move.from_tote_id}`} className="movement-history-link">
                        {move.from_tote_name}
                      </Link>
                    ) : (
                      <span className="movement-history-unknown">Unknown</span>
                    )}
                    {' '}to{' '}
                    <Link href={`/totes/${move.to_tote_id}`} className="movement-history-link">
                      {move.to_tote_name}
                    </Link>
                  </div>
                  <div className="movement-history-time">
                    {formatDate(move.moved_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="metadata-empty-state">
            <Clock size={32} />
            <p>No movement history</p>
            <span className="metadata-empty-hint">Movement history will appear here when this item is moved between totes</span>
          </div>
        )}
      </div>
    </main>
  );
}
