'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Tag, Plus, Pencil, X } from 'lucide-react';
import { ItemMetadata } from '@/types';

interface MetadataSectionProps {
  metadata: ItemMetadata[];
  toteId: string;
  itemId: string;
  onMetadataChanged: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export default function MetadataSection({ metadata, itemId, onMetadataChanged, showToast }: MetadataSectionProps) {
  const [showAddMetadata, setShowAddMetadata] = useState(false);
  const [metadataKey, setMetadataKey] = useState('');
  const [metadataValue, setMetadataValue] = useState('');
  const [addingMetadata, setAddingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [suggestedKeys, setSuggestedKeys] = useState<string[]>([]);
  const [showKeySuggestions, setShowKeySuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const keyInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [editingMetadataId, setEditingMetadataId] = useState<number | null>(null);
  const [editMetaKey, setEditMetaKey] = useState('');
  const [editMetaValue, setEditMetaValue] = useState('');
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [editMetaError, setEditMetaError] = useState<string | null>(null);

  const fetchMetadataKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/metadata-keys');
      if (res.ok) {
        const json = await res.json();
        const keys = (json.data || []).map((k: { key_name: string }) => k.key_name);
        setSuggestedKeys(keys);
      }
    } catch {
      // Silently fail - autocomplete is optional
    }
  }, []);

