import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import QRCode from 'qrcode';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tote_ids } = body;

    if (!Array.isArray(tote_ids) || tote_ids.length === 0) {
      return NextResponse.json(
        { error: 'tote_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    if (tote_ids.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 totes can be printed at once' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get server hostname from settings
    const hostnameSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('server_hostname') as { value: string } | undefined;
    const hostname = hostnameSetting?.value || 'http://localhost:3000';

    // Fetch all requested totes
    const placeholders = tote_ids.map(() => '?').join(', ');
    const totes = db.prepare(`SELECT id, name, location FROM totes WHERE id IN (${placeholders})`).all(...tote_ids) as Array<{ id: string; name: string; location: string }>;

    if (totes.length === 0) {
      return NextResponse.json(
        { error: 'No totes found for the given IDs' },
        { status: 404 }
      );
    }

    // Generate QR codes for each tote
    const results = await Promise.all(
      totes.map(async (tote) => {
        const toteUrl = `${hostname}/totes/${tote.id}`;
        const dataUrl = await QRCode.toDataURL(toteUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        });

        return {
          tote_id: tote.id,
          tote_name: tote.name,
          tote_location: tote.location,
          qr_data_url: dataUrl,
          encoded_url: toteUrl,
        };
      })
    );

    return NextResponse.json({
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Bulk QR code generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate bulk QR codes' },
      { status: 500 }
    );
  }
}
