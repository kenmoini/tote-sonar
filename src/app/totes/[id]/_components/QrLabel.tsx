'use client';

import { useState } from 'react';
import { QrCode, Printer } from 'lucide-react';
import { Tote, Item } from '@/types';

interface ToteDetail extends Tote {
  items: Item[];
  item_count: number;
}

type QrLabelSize = 'small' | 'medium' | 'large';

const QR_SIZES: Record<QrLabelSize, { display: number; print: number; label: string }> = {
  small: { display: 128, print: 150, label: 'Small' },
  medium: { display: 200, print: 250, label: 'Medium' },
  large: { display: 300, print: 350, label: 'Large' },
};

interface QrLabelProps {
  toteId: string;
  tote: ToteDetail;
}

export default function QrLabel({ toteId, tote }: QrLabelProps) {
  const [qrLabelSize, setQrLabelSize] = useState<QrLabelSize>('medium');

  const handlePrintLabel = () => {
    window.print();
  };

  return (
    <>
      {/* QR Code Section */}
      <div className="tote-detail-section qr-code-section">
        <div className="section-header">
          <h2><QrCode size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />QR Code</h2>
          <button
            className="btn btn-secondary"
            onClick={handlePrintLabel}
            title="Print QR label"
          >
            <Printer size={16} />
            <span>Print Label</span>
          </button>
        </div>
        <div className="qr-label-size-selector">
          <span className="qr-size-label">Label Size:</span>
          <div className="qr-size-options">
            {(Object.keys(QR_SIZES) as QrLabelSize[]).map((size) => (
              <button
                key={size}
                className={`qr-size-btn ${qrLabelSize === size ? 'qr-size-btn-active' : ''}`}
                onClick={() => setQrLabelSize(size)}
                title={`${QR_SIZES[size].label} QR label`}
              >
                {QR_SIZES[size].label}
              </button>
            ))}
          </div>
        </div>
        <div className="qr-code-display">
          <div className="qr-code-image-container">
            <img
              src={`/api/totes/${toteId}/qr`}
              alt={`QR code for tote ${tote.id}`}
              className="qr-code-image"
              style={{
                width: `${QR_SIZES[qrLabelSize].display}px`,
                height: `${QR_SIZES[qrLabelSize].display}px`,
              }}
            />
          </div>
          <p className="qr-code-tote-id">{tote.id}</p>
          <p className="qr-code-url-hint">Scan to open this tote&rsquo;s page</p>
        </div>
      </div>

      {/* Print-only QR Label (hidden on screen, visible when printing) */}
      <div className="print-label-container" aria-hidden="true">
        <div className={`print-label print-label-${qrLabelSize}`}>
          <div className="print-label-qr">
            <img
              src={`/api/totes/${toteId}/qr`}
              alt={`QR code for tote ${tote.id}`}
              style={{
                width: `${QR_SIZES[qrLabelSize].print}px`,
                height: `${QR_SIZES[qrLabelSize].print}px`,
              }}
            />
          </div>
          <div className="print-label-id">{tote.id}</div>
          <div className="print-label-name">{tote.name}</div>
          <div className="print-label-location">{tote.location}</div>
        </div>
      </div>
    </>
  );
}
