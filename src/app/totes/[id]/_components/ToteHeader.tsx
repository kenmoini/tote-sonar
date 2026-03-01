'use client';

import { useState, useEffect, useRef } from 'react';
import { Box, MapPin, User, Calendar, Package, Pencil, Trash2, ChevronDown, ChevronUp, AlertTriangle, X, Loader2 } from 'lucide-react';
import { Tote, Item } from '@/types';
import { formatDate } from '@/lib/formatDate';

interface ToteDetail extends Tote {
  items: Item[];
  item_count: number;
}

interface ToteHeaderProps {
  tote: ToteDetail;
  toteId: string;
  onEdit: () => void;
  onDeleted: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export default function ToteHeader({ tote, toteId, onEdit, onDeleted, showToast }: ToteHeaderProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Close actions dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setActionsOpen(false);
      }
    };
    if (actionsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionsOpen]);

  // Close delete confirm on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm && !deleting) setShowDeleteConfirm(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteConfirm, deleting]);

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
      onDeleted();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete tote', 'error');
      setDeleting(false);
    }
  };

  return (
    <>
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
            <div className="modal-body confirm-body">
              {tote.item_count > 0 && (
                <div className="confirm-warning">
                  <AlertTriangle size={16} />
                  <span>
                    This tote contains <strong>{tote.item_count} item{tote.item_count !== 1 ? 's' : ''}</strong> that will also be permanently deleted.
                  </span>
                </div>
              )}
              <p>
                Are you sure you want to delete <strong>&ldquo;{tote.name}&rdquo;</strong>?
              </p>
              <p className="confirm-text-muted">This action cannot be undone.</p>
            </div>
            <div className='modal-footer'>
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
                  {deleting ? <><Loader2 size={16} className="spinner-icon" /> Deleting...</> : 'Delete Tote'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
        <div className="actions-dropdown" ref={actionsRef}>
          <button
            className="btn btn-secondary"
            onClick={() => setActionsOpen(!actionsOpen)}
            aria-expanded={actionsOpen}
            aria-haspopup="true"
          >
            <ChevronDown size={18} />
            <span>Actions</span>
          </button>
          {actionsOpen && (
            <div className="actions-dropdown-menu">
              <button
                className="actions-dropdown-item"
                onClick={() => { setActionsOpen(false); onEdit(); }}
              >
                <Pencil size={16} />
                Edit Tote
              </button>
              <button
                className="actions-dropdown-item actions-dropdown-item-danger"
                onClick={() => { setActionsOpen(false); setShowDeleteConfirm(true); }}
              >
                <Trash2 size={16} />
                Delete Tote
              </button>
            </div>
          )}
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
        <div className={`item-detail-extra ${showMoreDetails ? 'item-detail-extra-open' : ''}`}>
          <div className="tote-detail-meta-card">
            <div className="meta-card-icon"><Package size={18} /></div>
            <div>
              <span className="meta-card-label">Items</span>
              <span className="meta-card-value">{tote.item_count}</span>
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
        <button
          className="item-detail-more-toggle"
          onClick={() => setShowMoreDetails(!showMoreDetails)}
        >
          {showMoreDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showMoreDetails ? 'Show less' : 'Show more details'}
        </button>
      </div>
    </>
  );
}
