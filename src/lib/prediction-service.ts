import { db } from './db/client';
import { predictions, predictionWindows, aiOutputs, marketDataSnapshots, settlements, aiSettlements } from './db/schema';
import { getMarketData, getPriceAt, DataHealthStatus, MarketData } from './market/binance';
import { getAllExternalData } from './market/external';
import { generatePrediction, AggregatedPrediction, AIResult, FullMarketContext } from './ai';
import { eq, desc, and, lt, isNull } from 'drizzle-orm';
import { format } from 'date-fns';

// 生成预测ID
function generatePredictionId(): string {
  return format(new Date(), 'yyyyMMddHH');
}

// 获取预测的主方向
function getPredictedDirection(probUp: number, probDown: number): string {
  if (probUp > probDown + 0.1) return 'up';
  if (probDown > probUp + 0.1) return 'down';
  return 'flat';
}

// 保存预测到数据库
async function savePrediction(
  predictionId: string,
  btcPrice: number,
  healthStatus: DataHealthStatus,
  aggregated: AggregatedPrediction,
  aiResults: AIResult[],
  marketData: Awaited<ReturnType<typeof getMarketData>>['data']
) {
  // 保存主预测记录
  db.insert(predictions).values({
    id: predictionId,
    createdAt: new Date().toISOString(),
    btcPrice,
    dataHealthGrade: healthStatus.grade,
    dataHealthReason: healthStatus.reason,
    consensusStrength: aggregated.consensusStrength,
    divergenceSummary: JSON.stringify(aggregated.divergenceSummary),
  }).run();

  // 保存三窗口预测
  for (const windowType of ['1h', '4h', '24h'] as const) {
    const window = aggregated.windows[windowType];
    db.insert(predictionWindows).values({
      predictionId,
      windowType,
      probUp: window.probUp,
      probDown: window.probDown,
      probFlat: window.probFlat,
      probMove1pct: window.probMove1pct,
      probMove2pct: window.probMove2pct,
      expectedRangePct: window.expectedRangePct,
      confidence: window.confidence,
      mainConclusion: window.mainConclusion,
      invalidationConditions: JSON.stringify(window.invalidationConditions),
      topFactors: JSON.stringify(window.topFactors),
    }).run();
  }

  // 保存各AI输出
  for (const result of aiResults) {
    if (result.success && result.data) {
      for (const windowType of ['1h', '4h', '24h'] as const) {
        const w = result.data.windows[windowType];
        db.insert(aiOutputs).values({
          predictionId,
          aiName: result.name.toLowerCase(),
          windowType,
          probUp: w.prob_up,
          probDown: w.prob_down,
          probFlat: w.prob_flat,
          confidence: w.confidence,
          reasoning: result.data.reasoning,
          rawResponse: result.raw,
        }).run();
      }
    }
  }

  // 保存市场数据快照
  db.insert(marketDataSnapshots).values({
    predictionId,
    btcPrice: marketData.btcPrice,
    priceChange1h: marketData.priceChange1h,
    priceChange24h: marketData.priceChange24h,
    volume24h: marketData.volume24h,
    fundingRate: marketData.fundingRate,
    realizedVol: marketData.realizedVol24h,
    snapshotTime: marketData.timestamp,
  }).run();
}

// 主函数：生成并保存预测
export async function createHourlyPrediction() {
  const predictionId = generatePredictionId();

  // 检查是否已存在
  const existing = db.select().from(predictions).where(eq(predictions.id, predictionId)).get();
  if (existing) {
    console.log(`Prediction ${predictionId} already exists`);
    return { id: predictionId, status: 'exists' };
  }

  console.log(`Generating prediction ${predictionId}...`);

  // 并行获取市场数据和外部数据
  console.log('Fetching market data...');
  const [{ data: marketData, health: healthStatus }, externalData] = await Promise.all([
    getMarketData(),
    getAllExternalData(),
  ]);

  console.log('Market data fetched. External data:', {
    fearGreed: externalData.fearGreed?.value,
    coinGecko: externalData.coinGecko ? 'OK' : 'FAIL',
    news: externalData.news.length,
  });

  if (healthStatus.grade === 'halted') {
    // 数据不可用，创建空预测
    db.insert(predictions).values({
      id: predictionId,
      createdAt: new Date().toISOString(),
      btcPrice: 0,
      dataHealthGrade: 'halted',
      dataHealthReason: healthStatus.reason,
      consensusStrength: 0,
      divergenceSummary: '[]',
    }).run();

    return { id: predictionId, status: 'halted', reason: healthStatus.reason };
  }

  // 构建完整上下文
  const context: FullMarketContext = {
    binance: marketData,
    external: externalData,
  };

  // 调用AI生成预测
  const { aggregated, aiResults, successCount } = await generatePrediction(context);

  // 保存到数据库
  await savePrediction(
    predictionId,
    marketData.btcPrice,
    healthStatus,
    aggregated,
    aiResults,
    marketData
  );

  console.log(`Prediction ${predictionId} saved. AI success: ${successCount}/3`);

  return { id: predictionId, status: 'created', successCount };
}

