'use client';

import { useState } from 'react';
import {
  Download,
  Upload,
  FileArchive,
  Loader2,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb';

export default function ImportExportPage() {
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleExport = async () => {
    setExporting(true);
    setExportProgress('Preparing export data...');

    try {
      setExportProgress('Gathering totes, items, metadata, and photos...');

      const response = await fetch('/api/export');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(errorData.error || 'Failed to export data');
      }

      setExportProgress('Building ZIP file...');

      // Get the blob from the response
      const blob = await response.blob();

      setExportProgress('Downloading...');

      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `tote-sonar-export-${new Date().toISOString().slice(0, 10)}.zip`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExportProgress(null);
      showToast('Export completed successfully!', 'success');
    } catch (error) {
      setExportProgress(null);
      showToast(
        error instanceof Error ? error.message : 'Export failed',
        'error'
      );
    } finally {
      setExporting(false);
    }
  };

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/' },
    { label: 'Import / Export' },
  ];

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
      <Breadcrumb items={breadcrumbItems} />

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1>Import / Export</h1>
          <p>Back up your data or restore from a previous backup.</p>
        </div>
      </div>

      <div className="import-export-sections">
        {/* Export Section */}
        <div className="import-export-section" data-testid="export-section">
          <div className="import-export-section-header">
            <div className="import-export-section-icon export-icon">
              <Download size={24} />
            </div>
            <div>
              <h2 className="import-export-section-title">Export Data</h2>
              <p className="import-export-section-desc">
                Download all your totes, items, metadata, settings, and photos as a ZIP file.
                This creates a complete backup of your Tote Sonar data.
              </p>
            </div>
          </div>
          <div className="import-export-section-body">
            <div className="export-info">
              <div className="export-info-item">
                <FileArchive size={16} />
                <span>Includes JSON data file with all totes, items, metadata, and settings</span>
              </div>
              <div className="export-info-item">
                <Upload size={16} />
                <span>Includes all uploaded photos and thumbnails</span>
              </div>
            </div>

            {/* Export progress indicator */}
            {exportProgress && (
              <div className="export-progress" data-testid="export-progress">
                <Loader2 size={18} className="spin-icon" />
                <span>{exportProgress}</span>
              </div>
            )}

            <button
              className="btn btn-primary btn-lg"
              onClick={handleExport}
              disabled={exporting}
              data-testid="export-button"
            >
              {exporting ? (
                <>
                  <Loader2 size={18} className="spin-icon" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span>Export All Data</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Import Section (placeholder for now - feature #45+) */}
        <div className="import-export-section" data-testid="import-section">
          <div className="import-export-section-header">
            <div className="import-export-section-icon import-icon">
              <Upload size={24} />
            </div>
            <div>
              <h2 className="import-export-section-title">Import Data</h2>
              <p className="import-export-section-desc">
                Restore data from a previously exported ZIP file. This will import totes,
                items, metadata, settings, and photos.
              </p>
            </div>
          </div>
          <div className="import-export-section-body">
            <div className="import-warning">
              <AlertTriangle size={16} />
              <span>Importing data may overwrite existing records. Make sure to export your current data first.</span>
            </div>
            <div className="import-dropzone" data-testid="import-dropzone">
              <Upload size={32} className="import-dropzone-icon" />
              <p className="import-dropzone-text">Drop a ZIP file here or click to select</p>
              <p className="import-dropzone-hint">Accepts .zip files exported from Tote Sonar</p>
              <input
                type="file"
                accept=".zip"
                className="import-file-input"
                disabled
                aria-label="Select ZIP file to import"
              />
            </div>
            <p className="import-coming-soon">Full import functionality coming soon.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
