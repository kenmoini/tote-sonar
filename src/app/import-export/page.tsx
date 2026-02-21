'use client';

import { useState, useRef } from 'react';
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
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    summary?: { totes: number; items: number; photos: number; metadata: number; settings: number };
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleDropzoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.zip')) {
      setSelectedFile(file);
      setImportResult(null);
    } else {
      showToast('Please drop a .zip file', 'error');
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setImportProgress('Uploading ZIP file...');
    setImportResult(null);

    try {
      setImportProgress('Validating and importing data...');

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setImportResult({
          success: false,
          message: result.error || 'Import failed',
        });
        showToast(result.error || 'Import failed', 'error');
      } else {
        setImportResult({
          success: true,
          message: result.message,
          summary: result.summary,
        });
        showToast('Import completed successfully!', 'success');
        setSelectedFile(null);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Import failed';
      setImportResult({
        success: false,
        message: msg,
      });
      showToast(msg, 'error');
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

        {/* Import Section */}
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
              <span>Importing data will overwrite all existing records. Make sure to export your current data first.</span>
            </div>

            {/* Dropzone / File selection */}
            <div
              className={`import-dropzone ${selectedFile ? 'import-dropzone-active' : ''} ${importing ? 'import-dropzone-disabled' : ''}`}
              onClick={!importing ? handleDropzoneClick : undefined}
              onDragOver={handleDragOver}
              onDrop={!importing ? handleDrop : undefined}
              data-testid="import-dropzone"
            >
              {selectedFile ? (
                <>
                  <FileArchive size={32} className="import-dropzone-icon import-dropzone-icon-selected" />
                  <p className="import-dropzone-text">{selectedFile.name}</p>
                  <p className="import-dropzone-hint">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </>
              ) : (
                <>
                  <Upload size={32} className="import-dropzone-icon" />
                  <p className="import-dropzone-text">Drop a ZIP file here or click to select</p>
                  <p className="import-dropzone-hint">Accepts .zip files exported from Tote Sonar</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="import-file-input"
                onChange={handleFileSelect}
                disabled={importing}
                aria-label="Select ZIP file to import"
                data-testid="import-file-input"
              />
            </div>

            {/* Import progress indicator */}
            {importProgress && (
              <div className="import-progress" data-testid="import-progress">
                <Loader2 size={18} className="spin-icon" />
                <span>{importProgress}</span>
              </div>
            )}

            {/* Import result */}
            {importResult && (
              <div
                className={`import-result ${importResult.success ? 'import-result-success' : 'import-result-error'}`}
                data-testid="import-result"
              >
                {importResult.success ? (
                  <>
                    <div className="import-result-header">
                      <Check size={18} />
                      <span>{importResult.message}</span>
                    </div>
                    {importResult.summary && (
                      <div className="import-result-summary">
                        <div className="import-result-stat">
                          <span className="import-result-stat-value">{importResult.summary.totes}</span>
                          <span className="import-result-stat-label">Totes</span>
                        </div>
                        <div className="import-result-stat">
                          <span className="import-result-stat-value">{importResult.summary.items}</span>
                          <span className="import-result-stat-label">Items</span>
                        </div>
                        <div className="import-result-stat">
                          <span className="import-result-stat-value">{importResult.summary.photos}</span>
                          <span className="import-result-stat-label">Photos</span>
                        </div>
                        <div className="import-result-stat">
                          <span className="import-result-stat-value">{importResult.summary.metadata}</span>
                          <span className="import-result-stat-label">Metadata</span>
                        </div>
                        <div className="import-result-stat">
                          <span className="import-result-stat-value">{importResult.summary.settings}</span>
                          <span className="import-result-stat-label">Settings</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="import-result-header">
                    <X size={18} />
                    <span>{importResult.message}</span>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="import-actions">
              {selectedFile && !importing && (
                <button
                  className="btn btn-secondary"
                  onClick={handleClearFile}
                  data-testid="import-clear-button"
                >
                  <X size={16} />
                  <span>Clear</span>
                </button>
              )}
              <button
                className="btn btn-primary btn-lg"
                onClick={handleImport}
                disabled={!selectedFile || importing}
                data-testid="import-button"
              >
                {importing ? (
                  <>
                    <Loader2 size={18} className="spin-icon" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    <span>Import Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
