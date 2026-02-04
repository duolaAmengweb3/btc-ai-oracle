import { MarketData } from '../market/binance';
import { ExternalData } from '../market/external';

export interface FullMarketContext {
  binance: MarketData;
  external: ExternalData;
}

export function buildPredictionPrompt(context: FullMarketContext): string {
  const { binance, external } = context;
  const {
    btcPrice,
    priceChange1h,
    priceChange24h,
    volume24h,
    high24h,
    low24h,
    fundingRate,
    openInterest,
    realizedVol1h,
    realizedVol24h,
    klines1h,
    orderBook,
    recentTrades,
    liquidations,
  } = binance;

  // 计算额外指标
  const recentKlines = klines1h.slice(-6);
  const avgVolume = recentKlines.reduce((sum, k) => sum + k.volume, 0) / recentKlines.length;
  const priceRange24h = ((high24h - low24h) / btcPrice * 100).toFixed(2);

  // 判断趋势
  const trend = priceChange1h > 0.5 ? 'uptrend' : priceChange1h < -0.5 ? 'downtrend' : 'sideways';

  // 计算动量
  const momentum = recentKlines.length >= 3
    ? ((recentKlines[recentKlines.length - 1].close - recentKlines[0].close) / recentKlines[0].close * 100).toFixed(2)
    : '0';

  // 订单簿分析
  let orderBookSection = '';
  if (orderBook) {
    const topBid = orderBook.bids[0];
    const topAsk = orderBook.asks[0];
    const spread = topAsk ? ((topAsk.price - topBid.price) / topBid.price * 100).toFixed(4) : 'N/A';
    orderBookSection = `
### 订单簿深度 (Top 20)
- 买一: $${topBid.price.toLocaleString()} x ${topBid.quantity.toFixed(3)} BTC
- 卖一: $${topAsk?.price.toLocaleString()} x ${topAsk?.quantity.toFixed(3)} BTC
- 买卖价差: ${spread}%
- 买盘总额: $${(orderBook.bidTotal / 1000000).toFixed(2)}M
- 卖盘总额: $${(orderBook.askTotal / 1000000).toFixed(2)}M
- 买卖失衡: ${orderBook.imbalance.toFixed(2)}% (正=买盘强)`;
  }

  // 最近成交分析
  let tradesSection = '';
  if (recentTrades.length > 0) {
    const buyTrades = recentTrades.filter(t => !t.isBuyerMaker);
    const sellTrades = recentTrades.filter(t => t.isBuyerMaker);
    const buyVolume = buyTrades.reduce((sum, t) => sum + t.quantity, 0);
    const sellVolume = sellTrades.reduce((sum, t) => sum + t.quantity, 0);
    const avgTradeSize = recentTrades.reduce((sum, t) => sum + t.quantity, 0) / recentTrades.length;
    tradesSection = `
### 最近成交 (50笔)
- 主动买入量: ${buyVolume.toFixed(3)} BTC (${buyTrades.length}笔)
- 主动卖出量: ${sellVolume.toFixed(3)} BTC (${sellTrades.length}笔)
- 买卖比: ${(buyVolume / (sellVolume || 1)).toFixed(2)}
- 平均单笔: ${avgTradeSize.toFixed(4)} BTC`;
  }

  // 爆仓数据
  let liquidationSection = '';
  if (liquidations.length > 0) {
    const longLiqs = liquidations.filter(l => l.side === 'SELL'); // 多头被爆
    const shortLiqs = liquidations.filter(l => l.side === 'BUY'); // 空头被爆
    const longLiqValue = longLiqs.reduce((sum, l) => sum + l.price * l.quantity, 0);
    const shortLiqValue = shortLiqs.reduce((sum, l) => sum + l.price * l.quantity, 0);
    liquidationSection = `
### 近期爆仓 (${liquidations.length}笔)
- 多头爆仓: ${longLiqs.length}笔, $${(longLiqValue / 1000).toFixed(1)}K
- 空头爆仓: ${shortLiqs.length}笔, $${(shortLiqValue / 1000).toFixed(1)}K`;
  }

  // Fear & Greed
  let fearGreedSection = '';
  if (external.fearGreed) {
    fearGreedSection = `
### 恐惧贪婪指数
- 当前值: ${external.fearGreed.value}/100 (${external.fearGreed.valueClassification})`;
  }

  // CoinGecko 数据
  let coinGeckoSection = '';
  if (external.coinGecko) {
    const cg = external.coinGecko;
    coinGeckoSection = `
### 市场概况 (CoinGecko)
- 市值: $${(cg.marketCap / 1e12).toFixed(2)}T (#${cg.marketCapRank})
- ATH: $${cg.ath.toLocaleString()} (${cg.athChangePercentage.toFixed(1)}% 距ATH)
- 7日涨跌: ${cg.priceChange7d.toFixed(2)}%
- 30日涨跌: ${cg.priceChange30d.toFixed(2)}%
- 流通量: ${(cg.circulatingSupply / 1e6).toFixed(2)}M BTC`;
  }

  // 新闻数据
  let newsSection = '';
  if (external.news.length > 0) {
    const headlines = external.news
      .filter(n => n.title && n.title.trim())
      .slice(0, 8)
      .map(n => `  - ${n.title}`)
      .join('\n');
    newsSection = `
### 最新新闻 (CryptoPanic)
- 新闻数量: ${external.news.length}条
- 热门头条:
${headlines}`;
  }

  return `你是一个专业的 BTC 市场分析师。基于以下完整市场数据，输出未来 1h/4h/24h 的结构化预测。

## 当前市场数据 (${new Date().toISOString()})

### 价格信息
- 当前价格: $${btcPrice.toLocaleString()}
- 1小时涨跌: ${priceChange1h.toFixed(2)}%
- 24小时涨跌: ${priceChange24h.toFixed(2)}%
- 24小时区间: $${low24h.toLocaleString()} - $${high24h.toLocaleString()} (${priceRange24h}%)

### 成交量与波动
- 24小时成交量: ${(volume24h / 1000).toFixed(0)}K BTC
- 近6小时平均成交量: ${(avgVolume / 1000).toFixed(1)}K BTC/h
- 1小时已实现波动率(年化): ${realizedVol1h.toFixed(1)}%
- 24小时已实现波动率(年化): ${realizedVol24h.toFixed(1)}%

### 衍生品数据
- 资金费率: ${fundingRate !== null ? (fundingRate * 100).toFixed(4) + '%' : '不可用'}
- 持仓量: ${openInterest !== null ? (openInterest / 1000).toFixed(1) + 'K BTC' : '不可用'}
${orderBookSection}
${tradesSection}
${liquidationSection}

### 技术指标
- 短期趋势: ${trend}
- 6小时动量: ${momentum}%
${fearGreedSection}
${coinGeckoSection}
${newsSection}

## 输出要求

请严格按以下 JSON 格式输出预测结果（不要添加任何其他文字）：

\`\`\`json
{
  "windows": {
    "1h": {
      "prob_up": <0.0-1.0, 上涨>+0.5%概率>,
      "prob_down": <0.0-1.0, 下跌<-0.5%概率>,
      "prob_flat": <0.0-1.0, 震荡±0.5%概率>,
      "prob_move_1pct": <0.0-1.0, 波动>=1%概率>,
      "prob_move_2pct": <0.0-1.0, 波动>=2%概率>,
      "expected_range_pct": <预期波动区间%>,
      "confidence": <0-100置信度>,
      "main_conclusion": "<一句话结论>",
      "top_factors": [
        {"name": "<因子名>", "direction": "<up/down/neutral>", "strength": <0-100>, "evidence": "<证据>"}
      ],
      "invalidation": ["<无效条件1>", "<无效条件2>"]
    },
    "4h": {
      "prob_up": <>,
      "prob_down": <>,
      "prob_flat": <>,
      "prob_move_1pct": <>,
      "prob_move_2pct": <>,
      "expected_range_pct": <>,
      "confidence": <>,
      "main_conclusion": "<>",
      "top_factors": [{"name": "<>", "direction": "<>", "strength": <>, "evidence": "<>"}],
      "invalidation": ["<>"]
    },
    "24h": {
      "prob_up": <>,
      "prob_down": <>,
      "prob_flat": <>,
      "prob_move_1pct": <>,
      "prob_move_2pct": <>,
      "expected_range_pct": <>,
      "confidence": <>,
      "main_conclusion": "<>",
      "top_factors": [{"name": "<>", "direction": "<>", "strength": <>, "evidence": "<>"}],
      "invalidation": ["<>"]
    }
  },
  "reasoning": "<整体分析思路，2-3句话>"
}
\`\`\`

## 重要规则
1. 每个窗口的 prob_up + prob_down + prob_flat 必须等于 1.0
2. 置信度基于数据质量和市场清晰度，不确定时降低置信度
3. top_factors 至少包含2个因子，每个因子必须有具体数据支撑
4. invalidation 必须是具体可验证的条件
5. 只输出JSON，不要有其他文字`;
}

