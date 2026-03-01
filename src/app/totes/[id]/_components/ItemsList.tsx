'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, ArrowUp, ArrowDown, Trash2, AlertTriangle, ImageIcon, Package, X, Loader2 } from 'lucide-react';
import { Item } from '@/types';

type ItemSortField = 'name' | 'created_at' | 'quantity';
type ItemSortOrder = 'asc' | 'desc';

interface ItemsListProps {
  items: Item[];
  toteId: string;
  itemCount: number;
  onAddItem: () => void;
  onItemDeleted: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export default function ItemsList({ items, toteId, itemCount, onAddItem, onItemDeleted, showToast }: ItemsListProps) {
  const [sortField, setSortField] = useState<ItemSortField>('name');
  const [sortOrder, setSortOrder] = useState<ItemSortOrder>('asc');
  const [showDeleteItemConfirm, setShowDeleteItemConfirm] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [deletingItemName, setDeletingItemName] = useState('');
  const [deletingItemLoading, setDeletingItemLoading] = useState(false);

  // Close delete confirm on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteItemConfirm && !deletingItemLoading) {
          setShowDeleteItemConfirm(false);
          setDeletingItemId(null);
          setDeletingItemName('');
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteItemConfirm, deletingItemLoading]);

  const handleItemSort = (field: ItemSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortedItems = (itemsToSort: Item[]): Item[] => {
    return [...itemsToSort].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
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
      return sortOrder === 'asc' ? comparison : -comparison;
    });
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
      onItemDeleted();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete item', 'error');
    } finally {
      setDeletingItemLoading(false);
    }
  };

  return (
    <>
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
            <div className="modal-body confirm-body">
              <p>
                Are you sure you want to delete <strong>&ldquo;{deletingItemName}&rdquo;</strong>?
              </p>
              <p className="confirm-text-muted">This will also remove all photos and metadata associated with this item. This action cannot be undone.</p>
            </div>
            <div className='modal-footer'>
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
                  {deletingItemLoading ? <><Loader2 size={16} className="spinner-icon" /> Deleting...</> : 'Delete Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items section */}
      <div className="tote-detail-section">
        <div className="section-header">
          <h2>Items ({itemCount})</h2>
          <button
            className="btn btn-primary"
            onClick={onAddItem}
          >
            <Plus size={18} />
            <span>Add Item</span>
          </button>
        </div>
        {items.length > 1 && (
          <div className="sort-controls">
            <span className="sort-label">Sort by:</span>
            {([
              { field: 'name' as ItemSortField, label: 'Name' },
              { field: 'quantity' as ItemSortField, label: 'Quantity' },
              { field: 'created_at' as ItemSortField, label: 'Date Added' },
            ]).map(({ field, label }) => (
              <button
                key={field}
                className={`sort-btn ${sortField === field ? 'sort-btn-active' : ''}`}
                onClick={() => handleItemSort(field)}
              >
                {label}
                {sortField === field && (
                  sortOrder === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />
                )}
              </button>
            ))}
          </div>
        )}
        {items.length === 0 ? (
          <div className="empty-state-small">
            <Package size={32} className="empty-icon" />
            <p>No items in this tote yet.</p>
            <button
              className="btn btn-primary"
              onClick={onAddItem}
              style={{ marginTop: '0.75rem' }}
            >
              <Plus size={18} />
              <span>Add First Item</span>
            </button>
          </div>
        ) : (
          <div className="items-list">
            {getSortedItems(items).map((item) => (
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
    </>
  );
}
