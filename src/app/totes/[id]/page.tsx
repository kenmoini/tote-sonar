'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Box, MapPin, User, ArrowLeft, Package, Calendar } from 'lucide-react';
import { Tote, Item } from '@/types';

interface ToteDetail extends Tote {
  items: Item[];
  item_count: number;
}

export default function ToteDetailPage() {
  const params = useParams();
  const toteId = params.id as string;
  const [tote, setTote] = useState<ToteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTote() {
      try {
        setLoading(true);
        const res = await fetch(`/api/totes/${toteId}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('Tote not found');
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
    }
    if (toteId) fetchTote();
  }, [toteId]);

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
          <p>Loading tote...</p>
        </div>
      </main>
    );
  }

  if (error || !tote) {
    return (
      <main className="page-container">
        <div className="error-state">
          <p>{error || 'Tote not found'}</p>
          <Link href="/totes" className="btn btn-secondary">
            <ArrowLeft size={16} />
            Back to Totes
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container">
      {/* Breadcrumb */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/" className="breadcrumb-link">Dashboard</Link>
        <span className="breadcrumb-sep">/</span>
        <Link href="/totes" className="breadcrumb-link">Totes</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{tote.name}</span>
      </nav>

      {/* Tote header */}
      <div className="tote-detail-header">
        <div className="tote-detail-title-row">
          <div className="tote-detail-icon">
            <Box size={28} />
          </div>
          <div>
            <h1>{tote.name}</h1>
            <span className="tote-detail-id">ID: {tote.id}</span>
          </div>
        </div>
      </div>

      {/* Tote metadata */}
      <div className="tote-detail-meta-grid">
        <div className="tote-detail-meta-card">
          <div className="meta-card-icon"><MapPin size={18} /></div>
          <div>
            <span className="meta-card-label">Location</span>
            <span className="meta-card-value">{tote.location}</span>
          </div>
        </div>
        {tote.owner && (
          <div className="tote-detail-meta-card">
            <div className="meta-card-icon"><User size={18} /></div>
            <div>
              <span className="meta-card-label">Owner</span>
              <span className="meta-card-value">{tote.owner}</span>
            </div>
          </div>
        )}
        <div className="tote-detail-meta-card">
          <div className="meta-card-icon"><Package size={18} /></div>
          <div>
            <span className="meta-card-label">Items</span>
            <span className="meta-card-value">{tote.item_count}</span>
          </div>
        </div>
        <div className="tote-detail-meta-card">
          <div className="meta-card-icon"><Calendar size={18} /></div>
          <div>
            <span className="meta-card-label">Created</span>
            <span className="meta-card-value">{formatDate(tote.created_at)}</span>
          </div>
        </div>
        {tote.size && (
          <div className="tote-detail-meta-card">
            <div className="meta-card-icon"><Box size={18} /></div>
            <div>
              <span className="meta-card-label">Size</span>
              <span className="meta-card-value">{tote.size}</span>
            </div>
          </div>
        )}
        {tote.color && (
          <div className="tote-detail-meta-card">
            <div className="meta-card-icon">
              <div className="color-swatch" style={{ background: tote.color.toLowerCase() }} />
            </div>
            <div>
              <span className="meta-card-label">Color</span>
              <span className="meta-card-value">{tote.color}</span>
            </div>
          </div>
        )}
      </div>

      {/* Items section */}
      <div className="tote-detail-section">
        <div className="section-header">
          <h2>Items ({tote.item_count})</h2>
        </div>
        {tote.items.length === 0 ? (
          <div className="empty-state-small">
            <Package size={32} className="empty-icon" />
            <p>No items in this tote yet.</p>
          </div>
        ) : (
          <div className="items-list">
            {tote.items.map((item) => (
              <div key={item.id} className="item-row">
                <div className="item-row-info">
                  <span className="item-name">{item.name}</span>
                  {item.description && <span className="item-desc">{item.description}</span>}
                </div>
                <span className="item-qty">Qty: {item.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
