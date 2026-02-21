import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import QRCode from 'qrcode';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    // Verify tote exists
    const tote = db.prepare('SELECT id FROM totes WHERE id = ?').get(id) as { id: string } | undefined;
    if (!tote) {
      return NextResponse.json({ error: 'Tote not found' }, { status: 404 });
    }

    // Get server hostname from settings
    const hostnameSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('server_hostname') as { value: string } | undefined;
    const hostname = hostnameSetting?.value || 'http://localhost:3000';

    // Build the URL that the QR code encodes
    const toteUrl = `${hostname}/totes/${id}`;

    // Check for format query param (default: png image)
    const format = request.nextUrl.searchParams.get('format');

    if (format === 'dataurl') {
      // Return as data URL string (useful for embedding in HTML)
      const dataUrl = await QRCode.toDataURL(toteUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });
      return NextResponse.json({
        data: {
          qr_data_url: dataUrl,
          encoded_url: toteUrl,
          tote_id: id,
        },
      });
    }

    // Default: return as PNG image buffer
    const qrBuffer = await QRCode.toBuffer(toteUrl, {
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });

    return new NextResponse(new Uint8Array(qrBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': qrBuffer.length.toString(),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('QR code generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
