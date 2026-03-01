'use client';

import { useState, useEffect } from 'react';
import { Copy, X, Package } from 'lucide-react';
import { Item, Tote } from '@/types';

interface ItemDetail extends Item {
  tote_name: string;
  tote_location: string;
}

interface CopyItemFormProps {
  item: ItemDetail;
  toteId: string;
  itemId: string;
  onClose: () => void;
  onCopied: (newToteId: string, newItemId: number) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export default function CopyItemForm({ item, toteId, itemId, onClose, onCopied, showToast }: CopyItemFormProps) {
  const [copyTotes, setCopyTotes] = useState<Tote[]>([]);
  const [copyTargetToteId, setCopyTargetToteId] = useState<string>('');
  const [duplicatingItem, setDuplicatingItem] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [loadingCopyTotes, setLoadingCopyTotes] = useState(true);

  // Fetch totes on mount
  useEffect(() => {
    const fetchTotes = async () => {
      setLoadingCopyTotes(true);
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
    fetchTotes();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !duplicatingItem) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [duplicatingItem, onClose]);

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
      showToast(json.message || 'Item copied successfully!', 'success');
      onCopied(newItem.tote_id, newItem.id);
    } catch {
      setCopyError('Failed to copy item. Please try again.');
    } finally {
      setDuplicatingItem(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => { if (!duplicatingItem) onClose(); }}>
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
            onClick={() => { if (!duplicatingItem) onClose(); }}
            aria-label="Close"
            disabled={duplicatingItem}
          >
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
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
              <label htmlFor="copy-destination-tote" className="form-label">Destination Tote <span className="form-required">*</span></label>
              <select
                id="copy-destination-tote"
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
        <div className='modal-footer'>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onClose()}
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
    </div>
  );
}
