import { ProxyAgent, fetch as undiciFetch } from 'undici';

const BINANCE_API = 'https://api.binance.com';
const BINANCE_FUTURES_API = 'https://fapi.binance.com';

function getProxyDispatcher() {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxy && process.env.NODE_ENV !== 'production') {
    return new ProxyAgent(proxy);
  }
  return undefined;
}

async function fetchWithProxy(url: string) {
  const dispatcher = getProxyDispatcher();
  const response = await undiciFetch(url, {
    dispatcher,
    headers: {
      'Accept': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export interface OrderBookData {
  bids: { price: number; quantity: number }[];
  asks: { price: number; quantity: number }[];
  bidTotal: number;
  askTotal: number;
  imbalance: number; // 正数=买盘强，负数=卖盘强
}

export interface RecentTrade {
  id: number;
  price: number;
  quantity: number;
  time: number;
  isBuyerMaker: boolean;
}

export interface LiquidationData {
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  time: number;
}

export interface MarketData {
  btcPrice: number;
  priceChange1h: number;
  priceChange24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  fundingRate: number | null;
  openInterest: number | null;
  klines1h: Kline[];
  klines4h: Kline[];
  realizedVol1h: number;
  realizedVol24h: number;
  orderBook: OrderBookData | null;
  recentTrades: RecentTrade[];
  liquidations: LiquidationData[];
  timestamp: string;
}

export interface DataHealthStatus {
  grade: 'normal' | 'degraded' | 'halted';
  reason: string | null;
  details: {
    spotDataOk: boolean;
    futuresDataOk: boolean;
    latencyMs: number;
  };
}

// 获取 BTC 现货价格和24h统计
async function getTickerData() {
  const data = await fetchWithProxy(`${BINANCE_API}/api/v3/ticker/24hr?symbol=BTCUSDT`) as Record<string, string>;
  return {
    price: parseFloat(data.lastPrice),
    priceChange24h: parseFloat(data.priceChangePercent),
    volume24h: parseFloat(data.volume),
    high24h: parseFloat(data.highPrice),
    low24h: parseFloat(data.lowPrice),
  };
}

// 获取K线数据
async function getKlines(interval: string, limit: number): Promise<Kline[]> {
  const data = await fetchWithProxy(
    `${BINANCE_API}/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`
  ) as (string | number)[][];
  return data.map((k) => ({
    openTime: k[0] as number,
    open: parseFloat(k[1] as string),
    high: parseFloat(k[2] as string),
    low: parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
    volume: parseFloat(k[5] as string),
    closeTime: k[6] as number,
  }));
}

// 获取资金费率
async function getFundingRate(): Promise<number | null> {
  try {
    const data = await fetchWithProxy(`${BINANCE_FUTURES_API}/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1`) as { fundingRate: string }[];
    if (data && data.length > 0) {
      return parseFloat(data[0].fundingRate);
    }
    return null;
  } catch {
    return null;
  }
}

// 获取持仓量
async function getOpenInterest(): Promise<number | null> {
  try {
    const data = await fetchWithProxy(`${BINANCE_FUTURES_API}/fapi/v1/openInterest?symbol=BTCUSDT`) as { openInterest: string };
    return parseFloat(data.openInterest);
  } catch {
    return null;
  }
}

// 获取订单簿深度
async function getOrderBook(limit: number = 20): Promise<OrderBookData | null> {
  try {
    const data = await fetchWithProxy(`${BINANCE_API}/api/v3/depth?symbol=BTCUSDT&limit=${limit}`) as {
      bids: string[][];
      asks: string[][];
    };

    const bids = data.bids.map(([price, qty]) => ({
      price: parseFloat(price),
      quantity: parseFloat(qty),
    }));

    const asks = data.asks.map(([price, qty]) => ({
      price: parseFloat(price),
      quantity: parseFloat(qty),
    }));

    const bidTotal = bids.reduce((sum, b) => sum + b.price * b.quantity, 0);
    const askTotal = asks.reduce((sum, a) => sum + a.price * a.quantity, 0);
    const total = bidTotal + askTotal;
    const imbalance = total > 0 ? ((bidTotal - askTotal) / total) * 100 : 0;

    return { bids, asks, bidTotal, askTotal, imbalance };
  } catch {
    return null;
  }
}

// 获取最近成交
async function getRecentTrades(limit: number = 50): Promise<RecentTrade[]> {
  try {
    const data = await fetchWithProxy(`${BINANCE_API}/api/v3/trades?symbol=BTCUSDT&limit=${limit}`) as {
      id: number;
      price: string;
      qty: string;
      time: number;
      isBuyerMaker: boolean;
    }[];

    return data.map((t) => ({
      id: t.id,
      price: parseFloat(t.price),
      quantity: parseFloat(t.qty),
      time: t.time,
      isBuyerMaker: t.isBuyerMaker,
    }));
  } catch {
    return [];
  }
}

// 获取强平订单 (Futures)
async function getLiquidations(): Promise<LiquidationData[]> {
  try {
    const data = await fetchWithProxy(`${BINANCE_FUTURES_API}/fapi/v1/allForceOrders?symbol=BTCUSDT&limit=20`) as {
      symbol: string;
      side: 'BUY' | 'SELL';
      price: string;
      origQty: string;
      time: number;
    }[];

    return data.map((l) => ({
      symbol: l.symbol,
      side: l.side,
      price: parseFloat(l.price),
      quantity: parseFloat(l.origQty),
      time: l.time,
    }));
  } catch {
    return [];
  }
}

// 计算已实现波动率
function calculateRealizedVol(klines: Kline[]): number {
  if (klines.length < 2) return 0;

  const returns: number[] = [];
  for (let i = 1; i < klines.length; i++) {
    const ret = Math.log(klines[i].close / klines[i - 1].close);
    returns.push(ret);
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  // 年化波动率 (假设每小时一个数据点)
  return stdDev * Math.sqrt(24 * 365) * 100;
}

// 计算1小时价格变化
function calculate1hChange(klines: Kline[], currentPrice: number): number {
  if (klines.length < 2) return 0;
  const price1hAgo = klines[klines.length - 2].close;
  return ((currentPrice - price1hAgo) / price1hAgo) * 100;
}

// 获取完整市场数据
export async function getMarketData(): Promise<{ data: MarketData; health: DataHealthStatus }> {
  const startTime = Date.now();
  let spotDataOk = true;
  let futuresDataOk = true;
  let healthReason: string | null = null;

  let ticker;
  let klines1h: Kline[] = [];
  let klines4h: Kline[] = [];
  let fundingRate: number | null = null;
  let openInterest: number | null = null;
  let orderBook: OrderBookData | null = null;
  let recentTrades: RecentTrade[] = [];
  let liquidations: LiquidationData[] = [];

  // 获取现货数据
  try {
    [ticker, klines1h, klines4h, orderBook, recentTrades] = await Promise.all([
      getTickerData(),
      getKlines('1h', 25),
      getKlines('4h', 7),
      getOrderBook(20),
      getRecentTrades(50),
    ]);
  } catch (error) {
    spotDataOk = false;
    healthReason = `Spot data fetch failed: ${error}`;
    ticker = { price: 0, priceChange24h: 0, volume24h: 0, high24h: 0, low24h: 0 };
  }

  // 获取期货数据
  try {
    [fundingRate, openInterest, liquidations] = await Promise.all([
      getFundingRate(),
      getOpenInterest(),
      getLiquidations(),
    ]);
  } catch (error) {
    futuresDataOk = false;
    if (!healthReason) {
      healthReason = `Futures data fetch failed: ${error}`;
    }
  }

  const latencyMs = Date.now() - startTime;

  // 判断健康状态
  let grade: 'normal' | 'degraded' | 'halted' = 'normal';
  if (!spotDataOk) {
    grade = 'halted';
    healthReason = 'Critical: Spot market data unavailable';
  } else if (!futuresDataOk) {
    grade = 'degraded';
    healthReason = 'Warning: Futures data unavailable, using spot data only';
  } else if (latencyMs > 10000) {
    grade = 'degraded';
    healthReason = `Warning: High latency (${latencyMs}ms)`;
  }

  const priceChange1h = calculate1hChange(klines1h, ticker.price);
  const realizedVol1h = calculateRealizedVol(klines1h.slice(-6));
  const realizedVol24h = calculateRealizedVol(klines1h);

  return {
    data: {
      btcPrice: ticker.price,
      priceChange1h,
      priceChange24h: ticker.priceChange24h,
      volume24h: ticker.volume24h,
      high24h: ticker.high24h,
      low24h: ticker.low24h,
      fundingRate,
      openInterest,
      klines1h,
      klines4h,
      realizedVol1h,
      realizedVol24h,
      orderBook,
      recentTrades,
      liquidations,
      timestamp: new Date().toISOString(),
    },
    health: {
      grade,
      reason: healthReason,
      details: {
        spotDataOk,
        futuresDataOk,
        latencyMs,
      },
    },
  };
}

// 获取特定时间点的价格（用于结算）
export async function getPriceAt(timestamp?: number): Promise<number> {
  if (!timestamp) {
    const ticker = await getTickerData();
    return ticker.price;
  }

  const endTime = timestamp + 60000;
  const data = await fetchWithProxy(
    `${BINANCE_API}/api/v3/klines?symbol=BTCUSDT&interval=1m&startTime=${timestamp}&endTime=${endTime}&limit=1`
  ) as (string | number)[][];

  if (data && data.length > 0) {
    return parseFloat(data[0][4] as string);
  }

  throw new Error('Unable to fetch price at specified time');
}
