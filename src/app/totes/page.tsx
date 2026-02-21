'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Box, MapPin, User, ArrowUpDown, X, Check } from 'lucide-react';
import { Tote } from '@/types';

interface ToteWithCount extends Tote {
  item_count: number;
}

type SortField = 'name' | 'location' | 'owner' | 'created_at';
type SortOrder = 'asc' | 'desc';

export default function TotesPage() {
  const searchParams = useSearchParams();
  const [totes, setTotes] = useState<ToteWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Auto-open create form when ?create=true is in the URL (from welcome screen)
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreateForm(true);
    }
  }, [searchParams]);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formSize, setFormSize] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formOwner, setFormOwner] = useState('');
  const [creating, setCreating] = useState(false);
  const [formErrors, setFormErrors] = useState<{ name?: string; location?: string }>({});

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchTotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/totes?sort=${sortBy}&order=${sortOrder}`);
      if (!res.ok) throw new Error('Failed to fetch totes');
      const json = await res.json();
      setTotes(json.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load totes');
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder]);

  useEffect(() => {
    fetchTotes();
  }, [fetchTotes]);

  const resetForm = () => {
    setFormName('');
    setFormLocation('');
    setFormSize('');
    setFormColor('');
    setFormOwner('');
    setFormErrors({});
  };

  const handleCreateTote = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const errors: { name?: string; location?: string } = {};
    if (!formName.trim()) errors.name = 'Name is required';
    if (!formLocation.trim()) errors.location = 'Location is required';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setCreating(true);
    setFormErrors({});

    try {
      const res = await fetch('/api/totes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          location: formLocation.trim(),
          size: formSize.trim() || undefined,
          color: formColor.trim() || undefined,
          owner: formOwner.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create tote');
      }

      const json = await res.json();
      const newTote = json.data;

      showToast(`Tote "${newTote.name}" created successfully! (ID: ${newTote.id})`, 'success');
      resetForm();
      setShowCreateForm(false);
      await fetchTotes();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create tote', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'Z');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1>Totes</h1>
          <p>Manage your totes and their contents.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          <Plus size={18} />
          <span>Add Tote</span>
        </button>
      </div>

      {/* Create Tote Modal */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={() => { setShowCreateForm(false); resetForm(); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Tote</h2>
              <button
                className="modal-close"
                onClick={() => { setShowCreateForm(false); resetForm(); }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTote} className="tote-form">
              <div className="form-group">
                <label htmlFor="tote-name" className="form-label">
                  Name <span className="form-required">*</span>
                </label>
                <input
                  id="tote-name"
                  type="text"
                  className={`form-input ${formErrors.name ? 'form-input-error' : ''}`}
                  placeholder="e.g., Holiday Decorations"
                  value={formName}
                  onChange={(e) => { setFormName(e.target.value); setFormErrors(prev => ({ ...prev, name: undefined })); }}
                  autoFocus
                />
                {formErrors.name && <span className="form-error-text">{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="tote-location" className="form-label">
                  Location <span className="form-required">*</span>
                </label>
                <input
                  id="tote-location"
                  type="text"
                  className={`form-input ${formErrors.location ? 'form-input-error' : ''}`}
                  placeholder="e.g., Garage Shelf A"
                  value={formLocation}
                  onChange={(e) => { setFormLocation(e.target.value); setFormErrors(prev => ({ ...prev, location: undefined })); }}
                />
                {formErrors.location && <span className="form-error-text">{formErrors.location}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="tote-size" className="form-label">Size</label>
                  <input
                    id="tote-size"
                    type="text"
                    className="form-input"
                    placeholder="e.g., Large"
                    value={formSize}
                    onChange={(e) => setFormSize(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="tote-color" className="form-label">Color</label>
                  <input
                    id="tote-color"
                    type="text"
                    className="form-input"
                    placeholder="e.g., Blue"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="tote-owner" className="form-label">Owner</label>
                <input
                  id="tote-owner"
                  type="text"
                  className="form-input"
                  placeholder="e.g., John"
                  value={formOwner}
                  onChange={(e) => setFormOwner(e.target.value)}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setShowCreateForm(false); resetForm(); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Tote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sort controls */}
      {!loading && totes.length > 0 && (
        <div className="sort-controls">
          <span className="sort-label">Sort by:</span>
          {(['name', 'location', 'owner', 'created_at'] as SortField[]).map((field) => (
            <button
              key={field}
              className={`sort-btn ${sortBy === field ? 'sort-btn-active' : ''}`}
              onClick={() => handleSort(field)}
            >
              {field === 'created_at' ? 'Date' : field.charAt(0).toUpperCase() + field.slice(1)}
              {sortBy === field && (
                <ArrowUpDown size={14} className={sortOrder === 'desc' ? 'sort-icon-desc' : 'sort-icon-asc'} />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading totes...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="error-state">
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={fetchTotes}>Retry</button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && totes.length === 0 && (
        <div className="empty-state">
          <Box size={48} className="empty-icon" />
          <h2>No totes yet</h2>
          <p>Create your first tote to start organizing your items.</p>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus size={18} />
            <span>Create First Tote</span>
          </button>
        </div>
      )}

      {/* Tote list */}
      {!loading && !error && totes.length > 0 && (
        <div className="tote-grid">
          {totes.map((tote) => (
            <Link key={tote.id} href={`/totes/${tote.id}`} className="tote-card">
              <div className="tote-card-header">
                <div className="tote-card-icon">
                  <Box size={20} />
                </div>
                <span className="tote-id">{tote.id}</span>
              </div>
              <h3 className="tote-card-name">{tote.name}</h3>
              <div className="tote-card-meta">
                <span className="tote-meta-item">
                  <MapPin size={14} />
                  {tote.location}
                </span>
                {tote.owner && (
                  <span className="tote-meta-item">
                    <User size={14} />
                    {tote.owner}
                  </span>
                )}
              </div>
              <div className="tote-card-footer">
                <span className="tote-item-count">
                  {tote.item_count} {tote.item_count === 1 ? 'item' : 'items'}
                </span>
                <span className="tote-date">{formatDate(tote.created_at)}</span>
              </div>
              {(tote.size || tote.color) && (
                <div className="tote-card-tags">
                  {tote.size && <span className="tote-tag">{tote.size}</span>}
                  {tote.color && <span className="tote-tag">{tote.color}</span>}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
