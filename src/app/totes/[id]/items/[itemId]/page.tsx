'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Check, X } from 'lucide-react';
import { Item } from '@/types';
import Breadcrumb from '@/components/Breadcrumb';
import ErrorDisplay from '@/components/ErrorDisplay';
import ItemHeader from './_components/ItemHeader';
import ItemPhotos from './_components/ItemPhotos';
import EditItemForm from './_components/EditItemForm';
import MetadataSection from './_components/MetadataSection';
import MoveItemForm from './_components/MoveItemForm';
import CopyItemForm from './_components/CopyItemForm';
import MovementHistory from './_components/MovementHistory';

interface ItemDetail extends Item {
  tote_name: string;
  tote_location: string;
}

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toteId = params.id as string;
  const itemId = params.itemId as string;
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [maxUploadSize, setMaxUploadSize] = useState<number>(5242880);
  const [showEditItem, setShowEditItem] = useState(false);
  const [showMoveItem, setShowMoveItem] = useState(false);
  const [showCopyItem, setShowCopyItem] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  const fetchItem = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/items/${itemId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Item not found');
        throw new Error('Failed to load item');
      }
      const json = await res.json();
      setItem(json.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load item');
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => { if (itemId) fetchItem(); }, [itemId, fetchItem]);

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
      } catch { /* Fall back to default 5MB */ }
    };
    fetchMaxUploadSize();
  }, []);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); } }, [toast]);

  if (loading) return (
    <main className="page-container">
      <div className="loading-state"><div className="spinner" /><p>Loading item...</p></div>
    </main>
  );

  if (error || !item) {
    const isNotFound = error === 'Item not found' || (!item && !error);
    return (
      <main className="page-container">
        {isNotFound ? (
          <div className="error-state">
            <AlertTriangle size={48} className="error-icon" />
            <h2>Item Not Found</h2>
            <p>The item you&rsquo;re looking for doesn&rsquo;t exist or may have been deleted.</p>
            <Link href={`/totes/${toteId}`} className="btn btn-secondary">
              <ArrowLeft size={16} />
              Back to Tote
            </Link>
          </div>
        ) : (
          <ErrorDisplay error={error || 'Unknown error'} onRetry={fetchItem} retryLabel="Retry" />
        )}
      </main>
    );
  }

  const photos = item.photos || [];
  const metadata = item.metadata || [];
  const movementHistory = item.movement_history || [];
  const breadcrumbItems = [
    { label: 'Dashboard', href: '/' }, { label: 'Totes', href: '/totes' },
    { label: item.tote_name, href: `/totes/${toteId}` }, { label: item.name },
  ];

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

      <Breadcrumb items={breadcrumbItems} />
      <ItemHeader
        item={item}
        toteId={toteId}
        itemId={itemId}
        onEdit={() => setShowEditItem(true)}
        onMove={() => setShowMoveItem(true)}
        onCopy={() => setShowCopyItem(true)}
        onDeleted={() => setTimeout(() => router.push(`/totes/${toteId}`), 500)}
        showToast={showToast}
      />
      <ItemPhotos
        photos={photos}
        itemId={String(item.id)}
        itemName={item.name}
        onPhotosChanged={fetchItem}
        maxUploadSize={maxUploadSize}
      />
      <MetadataSection
        metadata={metadata}
        toteId={toteId}
        itemId={itemId}
        onMetadataChanged={fetchItem}
        showToast={showToast}
      />
      <MovementHistory
        history={movementHistory}
        toteId={toteId}
      />
      {showEditItem && (
        <EditItemForm
          item={item}
          toteId={toteId}
          itemId={itemId}
          onClose={() => setShowEditItem(false)}
          onSaved={() => { setShowEditItem(false); fetchItem(); }}
          showToast={showToast}
        />
      )}
      {showMoveItem && (
        <MoveItemForm
          item={item}
          toteId={toteId}
          itemId={itemId}
          onClose={() => setShowMoveItem(false)}
          onMoved={(targetToteId) => {
            setShowMoveItem(false);
            setTimeout(() => router.push(`/totes/${targetToteId}/items/${itemId}`), 500);
          }}
          showToast={showToast}
        />
      )}
      {showCopyItem && (
        <CopyItemForm
          item={item}
          toteId={toteId}
          itemId={itemId}
          onClose={() => setShowCopyItem(false)}
          onCopied={(newToteId, newItemId) => {
            setShowCopyItem(false);
            setTimeout(() => router.push(`/totes/${newToteId}/items/${newItemId}`), 500);
          }}
          showToast={showToast}
        />
      )}
    </main>
  );
}