export interface AIPredictionResponse {
  windows: {
    '1h': WindowPrediction;
    '4h': WindowPrediction;
    '24h': WindowPrediction;
  };
  reasoning: string;
}

export interface WindowPrediction {
  prob_up: number;
  prob_down: number;
  prob_flat: number;
  prob_move_1pct: number;
  prob_move_2pct: number;
  expected_range_pct: number;
  confidence: number;
  main_conclusion: string;
  top_factors: TopFactor[];
  invalidation: string[];
}

export interface TopFactor {
  name: string;
  direction: 'up' | 'down' | 'neutral';
  strength: number;
  evidence: string;
}

// 解析AI响应
export function parseAIResponse(response: string): AIPredictionResponse | null {
  try {
    // 尝试提取JSON
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;

    // 清理可能的非法字符
    const cleaned = jsonStr
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    // 验证结构
    if (!parsed.windows || !parsed.windows['1h'] || !parsed.windows['4h'] || !parsed.windows['24h']) {
      console.error('Invalid response structure');
      return null;
    }

    // 规范化概率（确保和为1）
    for (const window of ['1h', '4h', '24h'] as const) {
      const w = parsed.windows[window];
      const sum = w.prob_up + w.prob_down + w.prob_flat;
      if (Math.abs(sum - 1) > 0.01) {
        w.prob_up = w.prob_up / sum;
        w.prob_down = w.prob_down / sum;
        w.prob_flat = w.prob_flat / sum;
      }
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return null;
  }
}
