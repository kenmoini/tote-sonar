'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Package, ArrowLeft, Hash, Calendar, FileText } from 'lucide-react';
import { Item } from '@/types';
import Breadcrumb from '@/components/Breadcrumb';

interface ItemDetail extends Item {
  tote_name: string;
  tote_location: string;
}

export default function ItemDetailPage() {
  const params = useParams();
  const toteId = params.id as string;
  const itemId = params.itemId as string;
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchItem() {
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
    }
    if (itemId) fetchItem();
  }, [itemId]);

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
          <p>Loading item...</p>
        </div>
      </main>
    );
  }

  if (error || !item) {
    return (
      <main className="page-container">
        <div className="error-state">
          <p>{error || 'Item not found'}</p>
          <Link href={`/totes/${toteId}`} className="btn btn-secondary">
            <ArrowLeft size={16} />
            Back to Tote
          </Link>
        </div>
      </main>
    );
  }

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/' },
    { label: 'Totes', href: '/totes' },
    { label: item.tote_name, href: `/totes/${toteId}` },
    { label: item.name },
  ];

  return (
    <main className="page-container">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Item header */}
      <div className="item-detail-header">
        <div className="item-detail-title-row">
          <div className="item-detail-icon">
            <Package size={28} />
          </div>
          <div>
            <h1>{item.name}</h1>
            <span className="item-detail-tote">
              in <Link href={`/totes/${toteId}`} className="item-detail-tote-link">{item.tote_name}</Link>
            </span>
          </div>
        </div>
      </div>

      {/* Item metadata */}
      <div className="item-detail-meta-grid">
        <div className="tote-detail-meta-card">
          <div className="meta-card-icon"><Hash size={18} /></div>
          <div>
            <span className="meta-card-label">Quantity</span>
            <span className="meta-card-value">{item.quantity}</span>
          </div>
        </div>
        <div className="tote-detail-meta-card">
          <div className="meta-card-icon"><Calendar size={18} /></div>
          <div>
            <span className="meta-card-label">Added</span>
            <span className="meta-card-value">{formatDate(item.created_at)}</span>
          </div>
        </div>
        {item.description && (
          <div className="tote-detail-meta-card item-desc-card">
            <div className="meta-card-icon"><FileText size={18} /></div>
            <div>
              <span className="meta-card-label">Description</span>
              <span className="meta-card-value">{item.description}</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
