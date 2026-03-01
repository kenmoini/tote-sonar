'use client';

import { AlertTriangle, X } from 'lucide-react';

interface PhotoDeleteConfirmProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  deleting?: boolean;
}

export function PhotoDeleteConfirm({ isOpen, onConfirm, onCancel, deleting = false }: PhotoDeleteConfirmProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => { if (!deleting) onCancel(); }}>
      <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header modal-header-danger">
          <div className="modal-header-icon-title">
            <div className="confirm-icon-danger">
              <AlertTriangle size={24} />
            </div>
            <h2>Delete Photo</h2>
          </div>
          <button
            className="modal-close"
            onClick={() => { if (!deleting) onCancel(); }}
            aria-label="Close"
            disabled={deleting}
          >
            <X size={20} />
          </button>
        </div>
        <div className="confirm-body modal-body">
          <p>Are you sure you want to delete this photo?</p>
          <p className="confirm-text-muted">This action cannot be undone.</p>
        </div>
        <div className="modal-footer">
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={onConfirm}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Photo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
