'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Box, MapPin, User, ArrowLeft, Package, Calendar, Plus, X, Check, Trash2, AlertTriangle, Pencil, QrCode, ArrowUp, ArrowDown, ImageIcon, Printer, Loader2, Camera, Upload } from 'lucide-react';
import { Tote, Item, ItemPhoto } from '@/types';
import Breadcrumb from '@/components/Breadcrumb';
import ErrorDisplay from '@/components/ErrorDisplay';

interface ToteDetail extends Tote {
  items: Item[];
  item_count: number;
}

type ItemSortField = 'name' | 'created_at' | 'quantity';
type ItemSortOrder = 'asc' | 'desc';
type QrLabelSize = 'small' | 'medium' | 'large';

const QR_SIZES: Record<QrLabelSize, { display: number; print: number; label: string }> = {
  small: { display: 128, print: 150, label: 'Small' },
  medium: { display: 200, print: 250, label: 'Medium' },
  large: { display: 300, print: 350, label: 'Large' },
};

export default function ToteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toteId = params.id as string;
  const [tote, setTote] = useState<ToteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Add Item form state
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [addingItem, setAddingItem] = useState(false);
  const [itemFormErrors, setItemFormErrors] = useState<{ name?: string; quantity?: string }>({});
  const [itemPhoto, setItemPhoto] = useState<File | null>(null);
  const [itemPhotoPreviewUrl, setItemPhotoPreviewUrl] = useState<string | null>(null);
  const [itemPhotoError, setItemPhotoError] = useState<string | null>(null);
  const [maxUploadSize, setMaxUploadSize] = useState<number>(5242880);
  const addItemFileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Edit Tote form state
  const [showEditForm, setShowEditForm] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editSize, setEditSize] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editOwner, setEditOwner] = useState('');
  const [editingTote, setEditingTote] = useState(false);
  const [editFormErrors, setEditFormErrors] = useState<{ name?: string; location?: string }>({});

  // Delete Item confirmation state
  const [showDeleteItemConfirm, setShowDeleteItemConfirm] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [deletingItemName, setDeletingItemName] = useState('');
  const [deletingItemLoading, setDeletingItemLoading] = useState(false);

  // QR label size state
  const [qrLabelSize, setQrLabelSize] = useState<QrLabelSize>('medium');

  // Item sort state
  const [itemSortBy, setItemSortBy] = useState<ItemSortField>('name');
  const [itemSortOrder, setItemSortOrder] = useState<ItemSortOrder>('asc');

  const handleItemSort = (field: ItemSortField) => {
    if (itemSortBy === field) {
      setItemSortOrder(itemSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setItemSortBy(field);
      setItemSortOrder('asc');
    }
  };

  const getSortedItems = (items: Item[]): Item[] => {
    return [...items].sort((a, b) => {
      let comparison = 0;
      switch (itemSortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return itemSortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const resetItemForm = () => {
    setItemName('');
    setItemDescription('');
    setItemQuantity('1');
    setItemFormErrors({});
    if (itemPhotoPreviewUrl) {
      URL.revokeObjectURL(itemPhotoPreviewUrl);
    }
    setItemPhoto(null);
    setItemPhotoPreviewUrl(null);
    setItemPhotoError(null);
  };

  const openEditForm = () => {
    if (tote) {
      setEditName(tote.name);
      setEditLocation(tote.location);
      setEditSize(tote.size || '');
      setEditColor(tote.color || '');
      setEditOwner(tote.owner || '');
      setEditFormErrors({});
      setShowEditForm(true);
    }
  };

  const handleEditTote = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { name?: string; location?: string } = {};
    if (!editName.trim()) errors.name = 'Tote name is required';
    if (!editLocation.trim()) errors.location = 'Location is required';
    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      return;
    }

    setEditingTote(true);
    setEditFormErrors({});

    try {
      const res = await fetch(`/api/totes/${toteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          location: editLocation.trim(),
          size: editSize.trim() || null,
          color: editColor.trim() || null,
          owner: editOwner.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update tote');
      }

      showToast('Tote updated successfully!', 'success');
      setShowEditForm(false);
      await fetchTote();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update tote', 'error');
    } finally {
      setEditingTote(false);
    }
  };

  const fetchTote = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/totes/${toteId}`);
      if (!res.ok) {
        if (res.status === 404 || res.status === 400) throw new Error('Tote not found');
        throw new Error('Failed to load tote');
      }
      const json = await res.json();
      setTote(json.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tote');
    } finally {
      setLoading(false);
    }
  }, [toteId]);

  useEffect(() => {
    if (toteId) fetchTote();
  }, [toteId, fetchTote]);

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
            if (!isNaN(size) && size > 0) setMaxUploadSize(size);
          }
        }
      } catch {
        // Fall back to default
      }
    };
    fetchMaxUploadSize();
  }, []);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm && !deleting) setShowDeleteConfirm(false);
        if (showDeleteItemConfirm && !deletingItemLoading) {
          setShowDeleteItemConfirm(false);
          setDeletingItemId(null);
          setDeletingItemName('');
        }
        if (showEditForm && !editingTote) setShowEditForm(false);
        if (showAddItemForm) {
          setShowAddItemForm(false);
          resetItemForm();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteConfirm, deleting, showDeleteItemConfirm, deletingItemLoading, showEditForm, editingTote, showAddItemForm]);

  const handleAddItemFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setItemPhotoError('Invalid file type. Supported formats: JPEG, PNG, WebP');
      return;
    }

    if (file.size > maxUploadSize) {
      const maxSizeMB = (maxUploadSize / (1024 * 1024)).toFixed(1);
      setItemPhotoError(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum of ${maxSizeMB}MB.`);
      return;
    }

    if (itemPhotoPreviewUrl) {
      URL.revokeObjectURL(itemPhotoPreviewUrl);
    }
    setItemPhoto(file);
    setItemPhotoPreviewUrl(URL.createObjectURL(file));
    setItemPhotoError(null);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const errors: { name?: string; quantity?: string } = {};
    if (!itemName.trim()) errors.name = 'Item name is required';

    // Quantity validation
    const qtyStr = itemQuantity.trim();
    const qty = Number(qtyStr);
    if (qtyStr === '' || isNaN(qty)) {
      errors.quantity = 'Quantity must be a valid number';
    } else if (!Number.isInteger(qty)) {
      errors.quantity = 'Quantity must be a whole number';
    } else if (qty < 1) {
      errors.quantity = 'Quantity must be at least 1';
    }

    if (Object.keys(errors).length > 0) {
      setItemFormErrors(errors);
      return;
    }

    setAddingItem(true);
    setItemFormErrors({});

    try {
      const res = await fetch(`/api/totes/${toteId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: itemName.trim(),
          description: itemDescription.trim() || undefined,
          quantity: qty,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add item');
      }

      const json = await res.json();
      const newItem = json.data;

      // Upload photo if one was selected
      if (itemPhoto) {
        const formData = new FormData();
        formData.append('photo', itemPhoto);

        const photoRes = await fetch(`/api/items/${newItem.id}/photos`, {
          method: 'POST',
          body: formData,
        });

        if (!photoRes.ok) {
          const photoErr = await photoRes.json();
          showToast(
            `Item "${newItem.name}" added, but photo upload failed: ${photoErr.error || 'Unknown error'}. You can add a photo from the item page.`,
            'error'
          );
        } else {
          showToast(`Item "${newItem.name}" added with photo!`, 'success');
        }
      } else {
        showToast(`Item "${newItem.name}" added successfully!`, 'success');
      }

      resetItemForm();
      setShowAddItemForm(false);
      await fetchTote();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add item', 'error');
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteTote = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/totes/${toteId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete tote');
      }

      const json = await res.json();
      showToast(json.message || 'Tote deleted successfully', 'success');
      setShowDeleteConfirm(false);

      // Navigate back to totes list after a brief delay so toast is visible
      setTimeout(() => {
        router.push('/totes');
      }, 500);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete tote', 'error');
      setDeleting(false);
    }
  };

  const promptDeleteItem = (e: React.MouseEvent, itemId: number, itemName: string) => {
    e.preventDefault(); // Prevent navigating to item detail page
    e.stopPropagation();
    setDeletingItemId(itemId);
    setDeletingItemName(itemName);
    setShowDeleteItemConfirm(true);
  };

  const handleDeleteItem = async () => {
    if (!deletingItemId) return;
    setDeletingItemLoading(true);
    try {
      const res = await fetch(`/api/items/${deletingItemId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete item');
      }

      const json = await res.json();
      showToast(json.message || 'Item deleted successfully', 'success');
      setShowDeleteItemConfirm(false);
      setDeletingItemId(null);
      setDeletingItemName('');
      await fetchTote();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete item', 'error');
    } finally {
      setDeletingItemLoading(false);
    }
  };

  const handlePrintLabel = () => {
    window.print();
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

  if (loading) {
    return (
      <main className="page-container">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading tote...</p>
        </div>
      </main>
    );
  }

  if (error || !tote) {
    const isNotFound = error === 'Tote not found' || (!tote && !error);
    return (
      <main className="page-container">
        {isNotFound ? (
          <div className="error-state">
            <AlertTriangle size={48} className="error-icon" />
            <h2>Tote Not Found</h2>
            <p>The tote you&rsquo;re looking for doesn&rsquo;t exist or may have been deleted.</p>
            <Link href="/totes" className="btn btn-secondary">
              <ArrowLeft size={16} />
              Back to Totes
            </Link>
          </div>
        ) : (
          <ErrorDisplay error={error || 'Unknown error'} onRetry={fetchTote} retryLabel="Retry" />
        )}
      </main>
    );
  }

  return (
    <main className="page-container">
      {/* Toast notification */}
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

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => { if (!deleting) setShowDeleteConfirm(false); }}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header modal-header-danger">
              <div className="modal-header-icon-title">
                <div className="confirm-icon-danger">
                  <AlertTriangle size={24} />
                </div>
                <h2>Delete Tote</h2>
              </div>
              <button
                className="modal-close"
                onClick={() => { if (!deleting) setShowDeleteConfirm(false); }}
                aria-label="Close"
                disabled={deleting}
              >
                <X size={20} />
              </button>
            </div>
            <div className="confirm-body">
              <p>
                Are you sure you want to delete <strong>&ldquo;{tote.name}&rdquo;</strong>?
              </p>
              {tote.item_count > 0 && (
                <div className="confirm-warning">
                  <AlertTriangle size={16} />
                  <span>
                    This tote contains <strong>{tote.item_count} item{tote.item_count !== 1 ? 's' : ''}</strong> that will also be permanently deleted.
                  </span>
                </div>
              )}
              <p className="confirm-text-muted">This action cannot be undone.</p>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteTote}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Tote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Dialog */}
      {showDeleteItemConfirm && (
        <div className="modal-overlay" onClick={() => { if (!deletingItemLoading) { setShowDeleteItemConfirm(false); setDeletingItemId(null); setDeletingItemName(''); } }}>
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
                onClick={() => { if (!deletingItemLoading) { setShowDeleteItemConfirm(false); setDeletingItemId(null); setDeletingItemName(''); } }}
                aria-label="Close"
                disabled={deletingItemLoading}
              >
                <X size={20} />
              </button>
            </div>
            <div className="confirm-body">
              <p>
                Are you sure you want to delete <strong>&ldquo;{deletingItemName}&rdquo;</strong>?
              </p>
              <p className="confirm-text-muted">This will also remove all photos and metadata associated with this item. This action cannot be undone.</p>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setShowDeleteItemConfirm(false); setDeletingItemId(null); setDeletingItemName(''); }}
                disabled={deletingItemLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteItem}
                disabled={deletingItemLoading}
              >
                {deletingItemLoading ? 'Deleting...' : 'Delete Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/' },
        { label: 'Totes', href: '/totes' },
        { label: tote.name },
      ]} />

      {/* Tote header */}
      <div className="tote-detail-header">
        <div className="tote-detail-title-row">
          <div className="tote-detail-icon">
            <Box size={28} />
          </div>
          <div>
            <h1>{tote.name}</h1>
            <span className="tote-detail-id">ID: {tote.id}</span>
          </div>
        </div>
        <div className="tote-detail-actions">
          <button
            className="btn btn-secondary"
            onClick={openEditForm}
            title="Edit tote"
          >
            <Pencil size={16} />
            <span>Edit Tote</span>
          </button>
          <button
            className="btn btn-danger"
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete tote"
          >
            <Trash2 size={16} />
            <span>Delete Tote</span>
          </button>
        </div>
      </div>

      {/* Tote metadata */}
      <div className="tote-detail-meta-grid">
        <div className="tote-detail-meta-card">
          <div className="meta-card-icon"><MapPin size={18} /></div>
          <div>
            <span className="meta-card-label">Location</span>
            <span className="meta-card-value">{tote.location}</span>
          </div>
        </div>
        {tote.owner && (
          <div className="tote-detail-meta-card">
            <div className="meta-card-icon"><User size={18} /></div>
            <div>
              <span className="meta-card-label">Owner</span>
              <span className="meta-card-value">{tote.owner}</span>
            </div>
          </div>
        )}
        <div className="tote-detail-meta-card">
          <div className="meta-card-icon"><Package size={18} /></div>
          <div>
            <span className="meta-card-label">Items</span>
            <span className="meta-card-value">{tote.item_count}</span>
          </div>
        </div>
        <div className="tote-detail-meta-card">
          <div className="meta-card-icon"><Calendar size={18} /></div>
          <div>
            <span className="meta-card-label">Created</span>
            <span className="meta-card-value">{formatDate(tote.created_at)}</span>
          </div>
        </div>
        <div className="tote-detail-meta-card">
          <div className="meta-card-icon"><Calendar size={18} /></div>
          <div>
            <span className="meta-card-label">Updated</span>
            <span className="meta-card-value">{formatDate(tote.updated_at)}</span>
          </div>
        </div>
        {tote.size && (
          <div className="tote-detail-meta-card">
            <div className="meta-card-icon"><Box size={18} /></div>
            <div>
              <span className="meta-card-label">Size</span>
              <span className="meta-card-value">{tote.size}</span>
            </div>
          </div>
        )}
        {tote.color && (
          <div className="tote-detail-meta-card">
            <div className="meta-card-icon">
              <div className="color-swatch" style={{ background: tote.color.toLowerCase() }} />
            </div>
            <div>
              <span className="meta-card-label">Color</span>
              <span className="meta-card-value">{tote.color}</span>
            </div>
          </div>
        )}
      </div>

      {/* Edit Tote Modal */}
      {showEditForm && (
        <div className="modal-overlay" onClick={() => { if (!editingTote) { setShowEditForm(false); } }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Tote</h2>
              <button
                className="modal-close"
                onClick={() => { if (!editingTote) setShowEditForm(false); }}
                aria-label="Close"
                disabled={editingTote}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleEditTote} className="tote-form">
                <div className="form-group">
                  <label htmlFor="edit-tote-name" className="form-label">
                    Name <span className="form-required">*</span>
                  </label>
                  <input
                    id="edit-tote-name"
                    type="text"
                    className={`form-input ${editFormErrors.name ? 'form-input-error' : ''}`}
                    placeholder="e.g., Holiday Decorations"
                    value={editName}
                    onChange={(e) => { setEditName(e.target.value); setEditFormErrors(prev => ({ ...prev, name: undefined })); }}
                    autoFocus
                    data-1p-ignore
                  />
                  {editFormErrors.name && <span className="form-error-text">{editFormErrors.name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="edit-tote-location" className="form-label">
                    Location <span className="form-required">*</span>
                  </label>
                  <input
                    id="edit-tote-location"
                    type="text"
                    className={`form-input ${editFormErrors.location ? 'form-input-error' : ''}`}
                    placeholder="e.g., Garage Shelf A"
                    value={editLocation}
                    onChange={(e) => { setEditLocation(e.target.value); setEditFormErrors(prev => ({ ...prev, location: undefined })); }}
                  />
                  {editFormErrors.location && <span className="form-error-text">{editFormErrors.location}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="edit-tote-size" className="form-label">
                    Size
                  </label>
                  <input
                    id="edit-tote-size"
                    type="text"
                    className="form-input"
                    placeholder="e.g., Large, 50L"
                    value={editSize}
                    onChange={(e) => setEditSize(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-tote-color" className="form-label">
                    Color
                  </label>
                  <input
                    id="edit-tote-color"
                    type="text"
                    className="form-input"
                    placeholder="e.g., Blue, Red"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-tote-owner" className="form-label">
                    Owner
                  </label>
                  <input
                    id="edit-tote-owner"
                    type="text"
                    className="form-input"
                    placeholder="e.g., John, Family"
                    value={editOwner}
                    onChange={(e) => setEditOwner(e.target.value)}
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowEditForm(false)}
                    disabled={editingTote}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={editingTote}
                  >
                    {editingTote ? <><Loader2 size={16} className="spinner-icon" /> Saving...</> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemForm && (
        <div className="modal-overlay" onClick={() => { setShowAddItemForm(false); resetItemForm(); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Item to Tote</h2>
              <button
                className="modal-close"
                onClick={() => { setShowAddItemForm(false); resetItemForm(); }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddItem} className="tote-form" noValidate>
                <div className="form-group">
                  <label htmlFor="item-name" className="form-label">
                    Name <span className="form-required">*</span>
                  </label>
                  <input
                    id="item-name"
                    type="text"
                    className={`form-input ${itemFormErrors.name ? 'form-input-error' : ''}`}
                    placeholder="e.g., Christmas Lights"
                    value={itemName}
                    onChange={(e) => { setItemName(e.target.value); setItemFormErrors(prev => ({ ...prev, name: undefined })); }}
                    autoFocus
                    data-1p-ignore
                  />
                  {itemFormErrors.name && <span className="form-error-text">{itemFormErrors.name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="item-description" className="form-label">
                    Description
                  </label>
                  <textarea
                    id="item-description"
                    className="form-input"
                    placeholder="e.g., Multicolor LED string lights, 100ft"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="item-quantity" className="form-label">
                    Quantity
                  </label>
                  <input
                    id="item-quantity"
                    type="number"
                    className={`form-input ${itemFormErrors.quantity ? 'form-input-error' : ''}`}
                    min="1"
                    step="1"
                    value={itemQuantity}
                    onChange={(e) => { setItemQuantity(e.target.value); setItemFormErrors(prev => ({ ...prev, quantity: undefined })); }}
                  />
                  {itemFormErrors.quantity && <span className="form-error-text">{itemFormErrors.quantity}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Photo (optional)</label>
                  <input
                    ref={addItemFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAddItemFileChange}
                    style={{ display: 'none' }}
                  />
                  <div className="add-item-photo-buttons">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        if (addItemFileInputRef.current) {
                          addItemFileInputRef.current.removeAttribute('capture');
                          addItemFileInputRef.current.click();
                        }
                      }}
                      disabled={addingItem}
                    >
                      <Upload size={16} />
                      {itemPhoto ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary add-item-camera-btn"
                      onClick={() => {
                        if (addItemFileInputRef.current) {
                          addItemFileInputRef.current.setAttribute('capture', 'environment');
                          addItemFileInputRef.current.click();
                        }
                      }}
                      disabled={addingItem}
                    >
                      <Camera size={16} />
                      Take Photo
                    </button>
                  </div>
                  {itemPhotoError && <span className="form-error-text">{itemPhotoError}</span>}
                  {itemPhotoPreviewUrl && (
                    <div className="add-item-photo-preview">
                      <img
                        src={itemPhotoPreviewUrl}
                        alt="Selected photo preview"
                        className="add-item-photo-preview-img"
                      />
                      <button
                        type="button"
                        className="add-item-photo-remove"
                        onClick={() => {
                          if (itemPhotoPreviewUrl) URL.revokeObjectURL(itemPhotoPreviewUrl);
                          setItemPhoto(null);
                          setItemPhotoPreviewUrl(null);
                          setItemPhotoError(null);
                        }}
                        aria-label="Remove selected photo"
                        disabled={addingItem}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setShowAddItemForm(false); resetItemForm(); }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={addingItem}
                  >
                    {addingItem ? <><Loader2 size={16} className="spinner-icon" /> Adding...</> : 'Add Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Items section */}
      <div className="tote-detail-section">
        <div className="section-header">
          <h2>Items ({tote.item_count})</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddItemForm(true)}
          >
            <Plus size={18} />
            <span>Add Item</span>
          </button>
        </div>
        {tote.items.length > 1 && (
          <div className="sort-controls">
            <span className="sort-label">Sort by:</span>
            {([
              { field: 'name' as ItemSortField, label: 'Name' },
              { field: 'quantity' as ItemSortField, label: 'Quantity' },
              { field: 'created_at' as ItemSortField, label: 'Date Added' },
            ]).map(({ field, label }) => (
              <button
                key={field}
                className={`sort-btn ${itemSortBy === field ? 'sort-btn-active' : ''}`}
                onClick={() => handleItemSort(field)}
              >
                {label}
                {itemSortBy === field && (
                  itemSortOrder === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />
                )}
              </button>
            ))}
          </div>
        )}
        {tote.items.length === 0 ? (
          <div className="empty-state-small">
            <Package size={32} className="empty-icon" />
            <p>No items in this tote yet.</p>
            <button
              className="btn btn-primary"
              onClick={() => setShowAddItemForm(true)}
              style={{ marginTop: '0.75rem' }}
            >
              <Plus size={18} />
              <span>Add First Item</span>
            </button>
          </div>
        ) : (
          <div className="items-list">
            {getSortedItems(tote.items).map((item) => (
              <Link key={item.id} href={`/totes/${toteId}/items/${item.id}`} className="item-row item-row-link">
                <div className="item-row-thumbnail">
                  {item.photos && item.photos.length > 0 ? (
                    <img
                      src={`/api/photos/${item.photos[0].id}/thumbnail`}
                      alt={`${item.name} thumbnail`}
                      className="item-thumbnail-img"
                    />
                  ) : (
                    <div className="item-thumbnail-placeholder">
                      <ImageIcon size={20} />
                    </div>
                  )}
                </div>
                <div className="item-row-info">
                  <span className="item-name">{item.name}</span>
                  {item.description && <span className="item-desc">{item.description}</span>}
                </div>
                <div className="item-row-actions">
                  <span className="item-qty">Qty: {item.quantity}</span>
                  <button
                    className="btn-icon-danger"
                    onClick={(e) => promptDeleteItem(e, item.id, item.name)}
                    title="Delete item"
                    aria-label={`Delete item ${item.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* QR Code Section */}
      <div className="tote-detail-section qr-code-section">
        <div className="section-header">
          <h2><QrCode size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />QR Code</h2>
          <button
            className="btn btn-secondary"
            onClick={handlePrintLabel}
            title="Print QR label"
          >
            <Printer size={16} />
            <span>Print Label</span>
          </button>
        </div>
        <div className="qr-label-size-selector">
          <span className="qr-size-label">Label Size:</span>
          <div className="qr-size-options">
            {(Object.keys(QR_SIZES) as QrLabelSize[]).map((size) => (
              <button
                key={size}
                className={`qr-size-btn ${qrLabelSize === size ? 'qr-size-btn-active' : ''}`}
                onClick={() => setQrLabelSize(size)}
                title={`${QR_SIZES[size].label} QR label`}
              >
                {QR_SIZES[size].label}
              </button>
            ))}
          </div>
        </div>
        <div className="qr-code-display">
          <div className="qr-code-image-container">
            <img
              src={`/api/totes/${toteId}/qr`}
              alt={`QR code for tote ${tote.id}`}
              className="qr-code-image"
              style={{
                width: `${QR_SIZES[qrLabelSize].display}px`,
                height: `${QR_SIZES[qrLabelSize].display}px`,
              }}
            />
          </div>
          <p className="qr-code-tote-id">{tote.id}</p>
          <p className="qr-code-url-hint">Scan to open this tote&rsquo;s page</p>
        </div>
      </div>

      {/* Print-only QR Label (hidden on screen, visible when printing) */}
      <div className="print-label-container" aria-hidden="true">
        <div className={`print-label print-label-${qrLabelSize}`}>
          <div className="print-label-qr">
            <img
              src={`/api/totes/${toteId}/qr`}
              alt={`QR code for tote ${tote.id}`}
              style={{
                width: `${QR_SIZES[qrLabelSize].print}px`,
                height: `${QR_SIZES[qrLabelSize].print}px`,
              }}
            />
          </div>
          <div className="print-label-id">{tote.id}</div>
          <div className="print-label-name">{tote.name}</div>
          <div className="print-label-location">{tote.location}</div>
        </div>
      </div>
    </main>
  );
}
