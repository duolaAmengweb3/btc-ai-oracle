import { NextResponse } from 'next/server';
import { getPredictionHistory } from '@/lib/prediction-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '24');
    const offset = parseInt(searchParams.get('offset') || '0');

    const predictions = getPredictionHistory(limit, offset);

    return NextResponse.json({
      predictions,
      pagination: { limit, offset },
    });
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch predictions' },
      { status: 500 }
    );
  }
}
