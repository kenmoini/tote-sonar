'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Item } from '@/types';

interface ItemDetail extends Item {
  tote_name: string;
  tote_location: string;
}

interface EditItemFormProps {
  item: ItemDetail;
  toteId: string;
  itemId: string;
  onClose: () => void;
  onSaved: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export default function EditItemForm({ item, itemId, onClose, onSaved, showToast }: EditItemFormProps) {
  const [editName, setEditName] = useState(item.name);
  const [editDescription, setEditDescription] = useState(item.description || '');
  const [editQuantity, setEditQuantity] = useState(item.quantity);
  const [editingItem, setEditingItem] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !editingItem) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingItem, onClose]);

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

      showToast('Item updated successfully!', 'success');
      onSaved();
    } catch {
      setEditError('Failed to update item. Please try again.');
    } finally {
      setEditingItem(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => { if (!editingItem) onClose(); }}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Item</h2>
          <button
            className="modal-close"
            onClick={() => { if (!editingItem) onClose(); }}
            aria-label="Close"
            disabled={editingItem}
          >
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="edit-item-name" className="form-label">Name <span className="form-required">*</span></label>
            <input
              id="edit-item-name"
              type="text"
              className={`form-input ${editError && !editName.trim() ? 'form-input-error' : ''}`}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Item name"
              disabled={editingItem}
              autoFocus
              data-1p-ignore
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-item-description" className="form-label">Description</label>
            <textarea
              id="edit-item-description"
              className="form-input form-textarea"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Item description (optional)"
              disabled={editingItem}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-item-quantity" className="form-label">Quantity</label>
            <input
              id="edit-item-quantity"
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
        </div>
        <div className='modal-footer'>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onClose()}
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
    </div>
  );
}
