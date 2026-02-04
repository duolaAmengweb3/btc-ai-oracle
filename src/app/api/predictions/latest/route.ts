import { NextResponse } from 'next/server';
import { getLatestPrediction } from '@/lib/prediction-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const prediction = getLatestPrediction();

    if (!prediction) {
      return NextResponse.json(
        { error: 'No predictions available' },
        { status: 404 }
      );
    }

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Error fetching latest prediction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prediction' },
      { status: 500 }
    );
  }
}
