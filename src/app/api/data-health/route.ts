import { NextResponse } from 'next/server';
import { getMarketData } from '@/lib/market/binance';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { health } = await getMarketData();

    return NextResponse.json({
      ...health,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking data health:', error);
    return NextResponse.json({
      grade: 'halted',
      reason: `Health check failed: ${error}`,
      checkedAt: new Date().toISOString(),
    });
  }
}
