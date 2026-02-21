'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Globe,
  Upload,
  Tags,
  Key,
  Sun,
  Moon,
  Save,
  Check,
  X,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react';

interface SettingsData {
  server_hostname: string;
  max_upload_size: string;
  default_tote_fields: string;
  default_metadata_keys: string;
  theme: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [hostname, setHostname] = useState('');
  const [maxUploadSize, setMaxUploadSize] = useState('');
  const [theme, setTheme] = useState('light');

  // Default tote fields (key-value pairs for size, color, owner)
  const [defaultToteSize, setDefaultToteSize] = useState('');
  const [defaultToteColor, setDefaultToteColor] = useState('');
  const [defaultToteOwner, setDefaultToteOwner] = useState('');

  // Default metadata keys (array of strings)
  const [defaultMetadataKeys, setDefaultMetadataKeys] = useState<string[]>([]);
  const [newMetadataKey, setNewMetadataKey] = useState('');

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Convert bytes to MB for display
  const bytesToMB = (bytes: string): string => {
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return '5';
    return String(Math.round(num / (1024 * 1024)));
  };

  // Convert MB to bytes for storage
  const mbToBytes = (mb: string): string => {
    const num = parseInt(mb, 10);
    if (isNaN(num) || num < 1) return '5242880';
    return String(num * 1024 * 1024);
  };

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const json = await res.json();
      const s = json.settings as SettingsData;
      setSettings(s);

      // Populate form fields
      setHostname(s.server_hostname || 'http://localhost:3000');
      setMaxUploadSize(bytesToMB(s.max_upload_size || '5242880'));
      setTheme(s.theme || 'light');

