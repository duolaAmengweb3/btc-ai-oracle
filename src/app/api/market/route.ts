import { NextResponse } from 'next/server';
import { getMarketData } from '@/lib/market/binance';
import { getAllExternalData } from '@/lib/market/external';

export const dynamic = 'force-dynamic';

// 内存缓存：Binance 数据 5 秒，外部数据 60 秒
let binanceCache: { data: any; health: any; timestamp: number } | null = null;
let externalCache: { data: any; timestamp: number } | null = null;
const BINANCE_CACHE_TTL = 5000; // 5 秒
const EXTERNAL_CACHE_TTL = 60000; // 60 秒（外部 API 慢，缓存久一点）

export async function GET() {
  try {
    const now = Date.now();

    // 获取 Binance 数据（短缓存）
    let binanceData;
    if (binanceCache && now - binanceCache.timestamp < BINANCE_CACHE_TTL) {
      binanceData = { data: binanceCache.data, health: binanceCache.health };
    } else {
      binanceData = await getMarketData();
      binanceCache = {
        data: binanceData.data,
        health: binanceData.health,
        timestamp: now,
      };
    }

    // 获取外部数据（长缓存）
    let externalData;
    if (externalCache && now - externalCache.timestamp < EXTERNAL_CACHE_TTL) {
      externalData = externalCache.data;
    } else {
      // 后台异步更新外部数据，不阻塞响应
      if (!externalCache) {
        // 首次请求必须等待
        externalData = await getAllExternalData();
        externalCache = { data: externalData, timestamp: now };
      } else {
        // 使用旧缓存，后台更新
        externalData = externalCache.data;
        getAllExternalData().then((data) => {
          externalCache = { data, timestamp: Date.now() };
        }).catch(console.error);
      }
    }

    return NextResponse.json({
      binance: binanceData.data,
      external: externalData,
      health: binanceData.health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Market data fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
