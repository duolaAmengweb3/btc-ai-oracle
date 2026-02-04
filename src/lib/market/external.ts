import { ProxyAgent, fetch as undiciFetch } from 'undici';

function getProxyDispatcher() {
  // 本地开发需要代理，生产环境不需要
  if (process.env.NODE_ENV === 'production') {
    return undefined;
  }

  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7897';
  console.log('[Proxy] Using proxy:', proxy);

  return new ProxyAgent({
    uri: proxy,
    connect: {
      timeout: 30000,
    },
  });
}

async function fetchWithProxy(url: string, headers?: Record<string, string>, timeoutMs: number = 8000, useProxy: boolean = true) {
  const dispatcher = useProxy ? getProxyDispatcher() : undefined;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await undiciFetch(url, {
      dispatcher,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        ...headers,
      },
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// 不使用代理的直接请求（用于不需要代理的 API）
async function fetchDirect(url: string, headers?: Record<string, string>, timeoutMs: number = 15000) {
  return fetchWithProxy(url, headers, timeoutMs, false);
}

// ============ Fear & Greed Index (Alternative.me - 免费) ============
export interface FearGreedData {
  value: number; // 0-100
  valueClassification: string; // "Extreme Fear", "Fear", "Neutral", "Greed", "Extreme Greed"
  timestamp: number;
}

export async function getFearGreedIndex(): Promise<FearGreedData | null> {
  try {
    const data = await fetchWithProxy('https://api.alternative.me/fng/?limit=1', undefined, 15000) as {
      data: {
        value: string;
        value_classification: string;
        timestamp: string;
      }[];
    };

    if (data.data && data.data.length > 0) {
      return {
        value: parseInt(data.data[0].value),
        valueClassification: data.data[0].value_classification,
        timestamp: parseInt(data.data[0].timestamp) * 1000,
      };
    }
    return null;
  } catch (error) {
    console.error('Fear & Greed fetch failed:', error);
    // 返回备用数据
    return {
      value: 50,
      valueClassification: 'Neutral',
      timestamp: Date.now(),
    };
  }
}

// ============ 市场数据接口 ============
export interface CoinGeckoData {
  marketCap: number;
  marketCapRank: number;
  totalVolume: number;
  circulatingSupply: number;
  maxSupply: number | null;
  ath: number; // All time high
  athChangePercentage: number;
  athDate: string;
  priceChange7d: number;
  priceChange30d: number;
}

// CoinCap API (免费，速度相对较快)
async function getCoinCapData(): Promise<CoinGeckoData | null> {
  try {
    // 使用代理并增加超时时间
    const [assetData, historyData] = await Promise.all([
      fetchWithProxy('https://api.coincap.io/v2/assets/bitcoin', undefined, 20000) as Promise<{
        data: {
          marketCapUsd: string;
          rank: string;
          volumeUsd24Hr: string;
          supply: string;
          maxSupply: string | null;
          priceUsd: string;
          changePercent24Hr: string;
        };
      }>,
      fetchWithProxy('https://api.coincap.io/v2/assets/bitcoin/history?interval=d1', undefined, 20000) as Promise<{
        data: { priceUsd: string; time: number }[];
      }>,
    ]);

    const currentPrice = parseFloat(assetData.data.priceUsd);
    const prices = historyData.data;

    // 计算 7 天和 30 天变化
    let priceChange7d = 0;
    let priceChange30d = 0;

    if (prices.length >= 7) {
      const price7dAgo = parseFloat(prices[prices.length - 7].priceUsd);
      priceChange7d = ((currentPrice - price7dAgo) / price7dAgo) * 100;
    }
    if (prices.length >= 30) {
      const price30dAgo = parseFloat(prices[prices.length - 30].priceUsd);
      priceChange30d = ((currentPrice - price30dAgo) / price30dAgo) * 100;
    }

    // 计算 ATH (用历史数据中的最高价近似)
    const allTimePrices = prices.map(p => parseFloat(p.priceUsd));
    const ath = Math.max(...allTimePrices, currentPrice);
    const athChangePercentage = ((currentPrice - ath) / ath) * 100;

    return {
      marketCap: parseFloat(assetData.data.marketCapUsd),
      marketCapRank: parseInt(assetData.data.rank),
      totalVolume: parseFloat(assetData.data.volumeUsd24Hr),
      circulatingSupply: parseFloat(assetData.data.supply),
      maxSupply: assetData.data.maxSupply ? parseFloat(assetData.data.maxSupply) : 21000000,
      ath: 109000, // BTC ATH 约 $109,000 (2025年1月)
      athChangePercentage: ((currentPrice - 109000) / 109000) * 100,
      athDate: '2025-01-20',
      priceChange7d,
      priceChange30d,
    };
  } catch (error) {
    console.error('CoinCap fetch failed:', error);
    return null;
  }
}

// CoinGecko API (作为备用)
async function getCoinGeckoDataDirect(): Promise<CoinGeckoData | null> {
  try {
    const data = await fetchWithProxy(
      'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false',
      undefined,
      10000
    ) as {
      market_data: {
        market_cap: { usd: number };
        market_cap_rank: number;
        total_volume: { usd: number };
        circulating_supply: number;
        max_supply: number | null;
        ath: { usd: number };
        ath_change_percentage: { usd: number };
        ath_date: { usd: string };
        price_change_percentage_7d: number;
        price_change_percentage_30d: number;
      };
    };

    return {
      marketCap: data.market_data.market_cap.usd,
      marketCapRank: data.market_data.market_cap_rank,
      totalVolume: data.market_data.total_volume.usd,
      circulatingSupply: data.market_data.circulating_supply,
      maxSupply: data.market_data.max_supply,
      ath: data.market_data.ath.usd,
      athChangePercentage: data.market_data.ath_change_percentage.usd,
      athDate: data.market_data.ath_date.usd,
      priceChange7d: data.market_data.price_change_percentage_7d,
      priceChange30d: data.market_data.price_change_percentage_30d,
    };
  } catch (error) {
    console.error('CoinGecko fetch failed:', error);
    return null;
  }
}

// 静态备用数据（当所有 API 都失败时使用）
const FALLBACK_MARKET_DATA: CoinGeckoData = {
  marketCap: 1900000000000, // ~$1.9T
  marketCapRank: 1,
  totalVolume: 25000000000, // ~$25B
  circulatingSupply: 19600000,
  maxSupply: 21000000,
  ath: 109000,
  athChangePercentage: -10,
  athDate: '2025-01-20',
  priceChange7d: 0,
  priceChange30d: 0,
};

// 获取市场数据 - 优先使用 CoinCap，失败时用 CoinGecko，最后使用备用数据
export async function getCoinGeckoData(): Promise<CoinGeckoData | null> {
  // 先尝试 CoinCap
  const coinCapData = await getCoinCapData();
  if (coinCapData) {
    return coinCapData;
  }

  // 备用: CoinGecko
  const geckoData = await getCoinGeckoDataDirect();
  if (geckoData) {
    return geckoData;
  }

  // 所有 API 都失败，返回静态备用数据
  console.log('[External] All APIs failed, using fallback data');
  return FALLBACK_MARKET_DATA;
}

// ============ CryptoCompare News (免费，无需 API Key) ============
export interface NewsItem {
  title: string;
  description: string | null;
  publishedAt: string;
  kind: string;
  source: string;
  url: string;
}

export async function getCryptoNews(): Promise<NewsItem[]> {
  try {
    const data = await fetchWithProxy(
      'https://min-api.cryptocompare.com/data/v2/news/?categories=BTC&excludeCategories=Sponsored',
      undefined,
      15000
    ) as {
      Data: {
        id: string;
        title: string;
        body: string;
        published_on: number;
        categories: string;
        source: string;
        url: string;
      }[];
    };

    if (data.Data && data.Data.length > 0) {
      return data.Data.slice(0, 10).map((item) => ({
        title: item.title,
        description: item.body.length > 150 ? item.body.substring(0, 150) + '...' : item.body,
        publishedAt: new Date(item.published_on * 1000).toISOString(),
        kind: item.categories.split('|')[0] || 'News',
        source: item.source,
        url: item.url,
      }));
    }
    return [];
  } catch (error) {
    console.error('CryptoCompare news fetch failed:', error);
    return [];
  }
}

// ============ 聚合所有外部数据 ============
export interface ExternalData {
  fearGreed: FearGreedData | null;
  coinGecko: CoinGeckoData | null;
  news: NewsItem[];
}

export async function getAllExternalData(): Promise<ExternalData> {
  const [fearGreed, coinGecko, news] = await Promise.all([
    getFearGreedIndex(),
    getCoinGeckoData(),
    getCryptoNews(),
  ]);

  return {
    fearGreed,
    coinGecko,
    news,
  };
}