  useEffect(() => {
    if (showAddMetadata) {
      fetchMetadataKeys();
    }
  }, [showAddMetadata, fetchMetadataKeys]);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        keyInputRef.current && !keyInputRef.current.contains(e.target as Node)
      ) {
        setShowKeySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = metadataKey.trim().length > 0
    ? suggestedKeys.filter((key) => key.toLowerCase().includes(metadataKey.toLowerCase().trim()))
    : suggestedKeys;

  const handleKeyInputChange = (value: string) => { setMetadataKey(value); setShowKeySuggestions(true); setSelectedSuggestionIndex(-1); };
  const handleSelectSuggestion = (key: string) => { setMetadataKey(key); setShowKeySuggestions(false); setSelectedSuggestionIndex(-1); };

  const handleAddMetadata = async () => {
    if (!metadataKey.trim() || !metadataValue.trim()) {
      setMetadataError('Both key and value are required');
      return;
    }

    setAddingMetadata(true);
    setMetadataError(null);

    try {
      const res = await fetch(`/api/items/${itemId}/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: metadataKey.trim(), value: metadataValue.trim() }),
      });

      if (!res.ok) {
        const json = await res.json();
        setMetadataError(json.error || 'Failed to add metadata');
        return;
      }

      showToast(`Metadata "${metadataKey.trim()}" added successfully!`, 'success');
      setMetadataKey('');
      setMetadataValue('');
      setShowAddMetadata(false);
      onMetadataChanged();
    } catch {
      setMetadataError('Failed to add metadata. Please try again.');
    } finally {
      setAddingMetadata(false);
    }
  };

  const handleDeleteMetadata = async (metaId: number, metaKeyName: string) => {
    try {
      const res = await fetch(`/api/items/${itemId}/metadata/${metaId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const json = await res.json();
        showToast(json.error || 'Failed to delete metadata', 'error');
        return;
      }

      showToast(`Metadata "${metaKeyName}" removed`, 'success');
      onMetadataChanged();
    } catch {
      showToast('Failed to delete metadata', 'error');
    }
  };

  const startEditMetadata = (meta: ItemMetadata) => { setEditingMetadataId(meta.id); setEditMetaKey(meta.key); setEditMetaValue(meta.value); setEditMetaError(null); };
  const cancelEditMetadata = () => { setEditingMetadataId(null); setEditMetaKey(''); setEditMetaValue(''); setEditMetaError(null); };

  const handleSaveMetadata = async () => {
    if (!editMetaKey.trim() || !editMetaValue.trim()) {
      setEditMetaError('Both key and value are required');
      return;
    }

    setSavingMetadata(true);
    setEditMetaError(null);

    try {
      const res = await fetch(`/api/items/${itemId}/metadata/${editingMetadataId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: editMetaKey.trim(), value: editMetaValue.trim() }),
      });

      if (!res.ok) {
        const json = await res.json();
        setEditMetaError(json.error || 'Failed to update metadata');
        return;
      }

      showToast(`Metadata "${editMetaKey.trim()}" updated successfully!`, 'success');
      setEditingMetadataId(null);
      setEditMetaKey('');
      setEditMetaValue('');
      onMetadataChanged();
    } catch {
      setEditMetaError('Failed to update metadata. Please try again.');
    } finally {
      setSavingMetadata(false);
    }
  };

  return (
    <div className="tote-detail-section">
      <div className="section-header">
        <h2>
          <Tag style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} size={20} />
          Metadata Tags
        </h2>
        {!showAddMetadata && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setShowAddMetadata(true);
              setMetadataError(null);
              setMetadataKey('');
              setMetadataValue('');
            }}
          >
            <Plus size={16} />
            Add Metadata
          </button>
        )}
      </div>
      {showAddMetadata && (
        <div className="metadata-add-form">
          <div className="metadata-add-fields">
            <div className="form-group" style={{ position: 'relative' }}>
              <label htmlFor="add-metadata-key" className="form-label">Key <span className="form-required">*</span></label>
              <input
                id="add-metadata-key"
                ref={keyInputRef}
                type="text"
                className={`form-input ${metadataError ? 'form-input-error' : ''}`}
                placeholder="e.g., Brand, Color, Size"
                value={metadataKey}
                onChange={(e) => handleKeyInputChange(e.target.value)}
                onFocus={() => {
                  setShowKeySuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (showKeySuggestions && filteredSuggestions.length > 0) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSelectedSuggestionIndex((prev) =>
                        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSelectedSuggestionIndex((prev) =>
                        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
                      );
                    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
                      e.preventDefault();
                      handleSelectSuggestion(filteredSuggestions[selectedSuggestionIndex]);
                    } else if (e.key === 'Escape') {
                      setShowKeySuggestions(false);
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMetadata();
                    }
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMetadata();
                  }
                }}
                disabled={addingMetadata}
                autoFocus
                autoComplete="off"
              />
              {showKeySuggestions && filteredSuggestions.length > 0 && (
                <div className="autocomplete-dropdown" ref={suggestionsRef}>
                  {filteredSuggestions.map((key, index) => (
                    <div
                      key={key}
                      className={`autocomplete-item ${index === selectedSuggestionIndex ? 'autocomplete-item-active' : ''}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectSuggestion(key);
                      }}
                      onMouseEnter={() => setSelectedSuggestionIndex(index)}
                    >
                      {key}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="add-metadata-value" className="form-label">Value <span className="form-required">*</span></label>
              <input
                id="add-metadata-value"
                type="text"
                className={`form-input ${metadataError ? 'form-input-error' : ''}`}
                placeholder="e.g., Acme, Red, Large"
                value={metadataValue}
                onChange={(e) => setMetadataValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMetadata();
                  }
                }}
                disabled={addingMetadata}
              />
            </div>
          </div>
          {metadataError && (
            <div className="form-error-text" style={{ marginTop: '0.25rem' }}>{metadataError}</div>
          )}
          <div className="metadata-add-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setShowAddMetadata(false);
                setMetadataError(null);
              }}
              disabled={addingMetadata}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAddMetadata}
              disabled={addingMetadata}
            >
              {addingMetadata ? 'Adding...' : 'Save'}
            </button>
          </div>
        </div>
      )}
      {metadata.length > 0 ? (
        <div className="metadata-tags-list">
          {metadata.map((meta: ItemMetadata) => (
            editingMetadataId === meta.id ? (
              <div key={meta.id} className="metadata-edit-form">
                <div className="metadata-edit-fields">
                  <div className="form-group">
                    <label htmlFor={`edit-meta-key-${meta.id}`} className="form-label">Key <span className="form-required">*</span></label>
                    <input
                      id={`edit-meta-key-${meta.id}`}
                      type="text"
                      className={`form-input form-input-sm ${editMetaError ? 'form-input-error' : ''}`}
                      value={editMetaKey}
                      onChange={(e) => setEditMetaKey(e.target.value)}
                      disabled={savingMetadata}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveMetadata();
                        }
                        if (e.key === 'Escape') {
                          cancelEditMetadata();
                        }
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor={`edit-meta-value-${meta.id}`} className="form-label">Value <span className="form-required">*</span></label>
                    <input
                      id={`edit-meta-value-${meta.id}`}
                      type="text"
                      className={`form-input form-input-sm ${editMetaError ? 'form-input-error' : ''}`}
                      value={editMetaValue}
                      onChange={(e) => setEditMetaValue(e.target.value)}
                      disabled={savingMetadata}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveMetadata();
                        }
                        if (e.key === 'Escape') {
                          cancelEditMetadata();
                        }
                      }}
                    />
                  </div>
                </div>
                {editMetaError && (
                  <div className="form-error-text" style={{ marginTop: '0.25rem' }}>{editMetaError}</div>
                )}
                <div className="metadata-edit-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={cancelEditMetadata}
                    disabled={savingMetadata}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveMetadata}
                    disabled={savingMetadata}
                  >
                    {savingMetadata ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div key={meta.id} className="metadata-tag">
                <span className="metadata-tag-key">{meta.key}</span>
                <span className="metadata-tag-separator">:</span>
                <span className="metadata-tag-value">{meta.value}</span>
                <button
                  className="metadata-tag-edit"
                  onClick={() => startEditMetadata(meta)}
                  title={`Edit ${meta.key}`}
                  aria-label={`Edit ${meta.key}`}
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="metadata-tag-remove"
                  onClick={() => handleDeleteMetadata(meta.id, meta.key)}
                  title={`Remove ${meta.key}`}
                  aria-label={`Remove ${meta.key}`}
                >
                  <X size={14} />
                </button>
              </div>
            )
          ))}
        </div>
      ) : !showAddMetadata ? (
        <div className="metadata-empty-state">
          <Tag size={32} />
          <p>No metadata tags</p>
          <span className="metadata-empty-hint">Add key-value metadata to organize and describe this item</span>
        </div>
      ) : null}
    </div>
  );
}