      // Parse default tote fields (key-value pairs)
      try {
        const toteFields = JSON.parse(s.default_tote_fields || '{}');
        if (typeof toteFields === 'object' && !Array.isArray(toteFields)) {
          setDefaultToteSize(toteFields.size || '');
          setDefaultToteColor(toteFields.color || '');
          setDefaultToteOwner(toteFields.owner || '');
        } else {
          // Legacy format was array of strings - reset to empty
          setDefaultToteSize('');
          setDefaultToteColor('');
          setDefaultToteOwner('');
        }
      } catch {
        setDefaultToteSize('');
        setDefaultToteColor('');
        setDefaultToteOwner('');
      }
      try {
        const metaKeys = JSON.parse(s.default_metadata_keys || '[]');
        setDefaultMetadataKeys(Array.isArray(metaKeys) ? metaKeys : []);
      } catch {
        setDefaultMetadataKeys([]);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build default tote fields as key-value object (only include non-empty values)
      const toteFieldDefaults: Record<string, string> = {};
      if (defaultToteSize.trim()) toteFieldDefaults.size = defaultToteSize.trim();
      if (defaultToteColor.trim()) toteFieldDefaults.color = defaultToteColor.trim();
      if (defaultToteOwner.trim()) toteFieldDefaults.owner = defaultToteOwner.trim();

      const updatedSettings = {
        server_hostname: hostname.trim() || 'http://localhost:3000',
        max_upload_size: mbToBytes(maxUploadSize),
        default_tote_fields: JSON.stringify(toteFieldDefaults),
        default_metadata_keys: JSON.stringify(defaultMetadataKeys),
        theme: theme,
      };

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updatedSettings }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save settings');
      }

      // Apply theme immediately
      document.documentElement.setAttribute('data-theme', theme);

      showToast('Settings saved successfully!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    // Apply theme immediately for preview
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const addMetadataKey = () => {
    const trimmed = newMetadataKey.trim();
    if (trimmed && !defaultMetadataKeys.includes(trimmed)) {
      setDefaultMetadataKeys([...defaultMetadataKeys, trimmed]);
      setNewMetadataKey('');
    }
  };

  const removeMetadataKey = (index: number) => {
    setDefaultMetadataKeys(defaultMetadataKeys.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <main className="page-container">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading settings...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-container">
        <div className="error-state">
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={fetchSettings}>Retry</button>
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

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Configure Tote Sonar application settings.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 size={18} className="spin-icon" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>

      <div className="settings-sections">
        {/* Server Hostname / Base URL */}
        <div className="settings-section" data-testid="settings-hostname">
          <div className="settings-section-header">
            <div className="settings-section-icon">
              <Globe size={20} />
            </div>
            <div>
              <h2 className="settings-section-title">Server Hostname / Base URL</h2>
              <p className="settings-section-desc">
                The base URL used for generating QR codes. Set this to your server&apos;s
                accessible address.
              </p>
            </div>
          </div>
          <div className="settings-section-body">
            <div className="form-group">
              <label htmlFor="settings-hostname" className="form-label">Base URL</label>
              <input
                id="settings-hostname"
                type="text"
                className="form-input"
                placeholder="http://localhost:3000"
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
              />
              <span className="settings-hint">
                Example: http://192.168.1.100:3000 or https://totesonar.example.com
              </span>
            </div>
          </div>
        </div>

        {/* Maximum Upload File Size */}
        <div className="settings-section" data-testid="settings-upload-size">
          <div className="settings-section-header">
            <div className="settings-section-icon">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="settings-section-title">Maximum Image Upload Size</h2>
              <p className="settings-section-desc">
                Set the maximum allowed file size for image uploads (in megabytes).
              </p>
            </div>
          </div>
          <div className="settings-section-body">
            <div className="form-group">
              <label htmlFor="settings-upload-size" className="form-label">Max File Size (MB)</label>
              <div className="settings-input-with-unit">
                <input
                  id="settings-upload-size"
                  type="number"
                  min="1"
                  max="100"
                  className="form-input settings-number-input"
                  value={maxUploadSize}
                  onChange={(e) => setMaxUploadSize(e.target.value)}
                />
                <span className="settings-unit">MB</span>
              </div>
              <span className="settings-hint">
                Default: 5 MB. Maximum recommended: 50 MB.
              </span>
            </div>
          </div>
        </div>

        {/* Default Tote Metadata Fields */}
        <div className="settings-section" data-testid="settings-default-tote-fields">
          <div className="settings-section-header">
            <div className="settings-section-icon">
              <Tags size={20} />
            </div>
            <div>
              <h2 className="settings-section-title">Default Tote Metadata Fields</h2>
              <p className="settings-section-desc">
                Set default values for optional tote fields. These values will be
                pre-populated when creating new totes.
              </p>
            </div>
          </div>
          <div className="settings-section-body">
            <div className="form-group">
              <label htmlFor="default-tote-size" className="form-label">Default Size</label>
              <input
                id="default-tote-size"
                type="text"
                className="form-input"
                placeholder="e.g., Medium, Large, Small"
                value={defaultToteSize}
                onChange={(e) => setDefaultToteSize(e.target.value)}
              />
              <span className="settings-hint">Pre-fills the Size field when creating a new tote.</span>
            </div>
            <div className="form-group">
              <label htmlFor="default-tote-color" className="form-label">Default Color</label>
              <input
                id="default-tote-color"
                type="text"
                className="form-input"
                placeholder="e.g., Gray, Blue, Red"
                value={defaultToteColor}
                onChange={(e) => setDefaultToteColor(e.target.value)}
              />
              <span className="settings-hint">Pre-fills the Color field when creating a new tote.</span>
            </div>
            <div className="form-group">
              <label htmlFor="default-tote-owner" className="form-label">Default Owner</label>
              <input
                id="default-tote-owner"
                type="text"
                className="form-input"
                placeholder="e.g., John, Household"
                value={defaultToteOwner}
                onChange={(e) => setDefaultToteOwner(e.target.value)}
              />
              <span className="settings-hint">Pre-fills the Owner field when creating a new tote.</span>
            </div>
          </div>
        </div>

        {/* Default Item Metadata Keys */}
        <div className="settings-section" data-testid="settings-default-metadata-keys">
          <div className="settings-section-header">
            <div className="settings-section-icon">
              <Key size={20} />
            </div>
            <div>
              <h2 className="settings-section-title">Default Item Metadata Keys</h2>
              <p className="settings-section-desc">
                Suggested metadata keys when adding metadata tags to items. These appear
                as autocomplete suggestions.
              </p>
            </div>
          </div>
          <div className="settings-section-body">
            <div className="settings-tag-list">
              {defaultMetadataKeys.length === 0 && (
                <p className="settings-empty-hint">No default metadata keys configured.</p>
              )}
              {defaultMetadataKeys.map((key, index) => (
                <div key={index} className="settings-tag">
                  <span>{key}</span>
                  <button
                    className="settings-tag-remove"
                    onClick={() => removeMetadataKey(index)}
                    aria-label={`Remove ${key}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="settings-add-row">
              <input
                type="text"
                className="form-input"
                placeholder="Add a metadata key..."
                value={newMetadataKey}
                onChange={(e) => setNewMetadataKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addMetadataKey();
                  }
                }}
              />
              <button
                className="btn btn-secondary"
                onClick={addMetadataKey}
                disabled={!newMetadataKey.trim()}
              >
                <Plus size={16} />
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="settings-section" data-testid="settings-theme">
          <div className="settings-section-header">
            <div className="settings-section-icon">
              {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
            </div>
            <div>
              <h2 className="settings-section-title">Theme</h2>
              <p className="settings-section-desc">
                Choose between light and dark mode for the application interface.
              </p>
            </div>
          </div>
          <div className="settings-section-body">
            <div className="settings-theme-options">
              <button
                className={`settings-theme-btn ${theme === 'light' ? 'settings-theme-btn-active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <Sun size={24} />
                <span className="settings-theme-label">Light</span>
                {theme === 'light' && <Check size={16} className="settings-theme-check" />}
              </button>
              <button
                className={`settings-theme-btn ${theme === 'dark' ? 'settings-theme-btn-active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <Moon size={24} />
                <span className="settings-theme-label">Dark</span>
                {theme === 'dark' && <Check size={16} className="settings-theme-check" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
