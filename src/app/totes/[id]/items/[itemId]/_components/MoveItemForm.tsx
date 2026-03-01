'use client';

import { useState, useEffect } from 'react';
import { ArrowRightLeft, X, Package } from 'lucide-react';
import { Item, Tote } from '@/types';

interface ItemDetail extends Item {
  tote_name: string;
  tote_location: string;
}

interface MoveItemFormProps {
  item: ItemDetail;
  toteId: string;
  itemId: string;
  onClose: () => void;
  onMoved: (targetToteId: string) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export default function MoveItemForm({ item, toteId, itemId, onClose, onMoved, showToast }: MoveItemFormProps) {
  const [allTotes, setAllTotes] = useState<Tote[]>([]);
  const [selectedToteId, setSelectedToteId] = useState<string>('');
  const [movingItem, setMovingItem] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [loadingTotes, setLoadingTotes] = useState(true);

  // Fetch totes on mount
  useEffect(() => {
    const fetchTotes = async () => {
      setLoadingTotes(true);
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
    fetchTotes();
  }, [toteId]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !movingItem) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [movingItem, onClose]);

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
      showToast(json.message || 'Item moved successfully!', 'success');
      onMoved(selectedToteId);
    } catch {
      setMoveError('Failed to move item. Please try again.');
    } finally {
      setMovingItem(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => { if (!movingItem) onClose(); }}>
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
            onClick={() => { if (!movingItem) onClose(); }}
            aria-label="Close"
            disabled={movingItem}
          >
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
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
              <label htmlFor="move-destination-tote" className="form-label">Destination Tote <span className="form-required">*</span></label>
              <select
                id="move-destination-tote"
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
        <div className="modal-footer">
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onClose()}
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
    </div>
  );
}
