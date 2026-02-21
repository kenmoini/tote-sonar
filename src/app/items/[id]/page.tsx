'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import ErrorDisplay from '@/components/ErrorDisplay';

export default function ItemRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.id as string;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function lookupItem() {
      try {
        const res = await fetch(`/api/items/${itemId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Item not found');
          } else {
            setError('Failed to load item');
          }
          setLoading(false);
          return;
        }
        const json = await res.json();
        const toteId = json.data.tote_id;
        // Redirect to the canonical item detail page under the tote
        router.replace(`/totes/${toteId}/items/${itemId}`);
      } catch {
        setError('Failed to load item');
        setLoading(false);
      }
    }

    if (itemId) {
      lookupItem();
    }
  }, [itemId, router]);

  if (loading && !error) {
    return (
      <main className="page-container">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading item...</p>
        </div>
      </main>
    );
  }

  if (error) {
    const isNotFound = error === 'Item not found';
    return (
      <main className="page-container">
        {isNotFound ? (
          <div className="error-state">
            <AlertTriangle size={48} className="error-icon" />
            <h2>Item Not Found</h2>
            <p>The item you&rsquo;re looking for doesn&rsquo;t exist or may have been deleted.</p>
            <Link href="/" className="btn btn-secondary">
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <ErrorDisplay error={error} onRetry={() => window.location.reload()} retryLabel="Retry" />
        )}
      </main>
    );
  }

  return null;
}