// 单次分析：只生成预测结果，不保存到数据库（用于手动分析）
export async function generateOnDemandPrediction() {
  console.log('Generating on-demand prediction (not saving to DB)...');

  // 并行获取市场数据和外部数据
  const [{ data: marketData, health: healthStatus }, externalData] = await Promise.all([
    getMarketData(),
    getAllExternalData(),
  ]);

  if (healthStatus.grade === 'halted') {
    return {
      status: 'halted',
      reason: healthStatus.reason,
    };
  }

  // 构建完整上下文
  const context: FullMarketContext = {
    binance: marketData,
    external: externalData,
  };

  // 调用AI生成预测
  const { aggregated, aiResults, successCount } = await generatePrediction(context);

  // 直接返回结果，不保存数据库
  return {
    status: 'success',
    successCount,
    createdAt: new Date().toISOString(),
    btcPrice: marketData.btcPrice,
    dataHealthGrade: healthStatus.grade,
    dataHealthReason: healthStatus.reason,
    consensusStrength: aggregated.consensusStrength,
    divergenceSummary: aggregated.divergenceSummary,
    windows: aggregated.windows,
    aiOutputs: aiResults.filter(r => r.success).map(r => ({
      name: r.name,
      windows: {
        '1h': r.prediction?.windows['1h'],
        '4h': r.prediction?.windows['4h'],
        '24h': r.prediction?.windows['24h'],
      },
      reasoning: r.prediction?.reasoning,
    })),
  };
}

// 结算到期的预测窗口
export async function settleExpiredWindows() {
  const now = new Date();
  console.log('Checking for expired windows to settle...');

  // 获取所有预测
  const allPredictions = db.select().from(predictions).all();

  for (const prediction of allPredictions) {
    const predictionTime = new Date(prediction.createdAt);

    // 获取该预测的窗口
    const windows = db.select().from(predictionWindows)
      .where(eq(predictionWindows.predictionId, prediction.id))
      .all();

    for (const window of windows) {
      // 检查是否已结算
      const existingSettlement = db.select().from(settlements)
        .where(
          and(
            eq(settlements.predictionId, prediction.id),
            eq(settlements.windowType, window.windowType)
          )
        ).get();

      if (existingSettlement) continue;

      // 计算窗口到期时间
      const hoursMap: Record<string, number> = { '1h': 1, '4h': 4, '24h': 24 };
      const hours = hoursMap[window.windowType] || 1;
      const endTime = new Date(predictionTime.getTime() + hours * 60 * 60 * 1000);

      // 如果已到期，进行结算
      if (now > endTime) {
        try {
          const endPrice = await getPriceAt(endTime.getTime());
          const startPrice = prediction.btcPrice;
          const actualReturnPct = ((endPrice - startPrice) / startPrice) * 100;

          // 判断实际方向
          let actualDirection = 'flat';
          if (actualReturnPct > 0.5) actualDirection = 'up';
          else if (actualReturnPct < -0.5) actualDirection = 'down';

          // 获取预测方向
          const predictedDirection = getPredictedDirection(window.probUp, window.probDown);

          // 判断是否命中
          const isHit = actualDirection === predictedDirection ? 1 : 0;

          // 保存结算记录
          db.insert(settlements).values({
            predictionId: prediction.id,
            windowType: window.windowType,
            actualReturnPct,
            actualDirection,
            predictedDirection,
            isHit,
            settledAt: now.toISOString(),
            startPrice,
            endPrice,
          }).run();

          console.log(`Settled ${prediction.id} ${window.windowType}: ${actualDirection} (${actualReturnPct.toFixed(2)}%) - ${isHit ? 'HIT' : 'MISS'}`);

          // 同时结算每个 AI 的预测
          const aiOutputsForWindow = db.select().from(aiOutputs)
            .where(
              and(
                eq(aiOutputs.predictionId, prediction.id),
                eq(aiOutputs.windowType, window.windowType)
              )
            ).all();

          for (const aiOutput of aiOutputsForWindow) {
            // 检查是否已结算
            const existingAISettlement = db.select().from(aiSettlements)
              .where(
                and(
                  eq(aiSettlements.predictionId, prediction.id),
                  eq(aiSettlements.windowType, window.windowType),
                  eq(aiSettlements.aiName, aiOutput.aiName)
                )
              ).get();

            if (existingAISettlement) continue;

            // 计算 AI 的预测方向
            const aiPredictedDirection = getPredictedDirection(aiOutput.probUp, aiOutput.probDown);
            const aiIsHit = actualDirection === aiPredictedDirection ? 1 : 0;

            // 保存 AI 结算记录
            db.insert(aiSettlements).values({
              predictionId: prediction.id,
              aiName: aiOutput.aiName,
              windowType: window.windowType,
              predictedDirection: aiPredictedDirection,
              actualDirection,
              confidence: aiOutput.confidence,
              isHit: aiIsHit,
              settledAt: now.toISOString(),
            }).run();

            console.log(`  AI ${aiOutput.aiName}: ${aiPredictedDirection} - ${aiIsHit ? 'HIT' : 'MISS'}`);
          }
        } catch (error) {
          console.error(`Failed to settle ${prediction.id} ${window.windowType}:`, error);
        }
      }
    }
  }
}

