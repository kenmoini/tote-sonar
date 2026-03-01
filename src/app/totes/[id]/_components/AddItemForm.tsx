'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Upload, Camera } from 'lucide-react';

interface AddItemFormProps {
  toteId: string;
  maxUploadSize: number;
  onClose: () => void;
  onAdded: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export default function AddItemForm({ toteId, maxUploadSize, onClose, onAdded, showToast }: AddItemFormProps) {
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [addingItem, setAddingItem] = useState(false);
  const [itemFormErrors, setItemFormErrors] = useState<{ name?: string; quantity?: string }>({});
  const [itemPhoto, setItemPhoto] = useState<File | null>(null);
  const [itemPhotoPreviewUrl, setItemPhotoPreviewUrl] = useState<string | null>(null);
  const [itemPhotoError, setItemPhotoError] = useState<string | null>(null);
  const addItemFileInputRef = useRef<HTMLInputElement>(null);

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

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        resetItemForm();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (itemPhotoPreviewUrl) {
        URL.revokeObjectURL(itemPhotoPreviewUrl);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      onAdded();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add item', 'error');
    } finally {
      setAddingItem(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => { onClose(); resetItemForm(); }}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Item to Tote</h2>
          <button
            className="modal-close"
            onClick={() => { onClose(); resetItemForm(); }}
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
                onClick={() => { onClose(); resetItemForm(); }}
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
  );
}
