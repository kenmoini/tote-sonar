'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Box, MapPin, User, ArrowLeft, Package, Calendar, Plus, X, Check } from 'lucide-react';
import { Tote, Item } from '@/types';
import Breadcrumb from '@/components/Breadcrumb';

interface ToteDetail extends Tote {
  items: Item[];
  item_count: number;
}

export default function ToteDetailPage() {
  const params = useParams();
  const toteId = params.id as string;
  const [tote, setTote] = useState<ToteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Item form state
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [addingItem, setAddingItem] = useState(false);
  const [itemFormErrors, setItemFormErrors] = useState<{ name?: string }>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const resetItemForm = () => {
    setItemName('');
    setItemDescription('');
    setItemQuantity('1');
    setItemFormErrors({});
  };

  const fetchTote = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/totes/${toteId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Tote not found');
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

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const errors: { name?: string } = {};
    if (!itemName.trim()) errors.name = 'Item name is required';
    if (Object.keys(errors).length > 0) {
      setItemFormErrors(errors);
      return;
    }

    setAddingItem(true);
    setItemFormErrors({});

    try {
      const qty = parseInt(itemQuantity, 10);
      const res = await fetch(`/api/totes/${toteId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: itemName.trim(),
          description: itemDescription.trim() || undefined,
          quantity: isNaN(qty) || qty < 1 ? 1 : qty,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add item');
      }

      const json = await res.json();
      const newItem = json.data;

      showToast(`Item "${newItem.name}" added successfully!`, 'success');
      resetItemForm();
      setShowAddItemForm(false);
      await fetchTote();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add item', 'error');
    } finally {
      setAddingItem(false);
    }
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
    return (
      <main className="page-container">
        <div className="error-state">
          <p>{error || 'Tote not found'}</p>
          <Link href="/totes" className="btn btn-secondary">
            <ArrowLeft size={16} />
            Back to Totes
          </Link>
        </div>
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
            <form onSubmit={handleAddItem} className="tote-form">
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
                  className="form-input"
                  min="1"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                />
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
                  {addingItem ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </form>
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
            {tote.items.map((item) => (
              <Link key={item.id} href={`/totes/${toteId}/items/${item.id}`} className="item-row item-row-link">
                <div className="item-row-info">
                  <span className="item-name">{item.name}</span>
                  {item.description && <span className="item-desc">{item.description}</span>}
                </div>
                <span className="item-qty">Qty: {item.quantity}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
