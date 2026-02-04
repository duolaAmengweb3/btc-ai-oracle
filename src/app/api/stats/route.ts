import { NextResponse } from 'next/server';
import { getStats, getAIStats } from '@/lib/prediction-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const [stats, aiStats] = await Promise.all([
      getStats(days),
      getAIStats(days),
    ]);

    return NextResponse.json({
      ...stats,
      ...aiStats,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
