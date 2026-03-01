'use client';

import Link from 'next/link';
import { Clock, ArrowRightLeft } from 'lucide-react';
import { MovementHistory as MovementHistoryType } from '@/types';
import { formatDate } from '@/lib/formatDate';

interface MovementHistoryProps {
  history: MovementHistoryType[];
  toteId: string;
}

export default function MovementHistory({ history }: MovementHistoryProps) {
  return (
    <div className="tote-detail-section">
      <div className="section-header">
        <h2>
          <Clock style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} size={20} />
          Movement History
        </h2>
      </div>
      {history.length > 0 ? (
        <div className="movement-history-list">
          {history.map((move: MovementHistoryType) => (
            <div key={move.id} className="movement-history-item">
              <div className="movement-history-icon">
                <ArrowRightLeft size={16} />
              </div>
              <div className="movement-history-content">
                <div className="movement-history-description">
                  Moved from{' '}
                  {move.from_tote_name ? (
                    <Link href={`/totes/${move.from_tote_id}`} className="movement-history-link">
                      {move.from_tote_name}
                    </Link>
                  ) : (
                    <span className="movement-history-unknown">Unknown</span>
                  )}
                  {' '}to{' '}
                  <Link href={`/totes/${move.to_tote_id}`} className="movement-history-link">
                    {move.to_tote_name}
                  </Link>
                </div>
                <div className="movement-history-time">
                  {formatDate(move.moved_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="metadata-empty-state">
          <Clock size={32} />
          <p>No movement history</p>
          <span className="metadata-empty-hint">Movement history will appear here when this item is moved between totes</span>
        </div>
      )}
    </div>
  );
}