// 获取最新预测
export function getLatestPrediction() {
  const prediction = db.select().from(predictions)
    .orderBy(desc(predictions.createdAt))
    .limit(1)
    .get();

  if (!prediction) return null;

  return getPredictionById(prediction.id);
}

// 获取指定预测
export function getPredictionById(id: string) {
  const prediction = db.select().from(predictions)
    .where(eq(predictions.id, id))
    .get();

  if (!prediction) return null;

  const windows = db.select().from(predictionWindows)
    .where(eq(predictionWindows.predictionId, id))
    .all();

  const aiOutputsData = db.select().from(aiOutputs)
    .where(eq(aiOutputs.predictionId, id))
    .all();

  const settlementsData = db.select().from(settlements)
    .where(eq(settlements.predictionId, id))
    .all();

  const marketSnapshot = db.select().from(marketDataSnapshots)
    .where(eq(marketDataSnapshots.predictionId, id))
    .get();

  // 组织AI输出
  const aiMap: Record<string, any> = {};
  for (const output of aiOutputsData) {
    if (!aiMap[output.aiName]) {
      aiMap[output.aiName] = { name: output.aiName, windows: {}, reasoning: output.reasoning };
    }
    aiMap[output.aiName].windows[output.windowType] = {
      probUp: output.probUp,
      probDown: output.probDown,
      probFlat: output.probFlat,
      confidence: output.confidence,
    };
  }

  // 组织窗口数据
  const windowsMap: Record<string, any> = {};
  for (const w of windows) {
    windowsMap[w.windowType] = {
      probUp: w.probUp,
      probDown: w.probDown,
      probFlat: w.probFlat,
      probMove1pct: w.probMove1pct,
      probMove2pct: w.probMove2pct,
      expectedRangePct: w.expectedRangePct,
      confidence: w.confidence,
      mainConclusion: w.mainConclusion,
      topFactors: JSON.parse(w.topFactors || '[]'),
      invalidationConditions: JSON.parse(w.invalidationConditions || '[]'),
    };
  }

  // 组织结算数据
  const settlementsMap: Record<string, any> = {};
  for (const s of settlementsData) {
    settlementsMap[s.windowType] = {
      actualReturnPct: s.actualReturnPct,
      actualDirection: s.actualDirection,
      predictedDirection: s.predictedDirection,
      isHit: s.isHit === 1,
      settledAt: s.settledAt,
      startPrice: s.startPrice,
      endPrice: s.endPrice,
    };
  }

  return {
    id: prediction.id,
    createdAt: prediction.createdAt,
    btcPrice: prediction.btcPrice,
    dataHealth: {
      grade: prediction.dataHealthGrade,
      reason: prediction.dataHealthReason,
    },
    consensusStrength: prediction.consensusStrength,
    divergenceSummary: JSON.parse(prediction.divergenceSummary || '[]'),
    windows: windowsMap,
    aiOutputs: Object.values(aiMap),
    settlements: settlementsMap,
    marketSnapshot,
  };
}

