'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Box, Package, Plus, ArrowRight, Clock } from 'lucide-react';
import ErrorDisplay from '@/components/ErrorDisplay';

interface DashboardData {
  total_totes: number;
  total_items: number;
  recent_items: Array<{
    id: number;
    tote_id: string;
    name: string;
    description: string | null;
    quantity: number;
    created_at: string;
    tote_name: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      const json = await res.json();
      setData(json.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <ErrorDisplay error={error} onRetry={fetchDashboard} retryLabel="Retry" />
      </div>
    );
  }

  // Welcome screen when no totes exist
  if (data && data.total_totes === 0) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-icon">
            <Box size={64} />
          </div>
          <h2>Welcome to Tote Sonar</h2>
          <p>Track items stored in physical containers with QR code labels.</p>
          <p>Get started by creating your first tote to organize your items.</p>
          <Link href="/totes?create=true" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
            <Plus size={18} />
            Create Your First Tote
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your totes and items</p>
        </div>
        <Link href="/totes" className="btn btn-primary">
          <Plus size={18} />
          New Tote
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="dashboard-metrics">
        <Link href="/totes" className="metric-card metric-card-clickable" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="metric-card-icon metric-card-icon-totes">
            <Box size={24} />
          </div>
          <div className="metric-card-content">
            <span className="metric-card-label">Total Totes</span>
            <span className="metric-card-value" data-testid="total-totes">
              {data?.total_totes ?? 0}
            </span>
          </div>
        </Link>

        <Link href="/search" className="metric-card metric-card-clickable" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="metric-card-icon metric-card-icon-items">
            <Package size={24} />
          </div>
          <div className="metric-card-content">
            <span className="metric-card-label">Total Items</span>
            <span className="metric-card-value" data-testid="total-items">
              {data?.total_items ?? 0}
            </span>
          </div>
        </Link>
      </div>

      {/* Recent Items */}
      {data && data.recent_items.length > 0 && (
        <div className="dashboard-recent">
          <div className="section-header">
            <h2>Recently Added Items</h2>
          </div>
          <div className="items-list">
            {data.recent_items.map((item) => (
              <Link
                key={item.id}
                href={`/totes/${item.tote_id}`}
                className="item-row"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="item-row-info">
                  <span className="item-name">{item.name}</span>
                  <span className="item-desc">
                    <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    {new Date(item.created_at).toLocaleDateString()}
                    {' \u00B7 '}
                    in <strong>{item.tote_name}</strong>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="item-qty">Qty: {item.quantity}</span>
                  <ArrowRight size={16} style={{ color: 'var(--muted)' }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
