import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { DashboardData, Item } from '@/types';

// GET /api/dashboard - Returns tote count, item count, recent items
export async function GET() {
  try {
    const db = getDb();

    // Get total tote count
    const toteCountRow = db.prepare('SELECT COUNT(*) as count FROM totes').get() as { count: number };

    // Get total item count
    const itemCountRow = db.prepare('SELECT COUNT(*) as count FROM items').get() as { count: number };

    // Get recently added items (last 10) with their tote names
    const recentItems = db.prepare(`
      SELECT i.*, t.name as tote_name
      FROM items i
      JOIN totes t ON t.id = i.tote_id
      ORDER BY i.created_at DESC
      LIMIT 10
    `).all() as (Item & { tote_name: string })[];

    const data: DashboardData = {
      total_totes: toteCountRow.count,
      total_items: itemCountRow.count,
      recent_items: recentItems,
    };

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