// 获取历史预测列表
export function getPredictionHistory(limit: number = 24, offset: number = 0) {
  const allPredictions = db.select().from(predictions)
    .orderBy(desc(predictions.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  return allPredictions.map(p => ({
    id: p.id,
    createdAt: p.createdAt,
    btcPrice: p.btcPrice,
    dataHealthGrade: p.dataHealthGrade,
    consensusStrength: p.consensusStrength,
  }));
}

// 获取统计数据
export function getStats(days: number = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const allSettlements = db.select().from(settlements).all()
    .filter(s => new Date(s.settledAt) >= cutoff);

  const stats: Record<string, { total: number; hits: number; avgConfidence: number }> = {
    '1h': { total: 0, hits: 0, avgConfidence: 0 },
    '4h': { total: 0, hits: 0, avgConfidence: 0 },
    '24h': { total: 0, hits: 0, avgConfidence: 0 },
  };

  // 获取对应的置信度
  const confidenceMap: Record<string, number> = {};
  const windows = db.select().from(predictionWindows).all();
  for (const w of windows) {
    confidenceMap[`${w.predictionId}-${w.windowType}`] = w.confidence;
  }

  for (const s of allSettlements) {
    const key = s.windowType as keyof typeof stats;
    if (stats[key]) {
      stats[key].total++;
      if (s.isHit) stats[key].hits++;
      const conf = confidenceMap[`${s.predictionId}-${s.windowType}`] || 50;
      stats[key].avgConfidence += conf;
    }
  }

  // 计算命中率和平均置信度
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(stats)) {
    result[key] = {
      total: value.total,
      hits: value.hits,
      hitRate: value.total > 0 ? value.hits / value.total : 0,
      avgConfidence: value.total > 0 ? Math.round(value.avgConfidence / value.total) : 0,
    };
  }

  return {
    period: `${days}d`,
    windows: result,
    totalPredictions: allSettlements.length / 3, // 除以3个窗口
  };
}

// 获取各 AI 模型的准确率统计
export function getAIStats(days: number = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const allAISettlements = db.select().from(aiSettlements).all()
    .filter(s => new Date(s.settledAt) >= cutoff);

  // 按 AI 名称和窗口类型分组统计
  const aiStats: Record<string, Record<string, { total: number; hits: number; totalConfidence: number }>> = {};

  for (const s of allAISettlements) {
    if (!aiStats[s.aiName]) {
      aiStats[s.aiName] = {
        '1h': { total: 0, hits: 0, totalConfidence: 0 },
        '4h': { total: 0, hits: 0, totalConfidence: 0 },
        '24h': { total: 0, hits: 0, totalConfidence: 0 },
      };
    }

    const windowStats = aiStats[s.aiName][s.windowType];
    if (windowStats) {
      windowStats.total++;
      if (s.isHit) windowStats.hits++;
      windowStats.totalConfidence += s.confidence;
    }
  }

  // 计算每个 AI 的整体统计和各窗口统计
  const result: Record<string, any> = {};

  for (const [aiName, windows] of Object.entries(aiStats)) {
    let totalAll = 0;
    let hitsAll = 0;
    let confAll = 0;

    const windowsResult: Record<string, any> = {};
    for (const [windowType, stats] of Object.entries(windows)) {
      windowsResult[windowType] = {
        total: stats.total,
        hits: stats.hits,
        hitRate: stats.total > 0 ? (stats.hits / stats.total) * 100 : 0,
        avgConfidence: stats.total > 0 ? Math.round(stats.totalConfidence / stats.total) : 0,
      };
      totalAll += stats.total;
      hitsAll += stats.hits;
      confAll += stats.totalConfidence;
    }

    result[aiName] = {
      overall: {
        total: totalAll,
        hits: hitsAll,
        hitRate: totalAll > 0 ? (hitsAll / totalAll) * 100 : 0,
        avgConfidence: totalAll > 0 ? Math.round(confAll / totalAll) : 0,
      },
      windows: windowsResult,
    };
  }

  return {
    period: `${days}d`,
    aiStats: result,
  };
}
