import { NextResponse } from 'next/server';
import { createHourlyPrediction, settleExpiredWindows } from '@/lib/prediction-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Vercel Cron Job 端点
// 在 vercel.json 中配置: "crons": [{ "path": "/api/cron", "schedule": "0 * * * *" }]
export async function GET(request: Request) {
  // 验证 Cron 密钥（可选但推荐）
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 先结算到期的窗口
    await settleExpiredWindows();

    // 生成新预测
    const result = await createHourlyPrediction();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      { error: `Cron job failed: ${error}` },
      { status: 500 }
    );
  }
}
