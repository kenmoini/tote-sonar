'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, X, AlertTriangle } from 'lucide-react';
import { Tote, Item, TotePhoto } from '@/types';
import Breadcrumb from '@/components/Breadcrumb';
import ErrorDisplay from '@/components/ErrorDisplay';
import ToteHeader from './_components/ToteHeader';
import TotePhotos from './_components/TotePhotos';
import EditToteForm from './_components/EditToteForm';
import AddItemForm from './_components/AddItemForm';
import ItemsList from './_components/ItemsList';
import QrLabel from './_components/QrLabel';

interface ToteDetail extends Tote {
  items: Item[];
  item_count: number;
}

export default function ToteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toteId = params.id as string;
  const [tote, setTote] = useState<ToteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totePhotos, setTotePhotos] = useState<TotePhoto[]>([]);
  const [maxUploadSize, setMaxUploadSize] = useState<number>(5242880);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddItemForm, setShowAddItemForm] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchTote = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/totes/${toteId}`);
      if (!res.ok) {
        if (res.status === 404 || res.status === 400) throw new Error('Tote not found');
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

  const fetchTotePhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/totes/${toteId}/photos`);
      if (res.ok) {
        const json = await res.json();
        setTotePhotos(json.data || []);
      }
    } catch {
      // Silently fail - photos are supplemental
    }
  }, [toteId]);

  useEffect(() => {
    if (toteId) {
      fetchTote();
      fetchTotePhotos();
    }
  }, [toteId, fetchTote, fetchTotePhotos]);

  useEffect(() => {
    const fetchMaxUploadSize = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const json = await res.json();
          const sizeStr = json.settings?.max_upload_size;
          if (sizeStr) {
            const size = parseInt(sizeStr, 10);
            if (!isNaN(size) && size > 0) setMaxUploadSize(size);
          }
        }
      } catch {
        // Fall back to default
      }
    };
    fetchMaxUploadSize();
  }, []);

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
    const isNotFound = error === 'Tote not found' || (!tote && !error);
    return (
      <main className="page-container">
        {isNotFound ? (
          <div className="error-state">
            <AlertTriangle size={48} className="error-icon" />
            <h2>Tote Not Found</h2>
            <p>The tote you&rsquo;re looking for doesn&rsquo;t exist or may have been deleted.</p>
            <Link href="/totes" className="btn btn-secondary">
              <ArrowLeft size={16} />
              Back to Totes
            </Link>
          </div>
        ) : (
          <ErrorDisplay error={error || 'Unknown error'} onRetry={fetchTote} retryLabel="Retry" />
        )}
      </main>
    );
  }

  return (
    <main className="page-container">
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

      <Breadcrumb items={[
        { label: 'Dashboard', href: '/' },
        { label: 'Totes', href: '/totes' },
        { label: tote.name },
      ]} />

      <ToteHeader
        tote={tote}
        toteId={toteId}
        onEdit={() => setShowEditForm(true)}
        onDeleted={() => {
          setTimeout(() => {
            router.push('/totes');
          }, 500);
        }}
        showToast={showToast}
      />

      <TotePhotos
        photos={totePhotos}
        toteId={toteId}
        toteName={tote.name}
        onPhotosChanged={fetchTotePhotos}
        maxUploadSize={maxUploadSize}
      />

      <ItemsList
        items={tote.items}
        toteId={toteId}
        itemCount={tote.item_count}
        onAddItem={() => setShowAddItemForm(true)}
        onItemDeleted={fetchTote}
        showToast={showToast}
      />

      <QrLabel toteId={toteId} tote={tote} />

      {showEditForm && (
        <EditToteForm
          tote={tote}
          toteId={toteId}
          onClose={() => setShowEditForm(false)}
          onSaved={() => { setShowEditForm(false); fetchTote(); showToast('Tote updated successfully!', 'success'); }}
          showToast={showToast}
        />
      )}
      {showAddItemForm && (
        <AddItemForm
          toteId={toteId}
          maxUploadSize={maxUploadSize}
          onClose={() => setShowAddItemForm(false)}
          onAdded={() => { setShowAddItemForm(false); fetchTote(); }}
          showToast={showToast}
        />
      )}
    </main>
  );
}
