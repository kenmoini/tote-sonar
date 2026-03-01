'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Package, Hash, Calendar, FileText, Pencil, Trash2, ArrowRightLeft, Copy, ChevronDown, ChevronUp, AlertTriangle, X } from 'lucide-react';
import { Item } from '@/types';
import { formatDate } from '@/lib/formatDate';

interface ItemDetail extends Item {
  tote_name: string;
  tote_location: string;
}

interface ItemHeaderProps {
  item: ItemDetail;
  toteId: string;
  itemId: string;
  onEdit: () => void;
  onMove: () => void;
  onCopy: () => void;
  onDeleted: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export default function ItemHeader({ item, toteId, itemId, onEdit, onMove, onCopy, onDeleted, showToast }: ItemHeaderProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingItem, setDeletingItem] = useState(false);
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

  // Close delete confirm on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm && !deletingItem) setShowDeleteConfirm(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteConfirm, deletingItem]);

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
      showToast(json.message || 'Item deleted successfully', 'success');
      setShowDeleteConfirm(false);
      onDeleted();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete item', 'error');
      setDeletingItem(false);
    }
  };

  return (
    <>
      {/* Delete Item Confirmation Dialog */}
      {showDeleteConfirm && (
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
            <div className="confirm-body modal-body">
              <p>
                Are you sure you want to delete <strong>&ldquo;{item.name}&rdquo;</strong>?
              </p>
              <p className="confirm-text-muted">This will also remove all photos and metadata associated with this item. This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
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
        </div>
      )}

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
                Edit Item
              </button>
              <button
                className="actions-dropdown-item"
                onClick={() => { setActionsOpen(false); onMove(); }}
              >
                <ArrowRightLeft size={16} />
                Move
              </button>
              <button
                className="actions-dropdown-item"
                onClick={() => { setActionsOpen(false); onCopy(); }}
              >
                <Copy size={16} />
                Copy
              </button>
              <button
                className="actions-dropdown-item actions-dropdown-item-danger"
                onClick={() => { setActionsOpen(false); setShowDeleteConfirm(true); }}
              >
                <Trash2 size={16} />
                Delete Item
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Item metadata grid */}
      <div className="item-detail-meta-grid">
        <div className="tote-detail-meta-card">
          <div className="meta-card-icon"><Hash size={18} /></div>
          <div>
            <span className="meta-card-label">Quantity</span>
            <span className="meta-card-value">{item.quantity}</span>
          </div>
        </div>
        <div className={`item-detail-extra ${showMoreDetails ? 'item-detail-extra-open' : ''}`}>
          <div className="tote-detail-meta-card">
            <div className="meta-card-icon"><Calendar size={18} /></div>
            <div>
              <span className="meta-card-label">Added</span>
              <span className="meta-card-value">{formatDate(item.created_at)}</span>
            </div>
          </div>
          <div className="tote-detail-meta-card">
            <div className="meta-card-icon"><Calendar size={18} /></div>
            <div>
              <span className="meta-card-label">Updated</span>
              <span className="meta-card-value">{formatDate(item.updated_at)}</span>
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
