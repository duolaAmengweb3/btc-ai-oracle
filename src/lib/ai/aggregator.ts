import { AIPredictionResponse, WindowPrediction, TopFactor } from './prompt';

export interface AIResult {
  name: string;
  success: boolean;
  data: AIPredictionResponse | null;
  raw: string;
  error?: string;
}

export interface AggregatedWindow {
  probUp: number;
  probDown: number;
  probFlat: number;
  probMove1pct: number;
  probMove2pct: number;
  expectedRangePct: number;
  confidence: number;
  mainConclusion: string;
  topFactors: TopFactor[];
  invalidationConditions: string[];
}

export interface AggregatedPrediction {
  windows: {
    '1h': AggregatedWindow;
    '4h': AggregatedWindow;
    '24h': AggregatedWindow;
  };
  consensusStrength: number;
  divergenceSummary: string[];
  aiOutputs: {
    name: string;
    windows: {
      '1h': { probUp: number; probDown: number; probFlat: number; confidence: number };
      '4h': { probUp: number; probDown: number; probFlat: number; confidence: number };
      '24h': { probUp: number; probDown: number; probFlat: number; confidence: number };
    };
    reasoning: string;
  }[];
}

// 计算标准差
function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

// 计算共识强度 (0-100)
function calculateConsensusStrength(aiResults: AIResult[]): number {
  const successfulResults = aiResults.filter(r => r.success && r.data);
  if (successfulResults.length < 2) return 0;

  // 计算各窗口的方向一致性
  const windowConsensus: number[] = [];

  for (const window of ['1h', '4h', '24h'] as const) {
    const directions = successfulResults.map(r => {
      const w = r.data!.windows[window];
      if (w.prob_up > w.prob_down && w.prob_up > w.prob_flat) return 'up';
      if (w.prob_down > w.prob_up && w.prob_down > w.prob_flat) return 'down';
      return 'flat';
    });

    // 计算最多相同方向的比例
    const counts = { up: 0, down: 0, flat: 0 };
    directions.forEach(d => counts[d as keyof typeof counts]++);
    const maxCount = Math.max(counts.up, counts.down, counts.flat);
    windowConsensus.push(maxCount / successfulResults.length);
  }

  // 平均共识度
  const avgConsensus = windowConsensus.reduce((a, b) => a + b, 0) / windowConsensus.length;

  // 概率分布的一致性
  const probStdDevs: number[] = [];
  for (const window of ['1h', '4h', '24h'] as const) {
    const probUps = successfulResults.map(r => r.data!.windows[window].prob_up);
    const probDowns = successfulResults.map(r => r.data!.windows[window].prob_down);
    probStdDevs.push(calculateStdDev(probUps));
    probStdDevs.push(calculateStdDev(probDowns));
  }
  const avgStdDev = probStdDevs.reduce((a, b) => a + b, 0) / probStdDevs.length;

  // 共识强度 = 方向一致性 * 0.6 + 概率分布一致性 * 0.4
  // 概率分布一致性 = 1 - (标准差 / 0.5) 归一化到 0-1
  const probConsistency = Math.max(0, 1 - avgStdDev / 0.3);

  return Math.round((avgConsensus * 0.6 + probConsistency * 0.4) * 100);
}

// 生成分歧摘要
function generateDivergenceSummary(aiResults: AIResult[]): string[] {
  const successfulResults = aiResults.filter(r => r.success && r.data);
  if (successfulResults.length < 2) return [];

  const summaries: string[] = [];

  // 检查各AI对4h窗口的主要分歧
  const aiDirections = successfulResults.map(r => {
    const w = r.data!.windows['4h'];
    let direction = 'neutral';
    if (w.prob_up > w.prob_down + 0.1) direction = 'bullish';
    else if (w.prob_down > w.prob_up + 0.1) direction = 'bearish';
    return { name: r.name, direction, confidence: w.confidence };
  });

  const bullishAIs = aiDirections.filter(a => a.direction === 'bullish');
  const bearishAIs = aiDirections.filter(a => a.direction === 'bearish');

  if (bullishAIs.length > 0 && bearishAIs.length > 0) {
    summaries.push(`${bullishAIs.map(a => a.name).join('/')} 偏多，${bearishAIs.map(a => a.name).join('/')} 偏空`);
  }

  // 检查置信度差异
  const confidences = aiDirections.map(a => a.confidence);
  const maxConf = Math.max(...confidences);
  const minConf = Math.min(...confidences);
  if (maxConf - minConf > 20) {
    const highConfAI = aiDirections.find(a => a.confidence === maxConf);
    const lowConfAI = aiDirections.find(a => a.confidence === minConf);
    summaries.push(`${highConfAI?.name} 置信度较高(${maxConf})，${lowConfAI?.name} 置信度较低(${minConf})`);
  }

  // 检查波动预期差异
  const expectedRanges = successfulResults.map(r => ({
    name: r.name,
    range: r.data!.windows['4h'].expected_range_pct
  }));
  const maxRange = Math.max(...expectedRanges.map(r => r.range));
  const minRange = Math.min(...expectedRanges.map(r => r.range));
  if (maxRange > minRange * 1.5 && maxRange - minRange > 0.5) {
    const highRangeAI = expectedRanges.find(r => r.range === maxRange);
    const lowRangeAI = expectedRanges.find(r => r.range === minRange);
    summaries.push(`${highRangeAI?.name} 预期波动较大(${maxRange.toFixed(1)}%)，${lowRangeAI?.name} 预期较小(${minRange.toFixed(1)}%)`);
  }

  return summaries.slice(0, 3); // 最多3条
}

