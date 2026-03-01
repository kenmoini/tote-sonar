'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Tote, Item } from '@/types';

interface ToteDetail extends Tote {
  items: Item[];
  item_count: number;
}

interface EditToteFormProps {
  tote: ToteDetail;
  toteId: string;
  onClose: () => void;
  onSaved: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export default function EditToteForm({ tote, toteId, onClose, onSaved, showToast }: EditToteFormProps) {
  const [editName, setEditName] = useState(tote.name);
  const [editLocation, setEditLocation] = useState(tote.location);
  const [editSize, setEditSize] = useState(tote.size || '');
  const [editColor, setEditColor] = useState(tote.color || '');
  const [editOwner, setEditOwner] = useState(tote.owner || '');
  const [editingTote, setEditingTote] = useState(false);
  const [editFormErrors, setEditFormErrors] = useState<{ name?: string; location?: string }>({});

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !editingTote) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingTote, onClose]);

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

      onSaved();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update tote', 'error');
    } finally {
      setEditingTote(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => { if (!editingTote) { onClose(); } }}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Tote</h2>
          <button
            className="modal-close"
            onClick={() => { if (!editingTote) onClose(); }}
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
                onClick={() => onClose()}
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
  );
}
