import { NextResponse } from 'next/server';
import { generateOnDemandPrediction } from '@/lib/prediction-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 允许最长60秒执行时间

// 手动单次分析：只返回结果，不保存数据库，不参与胜率计算
export async function POST() {
  try {
    const result = await generateOnDemandPrediction();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating prediction:', error);
    return NextResponse.json(
      { error: `Failed to generate prediction: ${error}` },
      { status: 500 }
    );
  }
}