// 聚合窗口预测
function aggregateWindow(
  windowData: { ai: string; data: WindowPrediction }[]
): AggregatedWindow {
  const n = windowData.length;
  if (n === 0) {
    return {
      probUp: 0.33,
      probDown: 0.33,
      probFlat: 0.34,
      probMove1pct: 0.5,
      probMove2pct: 0.2,
      expectedRangePct: 1,
      confidence: 0,
      mainConclusion: '数据不足',
      topFactors: [],
      invalidationConditions: [],
    };
  }

  // 计算平均概率
  const probUp = windowData.reduce((sum, w) => sum + w.data.prob_up, 0) / n;
  const probDown = windowData.reduce((sum, w) => sum + w.data.prob_down, 0) / n;
  const probFlat = windowData.reduce((sum, w) => sum + w.data.prob_flat, 0) / n;

  // 归一化
  const total = probUp + probDown + probFlat;
  const normalizedUp = probUp / total;
  const normalizedDown = probDown / total;
  const normalizedFlat = probFlat / total;

  // 计算平均波动概率
  const probMove1pct = windowData.reduce((sum, w) => sum + w.data.prob_move_1pct, 0) / n;
  const probMove2pct = windowData.reduce((sum, w) => sum + w.data.prob_move_2pct, 0) / n;
  const expectedRangePct = windowData.reduce((sum, w) => sum + w.data.expected_range_pct, 0) / n;

  // 计算平均置信度
  const confidence = Math.round(windowData.reduce((sum, w) => sum + w.data.confidence, 0) / n);

  // 生成主结论
  let direction = 'neutral';
  if (normalizedUp > normalizedDown + 0.1) direction = 'bullish';
  else if (normalizedDown > normalizedUp + 0.1) direction = 'bearish';

  const conclusionParts: string[] = [];
  if (direction === 'bullish') conclusionParts.push('偏多');
  else if (direction === 'bearish') conclusionParts.push('偏空');
  else conclusionParts.push('震荡');

  if (probMove2pct > 0.4) conclusionParts.push('高波动风险');
  else if (probMove1pct > 0.6) conclusionParts.push('中等波动');
  else conclusionParts.push('波动有限');

  const mainConclusion = conclusionParts.join('，');

  // 合并 top factors (去重并按强度排序)
  const allFactors: TopFactor[] = [];
  windowData.forEach(w => {
    w.data.top_factors?.forEach(f => {
      const existing = allFactors.find(ef => ef.name === f.name);
      if (existing) {
        existing.strength = Math.max(existing.strength, f.strength);
      } else {
        allFactors.push({ ...f });
      }
    });
  });
  const topFactors = allFactors
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5);

  // 合并无效条件 (去重)
  const allInvalidations = new Set<string>();
  windowData.forEach(w => {
    w.data.invalidation?.forEach(inv => allInvalidations.add(inv));
  });
  const invalidationConditions = Array.from(allInvalidations).slice(0, 5);

  return {
    probUp: normalizedUp,
    probDown: normalizedDown,
    probFlat: normalizedFlat,
    probMove1pct,
    probMove2pct,
    expectedRangePct,
    confidence,
    mainConclusion,
    topFactors,
    invalidationConditions,
  };
}

// 主聚合函数
export function aggregatePredictions(aiResults: AIResult[]): AggregatedPrediction {
  const successfulResults = aiResults.filter(r => r.success && r.data);

  // 聚合各窗口
  const windows = {
    '1h': aggregateWindow(
      successfulResults.map(r => ({ ai: r.name, data: r.data!.windows['1h'] }))
    ),
    '4h': aggregateWindow(
      successfulResults.map(r => ({ ai: r.name, data: r.data!.windows['4h'] }))
    ),
    '24h': aggregateWindow(
      successfulResults.map(r => ({ ai: r.name, data: r.data!.windows['24h'] }))
    ),
  };

  // 计算共识强度
  const consensusStrength = calculateConsensusStrength(aiResults);

  // 生成分歧摘要
  const divergenceSummary = generateDivergenceSummary(aiResults);

  // 整理各AI输出
  const aiOutputs = successfulResults.map(r => ({
    name: r.name,
    windows: {
      '1h': {
        probUp: r.data!.windows['1h'].prob_up,
        probDown: r.data!.windows['1h'].prob_down,
        probFlat: r.data!.windows['1h'].prob_flat,
        confidence: r.data!.windows['1h'].confidence,
      },
      '4h': {
        probUp: r.data!.windows['4h'].prob_up,
        probDown: r.data!.windows['4h'].prob_down,
        probFlat: r.data!.windows['4h'].prob_flat,
        confidence: r.data!.windows['4h'].confidence,
      },
      '24h': {
        probUp: r.data!.windows['24h'].prob_up,
        probDown: r.data!.windows['24h'].prob_down,
        probFlat: r.data!.windows['24h'].prob_flat,
        confidence: r.data!.windows['24h'].confidence,
      },
    },
    reasoning: r.data!.reasoning,
  }));

  return {
    windows,
    consensusStrength,
    divergenceSummary,
    aiOutputs,
  };
}
