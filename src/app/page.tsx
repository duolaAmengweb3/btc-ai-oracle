'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries } from 'lightweight-charts';

// ============ 类型定义 ============
interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface OrderBookData {
  bids: { price: number; quantity: number }[];
  asks: { price: number; quantity: number }[];
  bidTotal: number;
  askTotal: number;
  imbalance: number;
}

interface RecentTrade {
  id: number;
  price: number;
  quantity: number;
  time: number;
  isBuyerMaker: boolean;
}

interface LiquidationData {
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  time: number;
}

interface MarketData {
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
  orderBook: OrderBookData | null;
  recentTrades: RecentTrade[];
  liquidations: LiquidationData[];
  realizedVol24h: number;
}

interface DataHealthStatus {
  grade: 'normal' | 'degraded' | 'halted';
  reason: string | null;
  details: {
    spotDataOk: boolean;
    futuresDataOk: boolean;
    latencyMs: number;
  };
}

interface FearGreedData {
  value: number;
  valueClassification: string;
}

interface CoinGeckoData {
  marketCap: number;
  ath: number;
  athChangePercentage: number;
  priceChange7d: number;
  priceChange30d: number;
}

interface NewsItem {
  title: string;
  description: string | null;
  publishedAt: string;
  kind: string;
  source?: string;
  url?: string;
}

interface ExternalData {
  fearGreed: FearGreedData | null;
  coinGecko: CoinGeckoData | null;
  news: NewsItem[];
}

interface TopFactor {
  name: string;
  direction: 'up' | 'down' | 'neutral';
  strength: number;
  evidence: string;
}

interface WindowData {
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

interface Prediction {
  id: string;
  createdAt: string;
  btcPrice: number;
  consensusStrength: number;
  windows: Record<string, WindowData>;
  aiOutputs: {
    name: string;
    windows: Record<string, { probUp: number; probDown: number; probFlat: number; confidence: number }>;
    reasoning?: string;
  }[];
}

// ============ K线图组件 ============
function KLineChart({ klines, height = 280 }: { klines: Kline[]; height?: number }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick', Time> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || klines.length === 0) return;

    if (!chartRef.current) {
      chartRef.current = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#8b949e',
        },
        grid: {
          vertLines: { color: 'rgba(33, 38, 45, 0.5)' },
          horzLines: { color: 'rgba(33, 38, 45, 0.5)' },
        },
        width: chartContainerRef.current.clientWidth,
        height: height,
        timeScale: {
          borderColor: '#21262d',
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderColor: '#21262d',
        },
        crosshair: {
          vertLine: { color: 'rgba(245, 158, 11, 0.5)', width: 1, labelBackgroundColor: '#161b22' },
          horzLine: { color: 'rgba(245, 158, 11, 0.5)', width: 1, labelBackgroundColor: '#161b22' },
        },
      });

      seriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
        upColor: '#3fb950',
        downColor: '#f85149',
        borderUpColor: '#3fb950',
        borderDownColor: '#f85149',
        wickUpColor: '#3fb950',
        wickDownColor: '#f85149',
      });
    }

    const chartData: CandlestickData[] = klines.map(k => ({
      time: (k.openTime / 1000) as Time,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    }));

    seriesRef.current?.setData(chartData);
    chartRef.current?.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [klines, height]);

  useEffect(() => {
    return () => {
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, []);

  return <div ref={chartContainerRef} className="w-full" />;
}

// ============ AI Logo 组件 ============
function AILogo({ model, size = 'md' }: { model: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const name = model.toLowerCase();

  // DeepSeek Logo
  if (name === 'deepseek') {
    return (
      <div className={`${sizeClasses[size]} rounded-xl overflow-hidden shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/20`}>
        <img src="/deepseek.jpg" alt="DeepSeek" className="w-full h-full object-cover" />
      </div>
    );
  }

  // Gemini Logo
  if (name === 'gemini') {
    return (
      <div className={`${sizeClasses[size]} rounded-xl overflow-hidden shadow-lg shadow-purple-500/30 ring-2 ring-purple-500/20`}>
        <img src="/gemini.png" alt="Gemini" className="w-full h-full object-cover" />
      </div>
    );
  }

  // Grok/xAI Logo
  if (name === 'xai' || name === 'grok') {
    return (
      <div className={`${sizeClasses[size]} rounded-xl overflow-hidden shadow-lg shadow-neutral-500/30 ring-2 ring-neutral-500/20`}>
        <img src="/grok.jpg" alt="Grok" className="w-full h-full object-cover" />
      </div>
    );
  }

  // 默认 Logo
  return (
    <div className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg`}>
      <span className="text-lg font-bold text-white">{model.charAt(0)}</span>
    </div>
  );
}

// ============ 代币侧边栏组件 ============
function TokenSidebar({ selectedToken, onSelectToken }: { selectedToken: string; onSelectToken: (token: string) => void }) {
  const tokens = [
    { symbol: 'BTC', name: 'Bitcoin', logo: '/btc.png', ringColor: 'ring-orange-500/50', available: true },
    { symbol: 'ETH', name: 'Ethereum', logo: '/eth.png', ringColor: 'ring-blue-500/50', available: false },
    { symbol: 'SOL', name: 'Solana', logo: '/sol.png', ringColor: 'ring-purple-500/50', available: false },
    { symbol: 'BNB', name: 'BNB', logo: '/bnb.png', ringColor: 'ring-yellow-500/50', available: false },
  ];

  return (
    <div className="w-[72px] flex-shrink-0 bg-[var(--color-bg-card)] border-r border-[var(--color-border)] flex flex-col items-center py-4 gap-1">
      <div className="text-[10px] text-[var(--color-text-muted)] font-medium mb-2 uppercase tracking-wider">代币</div>
      {tokens.map((token) => (
        <button
          key={token.symbol}
          onClick={() => token.available && onSelectToken(token.symbol)}
          disabled={!token.available}
          className={`relative group w-full flex flex-col items-center py-2 px-1 transition-all rounded-lg mx-1 ${
            selectedToken === token.symbol
              ? 'bg-[var(--color-primary)]/10'
              : token.available
                ? 'hover:bg-[var(--color-bg-hover)]'
                : 'cursor-not-allowed'
          }`}
        >
          {/* Logo 容器 */}
          <div className={`w-10 h-10 rounded-xl overflow-hidden transition-all ${
            selectedToken === token.symbol
              ? `ring-2 ${token.ringColor} shadow-lg`
              : token.available
                ? 'group-hover:scale-110 group-hover:shadow-md'
                : 'opacity-50 grayscale'
          }`}>
            <img src={token.logo} alt={token.name} className="w-full h-full object-cover" />
          </div>

          {/* 代币名称 */}
          <div className={`text-[11px] font-medium mt-1.5 transition-all ${
            selectedToken === token.symbol
              ? 'text-[var(--color-primary)]'
              : token.available
                ? 'text-[var(--color-text-secondary)]'
                : 'text-[var(--color-text-muted)]'
          }`}>
            {token.symbol}
          </div>

          {/* Coming Soon 悬停提示 - 只在悬停时显示 */}
          {!token.available && (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-base)]/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] text-[var(--color-accent)] font-medium">Coming Soon</span>
            </div>
          )}

          {/* 选中指示器 */}
          {selectedToken === token.symbol && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-[var(--color-primary)] rounded-l-full" />
          )}
        </button>
      ))}
    </div>
  );
}

// ============ AI 卡片组件（展示所有时间窗口） ============
function AICardCompact({
  ai,
  accuracy,
  onExpand,
}: {
  ai: Prediction['aiOutputs'][0];
  accuracy?: {
    overall: { total: number; hits: number; hitRate: number; avgConfidence: number };
    windows: Record<string, { total: number; hits: number; hitRate: number; avgConfidence: number }>;
  };
  onExpand: () => void;
}) {
  const windows = ['1h', '4h', '24h'] as const;

  const modelConfig: Record<string, { gradient: string; name: string; borderColor: string; glowColor: string }> = {
    deepseek: {
      gradient: 'from-blue-900/40 via-blue-800/20 to-transparent',
      name: 'DeepSeek',
      borderColor: 'border-blue-500/40 hover:border-blue-400/60',
      glowColor: 'hover:shadow-blue-500/20',
    },
    gemini: {
      gradient: 'from-purple-900/40 via-pink-800/20 to-transparent',
      name: 'Gemini',
      borderColor: 'border-purple-500/40 hover:border-purple-400/60',
      glowColor: 'hover:shadow-purple-500/20',
    },
    xai: {
      gradient: 'from-neutral-800/60 via-neutral-700/30 to-transparent',
      name: 'Grok',
      borderColor: 'border-neutral-500/40 hover:border-neutral-400/60',
      glowColor: 'hover:shadow-neutral-500/20',
    },
    grok: {
      gradient: 'from-neutral-800/60 via-neutral-700/30 to-transparent',
      name: 'Grok',
      borderColor: 'border-neutral-500/40 hover:border-neutral-400/60',
      glowColor: 'hover:shadow-neutral-500/20',
    },
  };

  const config = modelConfig[ai.name.toLowerCase()] || {
    gradient: 'from-slate-800/40 to-transparent',
    name: ai.name,
    borderColor: 'border-slate-600/40',
    glowColor: 'hover:shadow-slate-500/20',
  };

  // 计算平均置信度
  const avgConfidence = windows.reduce((sum, w) => {
    const win = ai.windows[w];
    return sum + (win?.confidence || 0);
  }, 0) / windows.length;

  return (
    <div
      className={`relative bg-gradient-to-br ${config.gradient} backdrop-blur-sm border-2 ${config.borderColor} rounded-2xl p-5 hover:shadow-2xl ${config.glowColor} transition-all duration-300 cursor-pointer group overflow-hidden`}
      onClick={onExpand}
    >
      {/* 背景装饰 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <AILogo model={ai.name} size="md" />
          <div>
            <div className="font-bold text-lg text-[var(--color-text-primary)]">{config.name}</div>
            <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-bullish)] animate-pulse" />
              平均置信度 {avgConfidence.toFixed(0)}%
            </div>
          </div>
        </div>
        {/* 准确率显示 */}
        <div className="text-right">
          {accuracy && accuracy.overall.total > 0 ? (
            <>
              <div className={`text-lg font-bold ${
                accuracy.overall.hitRate >= 60 ? 'text-[var(--color-bullish)]' :
                accuracy.overall.hitRate >= 40 ? 'text-[var(--color-neutral)]' :
                'text-[var(--color-bearish)]'
              }`}>
                {accuracy.overall.hitRate.toFixed(1)}%
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">
                准确率 ({accuracy.overall.hits}/{accuracy.overall.total})
              </div>
            </>
          ) : (
            <>
              <div className="text-lg font-bold text-[var(--color-text-muted)]">--</div>
              <div className="text-xs text-[var(--color-text-muted)]">准确率</div>
            </>
          )}
        </div>
      </div>

      {/* 三个时间窗口的预测 */}
      <div className="space-y-3 relative z-10">
        {windows.map((windowKey) => {
          const windowData = ai.windows[windowKey];
          if (!windowData) return null;

          const maxProb = Math.max(windowData.probUp, windowData.probDown, windowData.probFlat);
          const direction = windowData.probUp === maxProb ? 'bullish' : windowData.probDown === maxProb ? 'bearish' : 'neutral';

          return (
            <div key={windowKey} className="p-3 rounded-xl bg-[var(--color-bg-base)]/50 border border-[var(--color-border)]/50">
              {/* 时间窗口标题 */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">{windowKey} 预测</span>
                <div className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                  direction === 'bullish' ? 'bg-[var(--color-bullish)]/20 text-[var(--color-bullish)]' :
                  direction === 'bearish' ? 'bg-[var(--color-bearish)]/20 text-[var(--color-bearish)]' :
                  'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]'
                }`}>
                  {direction === 'bullish' ? '看涨' : direction === 'bearish' ? '看跌' : '震荡'}
                </div>
              </div>

              {/* 概率条 */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-6 rounded-lg overflow-hidden flex bg-[var(--color-bg-elevated)]">
                  <div
                    className="h-full bg-[var(--color-bullish)] flex items-center justify-center transition-all"
                    style={{ width: `${windowData.probUp * 100}%` }}
                  >
                    {windowData.probUp >= 0.15 && (
                      <span className="text-[10px] font-bold text-white">{(windowData.probUp * 100).toFixed(0)}%</span>
                    )}
                  </div>
                  <div
                    className="h-full bg-[var(--color-text-muted)]/30 flex items-center justify-center transition-all"
                    style={{ width: `${windowData.probFlat * 100}%` }}
                  >
                    {windowData.probFlat >= 0.15 && (
                      <span className="text-[10px] font-bold text-[var(--color-text-secondary)]">{(windowData.probFlat * 100).toFixed(0)}%</span>
                    )}
                  </div>
                  <div
                    className="h-full bg-[var(--color-bearish)] flex items-center justify-center transition-all"
                    style={{ width: `${windowData.probDown * 100}%` }}
                  >
                    {windowData.probDown >= 0.15 && (
                      <span className="text-[10px] font-bold text-white">{(windowData.probDown * 100).toFixed(0)}%</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-[var(--color-text-muted)] w-12 text-right font-mono">
                  {windowData.confidence}%
                </span>
              </div>

              {/* 图例 */}
              <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-[var(--color-text-muted)]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-[var(--color-bullish)]" />涨
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-[var(--color-text-muted)]/30" />平
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-[var(--color-bearish)]" />跌
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Brief Summary */}
      {ai.reasoning && (
        <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed relative z-10 mt-4">{ai.reasoning}</p>
      )}

      {/* Expand Hint */}
      <div className="mt-4 pt-3 border-t border-[var(--color-border)]/50 text-xs text-[var(--color-text-muted)] flex items-center justify-center gap-1 group-hover:text-[var(--color-primary)] transition-colors relative z-10">
        <span>点击查看详细分析</span>
        <svg className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

// ============ AI 详情弹窗 ============
function AIDetailModal({
  ai,
  accuracy,
  onClose,
}: {
  ai: Prediction['aiOutputs'][0];
  accuracy?: {
    overall: { total: number; hits: number; hitRate: number; avgConfidence: number };
    windows: Record<string, { total: number; hits: number; hitRate: number; avgConfidence: number }>;
  };
  onClose: () => void;
}) {
  const windows = ['1h', '4h', '24h'] as const;

  const modelNames: Record<string, string> = {
    deepseek: 'DeepSeek',
    gemini: 'Gemini',
    xai: 'Grok',
    grok: 'Grok',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-bg-base)]/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AILogo model={ai.name} size="sm" />
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{modelNames[ai.name.toLowerCase()] || ai.name} 详细分析</h3>
              <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-2">
                <span>历史准确率:</span>
                {accuracy && accuracy.overall.total > 0 ? (
                  <span className={`font-bold ${
                    accuracy.overall.hitRate >= 60 ? 'text-[var(--color-bullish)]' :
                    accuracy.overall.hitRate >= 40 ? 'text-[var(--color-neutral)]' :
                    'text-[var(--color-bearish)]'
                  }`}>
                    {accuracy.overall.hitRate.toFixed(1)}% ({accuracy.overall.hits}/{accuracy.overall.total})
                  </span>
                ) : (
                  <span className="text-[var(--color-text-muted)]">暂无数据</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--color-bg-hover)] rounded-lg transition-colors">
            <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)] space-y-6">
          {/* 所有时间窗口的预测 */}
          <div>
            <h4 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">各时间窗口预测</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {windows.map((windowKey) => {
                const windowData = ai.windows[windowKey];
                if (!windowData) return null;

                const maxProb = Math.max(windowData.probUp, windowData.probDown, windowData.probFlat);
                const direction = windowData.probUp === maxProb ? 'bullish' : windowData.probDown === maxProb ? 'bearish' : 'neutral';

                return (
                  <div key={windowKey} className="p-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-[var(--color-text-primary)]">{windowKey}</span>
                      <div className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                        direction === 'bullish' ? 'bg-[var(--color-bullish)]/20 text-[var(--color-bullish)]' :
                        direction === 'bearish' ? 'bg-[var(--color-bearish)]/20 text-[var(--color-bearish)]' :
                        'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]'
                      }`}>
                        {direction === 'bullish' ? '看涨' : direction === 'bearish' ? '看跌' : '震荡'}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--color-text-muted)]">看涨</span>
                        <div className="flex-1 mx-2 h-2 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
                          <div className="h-full bg-[var(--color-bullish)]" style={{ width: `${windowData.probUp * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono text-[var(--color-bullish)]">{(windowData.probUp * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--color-text-muted)]">震荡</span>
                        <div className="flex-1 mx-2 h-2 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
                          <div className="h-full bg-[var(--color-text-muted)]" style={{ width: `${windowData.probFlat * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono text-[var(--color-text-secondary)]">{(windowData.probFlat * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--color-text-muted)]">看跌</span>
                        <div className="flex-1 mx-2 h-2 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
                          <div className="h-full bg-[var(--color-bearish)]" style={{ width: `${windowData.probDown * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono text-[var(--color-bearish)]">{(windowData.probDown * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-[var(--color-border)]/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--color-text-muted)]">置信度</span>
                        <span className={`text-sm font-bold ${
                          windowData.confidence >= 70 ? 'text-[var(--color-bullish)]' :
                          windowData.confidence >= 50 ? 'text-[var(--color-primary)]' : 'text-[var(--color-bearish)]'
                        }`}>{windowData.confidence}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--color-text-muted)]">历史准确率</span>
                        {accuracy?.windows?.[windowKey] && accuracy.windows[windowKey].total > 0 ? (
                          <span className={`text-sm font-bold ${
                            accuracy.windows[windowKey].hitRate >= 60 ? 'text-[var(--color-bullish)]' :
                            accuracy.windows[windowKey].hitRate >= 40 ? 'text-[var(--color-neutral)]' :
                            'text-[var(--color-bearish)]'
                          }`}>
                            {accuracy.windows[windowKey].hitRate.toFixed(1)}%
                            <span className="text-xs font-normal text-[var(--color-text-muted)] ml-1">
                              ({accuracy.windows[windowKey].hits}/{accuracy.windows[windowKey].total})
                            </span>
                          </span>
                        ) : (
                          <span className="text-sm text-[var(--color-text-muted)]">--</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reasoning */}
          {ai.reasoning && (
            <div>
              <h4 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">分析推理</h4>
              <p className="text-[var(--color-text-primary)] leading-relaxed bg-[var(--color-bg-card)] p-4 rounded-xl border border-[var(--color-border)]">{ai.reasoning}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ 订单簿组件 ============
function OrderBook({ orderBook }: { orderBook: OrderBookData | null }) {
  if (!orderBook) {
    return <div className="h-32 flex items-center justify-center text-slate-400 text-sm">加载中...</div>;
  }

  const maxQty = Math.max(
    ...orderBook.bids.slice(0, 5).map(b => b.quantity),
    ...orderBook.asks.slice(0, 5).map(a => a.quantity)
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-400 mb-2 font-medium">买盘</div>
          <div className="space-y-1.5">
            {orderBook.bids.slice(0, 5).map((bid, i) => (
              <div key={i} className="relative h-6 flex items-center rounded-lg overflow-hidden bg-slate-800/30">
                <div
                  className="absolute inset-y-0 right-0 bg-gradient-to-l from-green-500/25 to-transparent"
                  style={{ width: `${(bid.quantity / maxQty) * 100}%` }}
                />
                <span className="relative text-xs font-mono text-green-400 ml-auto pr-2 z-10">
                  ${bid.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-2 font-medium">卖盘</div>
          <div className="space-y-1.5">
            {orderBook.asks.slice(0, 5).map((ask, i) => (
              <div key={i} className="relative h-6 flex items-center rounded-lg overflow-hidden bg-slate-800/30">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500/25 to-transparent"
                  style={{ width: `${(ask.quantity / maxQty) * 100}%` }}
                />
                <span className="relative text-xs font-mono text-red-400 pl-2 z-10">
                  ${ask.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-700/30 text-xs">
        <span className="text-green-400 font-medium">${(orderBook.bidTotal / 1e6).toFixed(1)}M</span>
        <span className={`font-bold ${orderBook.imbalance > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {orderBook.imbalance > 0 ? '+' : ''}{orderBook.imbalance.toFixed(1)}%
        </span>
        <span className="text-red-400 font-medium">${(orderBook.askTotal / 1e6).toFixed(1)}M</span>
      </div>
    </div>
  );
}

// ============ 恐贪指数组件 ============
function FearGreedIndex({ data }: { data: FearGreedData | null }) {
  if (!data) {
    return <div className="text-center py-4 text-slate-300 text-sm">加载中...</div>;
  }

  const getColor = (value: number) => {
    if (value <= 25) return '#EF4444';
    if (value <= 45) return '#F97316';
    if (value <= 55) return '#EAB308';
    if (value <= 75) return '#84CC16';
    return '#22C55E';
  };

  const labels: Record<string, string> = {
    'Extreme Fear': '极度恐惧',
    'Fear': '恐惧',
    'Neutral': '中性',
    'Greed': '贪婪',
    'Extreme Greed': '极度贪婪',
  };

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        <div className="text-4xl font-bold" style={{ color: getColor(data.value), textShadow: `0 0 20px ${getColor(data.value)}40` }}>
          {data.value}
        </div>
      </div>
      <div className="flex-1">
        <div className="text-sm text-slate-200 font-medium mb-2">
          {labels[data.valueClassification] || data.valueClassification}
        </div>
        <div className="relative h-2.5 rounded-full overflow-hidden bg-slate-800">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 opacity-60" />
          <div
            className="absolute top-1/2 w-3 h-3 bg-white rounded-full border-2 border-slate-800 shadow-lg transform -translate-x-1/2 -translate-y-1/2 transition-all"
            style={{ left: `${data.value}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1.5">
          <span>恐惧</span>
          <span>贪婪</span>
        </div>
      </div>
    </div>
  );
}

// ============ 实时成交组件 ============
function RecentTradesPanel({ trades }: { trades: RecentTrade[] }) {
  if (!trades || trades.length === 0) {
    return <div className="text-center py-4 text-[var(--color-text-muted)] text-sm">加载中...</div>;
  }

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-3 text-xs text-[var(--color-text-muted)] pb-2 border-b border-[var(--color-border)]/50">
        <span>价格</span>
        <span className="text-center">数量</span>
        <span className="text-right">时间</span>
      </div>
      <div className="space-y-0.5 max-h-48 overflow-y-auto">
        {trades.slice(0, 15).map((trade, i) => (
          <div key={i} className="grid grid-cols-3 text-xs py-1">
            <span className={`font-mono ${trade.isBuyerMaker ? 'text-[var(--color-bearish)]' : 'text-[var(--color-bullish)]'}`}>
              ${trade.price.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </span>
            <span className="text-center text-[var(--color-text-secondary)] font-mono">
              {trade.quantity.toFixed(4)}
            </span>
            <span className="text-right text-[var(--color-text-muted)] font-mono">
              {new Date(trade.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ 强平数据组件 ============
function LiquidationsPanel({ liquidations }: { liquidations: LiquidationData[] }) {
  if (!liquidations || liquidations.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="text-[var(--color-text-muted)] text-sm">暂无强平数据</div>
        <div className="text-xs text-[var(--color-text-muted)] mt-1">市场平稳</div>
      </div>
    );
  }

  const totalLong = liquidations.filter(l => l.side === 'SELL').reduce((sum, l) => sum + l.price * l.quantity, 0);
  const totalShort = liquidations.filter(l => l.side === 'BUY').reduce((sum, l) => sum + l.price * l.quantity, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-[var(--color-bearish)]/10 border border-[var(--color-bearish)]/20 text-center">
          <div className="text-xs text-[var(--color-text-muted)]">多头爆仓</div>
          <div className="text-sm font-bold text-[var(--color-bearish)] font-mono">${(totalLong / 1e6).toFixed(2)}M</div>
        </div>
        <div className="p-2 rounded-lg bg-[var(--color-bullish)]/10 border border-[var(--color-bullish)]/20 text-center">
          <div className="text-xs text-[var(--color-text-muted)]">空头爆仓</div>
          <div className="text-sm font-bold text-[var(--color-bullish)] font-mono">${(totalShort / 1e6).toFixed(2)}M</div>
        </div>
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {liquidations.slice(0, 8).map((liq, i) => (
          <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded bg-[var(--color-bg-elevated)]/30">
            <span className={`font-medium ${liq.side === 'SELL' ? 'text-[var(--color-bearish)]' : 'text-[var(--color-bullish)]'}`}>
              {liq.side === 'SELL' ? '多' : '空'}
            </span>
            <span className="text-[var(--color-text-secondary)] font-mono">${liq.price.toLocaleString()}</span>
            <span className="text-[var(--color-text-muted)] font-mono">{liq.quantity.toFixed(3)} BTC</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ 市场概览组件 ============
function MarketOverview({ market }: { market: { binance: MarketData; external: ExternalData } | null }) {
  if (!market) return null;

  const { binance, external } = market;

  const metrics = [
    { label: '24H 最高', value: `$${binance.high24h?.toLocaleString() || '--'}`, color: 'text-[var(--color-bullish)]' },
    { label: '24H 最低', value: `$${binance.low24h?.toLocaleString() || '--'}`, color: 'text-[var(--color-bearish)]' },
    { label: '24H 成交量', value: `${(binance.volume24h / 1000).toFixed(1)}K BTC`, color: 'text-[var(--color-text-primary)]' },
    { label: '1H 涨跌', value: `${binance.priceChange1h >= 0 ? '+' : ''}${binance.priceChange1h?.toFixed(2) || '0'}%`, color: binance.priceChange1h >= 0 ? 'text-[var(--color-bullish)]' : 'text-[var(--color-bearish)]' },
    { label: '资金费率', value: binance.fundingRate ? `${(binance.fundingRate * 100).toFixed(4)}%` : '--', color: binance.fundingRate && binance.fundingRate > 0 ? 'text-[var(--color-bullish)]' : 'text-[var(--color-bearish)]' },
    { label: '持仓量', value: binance.openInterest ? `${(binance.openInterest / 1000).toFixed(1)}K` : '--', color: 'text-[var(--color-text-primary)]' },
    { label: '24H 波动率', value: `${binance.realizedVol24h?.toFixed(1) || '--'}%`, color: 'text-[var(--color-primary)]' },
    { label: '市值', value: external.coinGecko ? `$${(external.coinGecko.marketCap / 1e12).toFixed(2)}T` : '--', color: 'text-[var(--color-text-primary)]' },
    { label: 'ATH 距离', value: external.coinGecko ? `${external.coinGecko.athChangePercentage.toFixed(1)}%` : '--', color: 'text-[var(--color-bearish)]' },
    { label: '7D 涨跌', value: external.coinGecko ? `${external.coinGecko.priceChange7d >= 0 ? '+' : ''}${external.coinGecko.priceChange7d.toFixed(1)}%` : '--', color: external.coinGecko?.priceChange7d >= 0 ? 'text-[var(--color-bullish)]' : 'text-[var(--color-bearish)]' },
    { label: '30D 涨跌', value: external.coinGecko ? `${external.coinGecko.priceChange30d >= 0 ? '+' : ''}${external.coinGecko.priceChange30d.toFixed(1)}%` : '--', color: external.coinGecko?.priceChange30d >= 0 ? 'text-[var(--color-bullish)]' : 'text-[var(--color-bearish)]' },
    { label: 'ATH 价格', value: external.coinGecko ? `$${external.coinGecko.ath.toLocaleString()}` : '--', color: 'text-[var(--color-primary)]' },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
      {metrics.map((metric, i) => (
        <div key={i} className="p-2 rounded-lg bg-[var(--color-bg-elevated)]/30 border border-[var(--color-border)]/50 text-center">
          <div className="text-[10px] text-[var(--color-text-muted)] mb-0.5">{metric.label}</div>
          <div className={`text-sm font-mono font-medium ${metric.color}`}>{metric.value}</div>
        </div>
      ))}
    </div>
  );
}

// ============ 新闻组件 ============
function NewsSection({ news }: { news: NewsItem[] }) {
  if (!news || news.length === 0) {
    return (
      <div className="text-center py-6">
        <svg className="w-8 h-8 mx-auto mb-2 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
        <p className="text-[var(--color-text-secondary)] text-sm">正在加载新闻...</p>
      </div>
    );
  }

  // 计算相对时间
  const getRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="space-y-2">
      {news.slice(0, 5).map((item, i) => (
        <a
          key={i}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 rounded-xl bg-[var(--color-bg-elevated)]/30 hover:bg-[var(--color-bg-hover)] border border-[var(--color-border)]/30 hover:border-[var(--color-border)] transition-all cursor-pointer"
        >
          <div className="text-sm text-[var(--color-text-primary)] font-medium line-clamp-2 hover:text-[var(--color-primary)] transition-colors">{item.title}</div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs text-[var(--color-text-muted)]">{getRelativeTime(item.publishedAt)}</span>
            {item.source && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-[var(--color-border)]/50">{item.source}</span>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}

// ============ 数据源状态组件 ============
function DataSourcesPanel({
  market,
  health,
  lastUpdate
}: {
  market: { binance: MarketData; external: ExternalData } | null;
  health: DataHealthStatus | null;
  lastUpdate: Date | null;
}) {
  const dataSources = [
    // Binance 现货数据
    {
      name: 'BTC/USDT 现货',
      source: 'Binance',
      status: market?.binance.btcPrice ? 'online' : 'offline',
      value: market?.binance.btcPrice ? `$${market.binance.btcPrice.toLocaleString()}` : '--'
    },
    {
      name: '1H K线数据',
      source: 'Binance',
      status: market?.binance.klines1h?.length ? 'online' : 'offline',
      value: market?.binance.klines1h?.length ? `${market.binance.klines1h.length} 根` : '--'
    },
    {
      name: '4H K线数据',
      source: 'Binance',
      status: market?.binance.klines4h?.length ? 'online' : 'offline',
      value: market?.binance.klines4h?.length ? `${market.binance.klines4h.length} 根` : '--'
    },
    {
      name: '订单簿深度',
      source: 'Binance',
      status: market?.binance.orderBook ? 'online' : 'offline',
      value: market?.binance.orderBook ? `${market.binance.orderBook.bids.length + market.binance.orderBook.asks.length} 档` : '--'
    },
    {
      name: '最近成交',
      source: 'Binance',
      status: market?.binance.recentTrades?.length ? 'online' : 'offline',
      value: market?.binance.recentTrades?.length ? `${market.binance.recentTrades.length} 笔` : '--'
    },
    // Binance 合约数据
    {
      name: '资金费率',
      source: 'Binance Futures',
      status: market?.binance.fundingRate !== null ? 'online' : 'offline',
      value: market?.binance.fundingRate ? `${(market.binance.fundingRate * 100).toFixed(4)}%` : '--'
    },
    {
      name: '持仓量',
      source: 'Binance Futures',
      status: market?.binance.openInterest !== null ? 'online' : 'offline',
      value: market?.binance.openInterest ? `${(market.binance.openInterest / 1000).toFixed(1)}K BTC` : '--'
    },
    {
      name: '强平数据',
      source: 'Binance Futures',
      status: market?.binance.liquidations !== undefined ? 'online' : 'offline',
      value: market?.binance.liquidations?.length ? `${market.binance.liquidations.length} 笔` : '0 笔'
    },
    // 外部数据源
    {
      name: '恐惧贪婪指数',
      source: 'Alternative.me',
      status: market?.external.fearGreed ? 'online' : 'offline',
      value: market?.external.fearGreed ? `${market.external.fearGreed.value}` : '--'
    },
    {
      name: '市场数据',
      source: 'CoinGecko',
      status: market?.external.coinGecko ? 'online' : 'offline',
      value: market?.external.coinGecko ? `$${(market.external.coinGecko.marketCap / 1e9).toFixed(0)}B` : '--'
    },
    {
      name: '新闻资讯',
      source: 'CryptoCompare',
      status: market?.external.news?.length ? 'online' : 'offline',
      value: market?.external.news?.length ? `${market.external.news.length} 条` : '--'
    },
  ];

  const onlineCount = dataSources.filter(d => d.status === 'online').length;
  const totalCount = dataSources.length;

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--color-text-primary)]">数据源状态</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bullish)]/15 text-[var(--color-bullish)]">
            {onlineCount}/{totalCount} 在线
          </span>
        </div>
        {health && (
          <span className={`text-xs px-2 py-0.5 rounded-lg ${
            health.grade === 'normal' ? 'bg-[var(--color-bullish)]/15 text-[var(--color-bullish)]' :
            health.grade === 'degraded' ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]' :
            'bg-[var(--color-bearish)]/15 text-[var(--color-bearish)]'
          }`}>
            {health.details.latencyMs}ms
          </span>
        )}
      </div>
      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {dataSources.map((source, i) => (
          <div
            key={i}
            className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-bg-elevated)]/50 border border-[var(--color-border)]/50"
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              source.status === 'online'
                ? 'bg-[var(--color-bullish)] shadow-sm shadow-[var(--color-bullish)]/50'
                : 'bg-[var(--color-bearish)]'
            }`} />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-[var(--color-text-primary)] truncate">{source.name}</div>
              <div className="text-[10px] text-[var(--color-text-muted)] flex items-center justify-between gap-1">
                <span className="truncate">{source.source}</span>
                <span className="text-[var(--color-text-secondary)] font-mono flex-shrink-0">{source.value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {lastUpdate && (
        <div className="px-4 py-2 border-t border-[var(--color-border)]/50 text-xs text-[var(--color-text-muted)] flex items-center justify-between">
          <span>最后更新</span>
          <span className="font-mono">{lastUpdate.toLocaleTimeString('zh-CN')}</span>
        </div>
      )}
    </div>
  );
}

// ============ 主页面 ============
export default function HomePage() {
  const [market, setMarket] = useState<{ binance: MarketData; external: ExternalData; health?: DataHealthStatus } | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [expandedAI, setExpandedAI] = useState<Prediction['aiOutputs'][0] | null>(null);
  const [selectedToken, setSelectedToken] = useState<string>('BTC');
  const [nextAnalysisCountdown, setNextAnalysisCountdown] = useState<string>('--:--');
  const [aiAccuracy, setAiAccuracy] = useState<Record<string, {
    overall: { total: number; hits: number; hitRate: number; avgConfidence: number };
    windows: Record<string, { total: number; hits: number; hitRate: number; avgConfidence: number }>;
  }> | null>(null);

  // 分析配置状态
  const [analysisConfig, setAnalysisConfig] = useState({
    // AI 模型启用状态
    models: {
      deepseek: true,
      gemini: true,
      grok: true,
    },
    // 分析温度 (0.1-1.0)
    temperature: 0.3,
    // 数据源配置
    dataSources: {
      orderBook: true,      // 订单簿深度
      liquidations: true,   // 强平数据
      fearGreed: true,      // 恐惧贪婪指数
      news: true,           // 新闻资讯
      volatility: true,     // 波动率数据
    },
    // 涨跌判定阈值 (%)
    threshold: 0.5,
    // 分析侧重点权重
    focusWeights: {
      technical: 40,   // 技术面
      sentiment: 30,   // 情绪面
      funding: 30,     // 资金面
    },
  });

  const fetchMarket = useCallback(async () => {
    try {
      const res = await fetch('/api/market');
      if (res.ok) {
        const data = await res.json();
        setMarket(data);
        setLastUpdate(new Date());
        // 缓存到 sessionStorage
        try {
          sessionStorage.setItem('btc_market_cache', JSON.stringify(data));
        } catch {}
      }
    } catch (err) {
      console.error('Market fetch error:', err);
    }
  }, []);

  const fetchPrediction = useCallback(async () => {
    try {
      const res = await fetch('/api/predictions/latest');
      if (res.ok) {
        const data = await res.json();
        setPrediction(data);
        // 缓存到 sessionStorage
        try {
          sessionStorage.setItem('btc_prediction_cache', JSON.stringify(data));
        } catch {}
      }
    } catch (err) {
      console.error('Prediction fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 页面加载时先从缓存读取数据（快速显示）
  useEffect(() => {
    try {
      const cachedMarket = sessionStorage.getItem('btc_market_cache');
      const cachedPrediction = sessionStorage.getItem('btc_prediction_cache');
      if (cachedMarket) {
        setMarket(JSON.parse(cachedMarket));
      }
      if (cachedPrediction) {
        setPrediction(JSON.parse(cachedPrediction));
        setLoading(false);
      }
    } catch {}
  }, []);

  const generatePrediction = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/predictions/generate', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          // 单次分析直接使用返回的数据，不存数据库
          setPrediction({
            id: 'manual-' + Date.now(),
            createdAt: data.createdAt,
            btcPrice: data.btcPrice,
            dataHealthGrade: data.dataHealthGrade,
            dataHealthReason: data.dataHealthReason,
            consensusStrength: data.consensusStrength,
            divergenceSummary: data.divergenceSummary,
            windows: data.windows,
            aiOutputs: data.aiOutputs,
          });
        }
      }
    } catch (err) {
      console.error('Generate error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const fetchAIAccuracy = useCallback(async () => {
    try {
      const res = await fetch('/api/stats?days=30');
      if (res.ok) {
        const data = await res.json();
        if (data.aiStats) {
          setAiAccuracy(data.aiStats);
        }
      }
    } catch (err) {
      console.error('AI stats fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchMarket();
    fetchPrediction();
    fetchAIAccuracy();
    const marketInterval = setInterval(fetchMarket, 10000);
    const predictionInterval = setInterval(fetchPrediction, 60000);
    const aiStatsInterval = setInterval(fetchAIAccuracy, 300000); // 每5分钟更新一次
    return () => {
      clearInterval(marketInterval);
      clearInterval(predictionInterval);
      clearInterval(aiStatsInterval);
    };
  }, [fetchMarket, fetchPrediction, fetchAIAccuracy]);

  // 计算下次分析倒计时（每小时整点自动分析）
  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      const diff = nextHour.getTime() - now.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setNextAnalysisCountdown(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    calculateCountdown();
    const countdownInterval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(countdownInterval);
  }, []);

  if (loading && !market) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-slate-700 border-t-amber-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-300">连接市场数据中...</p>
        </div>
      </div>
    );
  }

  const priceColor = market?.binance.priceChange24h && market.binance.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="flex -mx-6 -my-5 min-h-[calc(100vh-8rem)]">
      {/* 左侧代币侧边栏 */}
      <TokenSidebar selectedToken={selectedToken} onSelectToken={setSelectedToken} />

      {/* 主内容区 */}
      <div className="flex-1 p-5 space-y-4 overflow-auto">
        {/* ===== 顶部价格栏 ===== */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              {/* 代币 Logo */}
              <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-orange-500/30 ring-2 ring-orange-500/30">
                <img src="/btc.png" alt="Bitcoin" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-[var(--color-text-primary)] font-mono">
                    ${market?.binance.btcPrice.toLocaleString() || '---'}
                  </span>
                  <span className={`text-lg font-semibold ${priceColor}`}>
                    {market?.binance.priceChange24h !== undefined && (
                      <>{market.binance.priceChange24h >= 0 ? '+' : ''}{market.binance.priceChange24h.toFixed(2)}%</>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-bullish)] animate-pulse" />
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {selectedToken}/USDT · 更新于 {lastUpdate?.toLocaleTimeString('zh-CN') || '--:--:--'}
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-4 pl-6 border-l border-[var(--color-border)] text-sm">
              <div>
                <span className="text-[var(--color-text-muted)]">24H高 </span>
                <span className="text-[var(--color-bullish)] font-mono">${market?.binance.high24h.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">24H低 </span>
                <span className="text-[var(--color-bearish)] font-mono">${market?.binance.low24h.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">成交量 </span>
                <span className="text-[var(--color-text-primary)] font-mono">{(market?.binance.volume24h || 0 / 1000).toFixed(0)}K BTC</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={generatePrediction}
              disabled={generating}
              className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-[var(--color-bg-base)] font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
            {generating ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                分析中
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                新建分析
              </>
            )}
          </button>
        </div>
      </div>

      {/* ===== 第一行：K线图 + Prompt配置 ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* K线图 */}
        <div className="lg:col-span-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--color-text-primary)]">BTC/USDT</span>
              <span className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-elevated)] px-2 py-0.5 rounded">Binance</span>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-[var(--color-bullish)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-bullish)] animate-pulse" />
              实时
            </span>
          </div>
          <div className="flex-1 p-2">
            {market?.binance.klines1h && <KLineChart klines={market.binance.klines1h} height={380} />}
          </div>
        </div>

        {/* 分析配置面板 */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span className="font-semibold text-[var(--color-text-primary)]">分析配置</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)]">高级</span>
          </div>
          <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[500px]">
            {/* AI 模型选择 */}
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                AI 模型
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setAnalysisConfig(prev => ({
                    ...prev,
                    models: { ...prev.models, deepseek: !prev.models.deepseek }
                  }))}
                  className={`p-2 rounded-lg text-xs font-medium transition-all ${
                    analysisConfig.models.deepseek
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-[var(--color-bg-elevated)]/30 text-[var(--color-text-muted)] border border-[var(--color-border)]'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${analysisConfig.models.deepseek ? 'bg-[var(--color-bullish)]' : 'bg-[var(--color-text-muted)]/30'}`} />
                    DeepSeek
                  </div>
                </button>
                <button
                  onClick={() => setAnalysisConfig(prev => ({
                    ...prev,
                    models: { ...prev.models, gemini: !prev.models.gemini }
                  }))}
                  className={`p-2 rounded-lg text-xs font-medium transition-all ${
                    analysisConfig.models.gemini
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-[var(--color-bg-elevated)]/30 text-[var(--color-text-muted)] border border-[var(--color-border)]'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${analysisConfig.models.gemini ? 'bg-[var(--color-bullish)]' : 'bg-[var(--color-text-muted)]/30'}`} />
                    Gemini
                  </div>
                </button>
                <button
                  onClick={() => setAnalysisConfig(prev => ({
                    ...prev,
                    models: { ...prev.models, grok: !prev.models.grok }
                  }))}
                  className={`p-2 rounded-lg text-xs font-medium transition-all ${
                    analysisConfig.models.grok
                      ? 'bg-neutral-500/20 text-neutral-400 border border-neutral-500/30'
                      : 'bg-[var(--color-bg-elevated)]/30 text-[var(--color-text-muted)] border border-[var(--color-border)]'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${analysisConfig.models.grok ? 'bg-[var(--color-bullish)]' : 'bg-[var(--color-text-muted)]/30'}`} />
                    Grok
                  </div>
                </button>
              </div>
            </div>

            {/* 分析温度 */}
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  分析温度
                </span>
                <span className="font-mono text-[var(--color-primary)]">{analysisConfig.temperature.toFixed(1)}</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--color-text-muted)]">保守</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={analysisConfig.temperature}
                  onChange={(e) => setAnalysisConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  className="flex-1 h-1.5 rounded-full appearance-none bg-[var(--color-bg-elevated)] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--color-primary)] [&::-webkit-slider-thumb]:shadow-lg"
                />
                <span className="text-[10px] text-[var(--color-text-muted)]">激进</span>
              </div>
              <div className="text-[10px] text-[var(--color-text-muted)] mt-1">
                {analysisConfig.temperature <= 0.3 ? '偏向确定性分析，结论更稳定' :
                 analysisConfig.temperature <= 0.6 ? '平衡模式，兼顾稳定与灵活' : '探索性分析，可能发现新机会'}
              </div>
            </div>

            {/* 数据源配置 */}
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                数据源
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setAnalysisConfig(prev => ({
                    ...prev,
                    dataSources: { ...prev.dataSources, orderBook: !prev.dataSources.orderBook }
                  }))}
                  className={`p-1.5 rounded-lg text-[11px] transition-all flex items-center gap-1.5 ${
                    analysisConfig.dataSources.orderBook
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-text-primary)] border border-[var(--color-primary)]/30'
                      : 'bg-[var(--color-bg-elevated)]/30 text-[var(--color-text-muted)] border border-[var(--color-border)]'
                  }`}
                >
                  <span className="w-4 text-center">📊</span><span>订单簿</span>
                </button>
                <button
                  onClick={() => setAnalysisConfig(prev => ({
                    ...prev,
                    dataSources: { ...prev.dataSources, liquidations: !prev.dataSources.liquidations }
                  }))}
                  className={`p-1.5 rounded-lg text-[11px] transition-all flex items-center gap-1.5 ${
                    analysisConfig.dataSources.liquidations
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-text-primary)] border border-[var(--color-primary)]/30'
                      : 'bg-[var(--color-bg-elevated)]/30 text-[var(--color-text-muted)] border border-[var(--color-border)]'
                  }`}
                >
                  <span className="w-4 text-center">💥</span><span>强平数据</span>
                </button>
                <button
                  onClick={() => setAnalysisConfig(prev => ({
                    ...prev,
                    dataSources: { ...prev.dataSources, fearGreed: !prev.dataSources.fearGreed }
                  }))}
                  className={`p-1.5 rounded-lg text-[11px] transition-all flex items-center gap-1.5 ${
                    analysisConfig.dataSources.fearGreed
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-text-primary)] border border-[var(--color-primary)]/30'
                      : 'bg-[var(--color-bg-elevated)]/30 text-[var(--color-text-muted)] border border-[var(--color-border)]'
                  }`}
                >
                  <span className="w-4 text-center">😱</span><span>恐惧贪婪</span>
                </button>
                <button
                  onClick={() => setAnalysisConfig(prev => ({
                    ...prev,
                    dataSources: { ...prev.dataSources, news: !prev.dataSources.news }
                  }))}
                  className={`p-1.5 rounded-lg text-[11px] transition-all flex items-center gap-1.5 ${
                    analysisConfig.dataSources.news
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-text-primary)] border border-[var(--color-primary)]/30'
                      : 'bg-[var(--color-bg-elevated)]/30 text-[var(--color-text-muted)] border border-[var(--color-border)]'
                  }`}
                >
                  <span className="w-4 text-center">📰</span><span>新闻资讯</span>
                </button>
                <button
                  onClick={() => setAnalysisConfig(prev => ({
                    ...prev,
                    dataSources: { ...prev.dataSources, volatility: !prev.dataSources.volatility }
                  }))}
                  className={`p-1.5 rounded-lg text-[11px] transition-all flex items-center gap-1.5 col-span-2 ${
                    analysisConfig.dataSources.volatility
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-text-primary)] border border-[var(--color-primary)]/30'
                      : 'bg-[var(--color-bg-elevated)]/30 text-[var(--color-text-muted)] border border-[var(--color-border)]'
                  }`}
                >
                  <span className="w-4 text-center">📈</span><span>波动率指标</span>
                </button>
              </div>
            </div>

            {/* 涨跌阈值 */}
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  涨跌判定阈值
                </span>
                <span className="font-mono text-[var(--color-primary)]">±{analysisConfig.threshold}%</span>
              </label>
              <div className="flex items-center gap-1">
                {[0.3, 0.5, 1.0, 1.5, 2.0].map(val => (
                  <button
                    key={val}
                    onClick={() => setAnalysisConfig(prev => ({ ...prev, threshold: val }))}
                    className={`flex-1 py-1.5 rounded text-[10px] font-mono transition-all ${
                      analysisConfig.threshold === val
                        ? 'bg-[var(--color-primary)] text-[var(--color-bg-base)]'
                        : 'bg-[var(--color-bg-elevated)]/50 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-[var(--color-text-muted)] mt-1">
                波动 &gt;{analysisConfig.threshold}% 判定为涨/跌，否则为震荡
              </div>
            </div>

            {/* 分析侧重点 */}
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                分析侧重点
              </label>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--color-text-secondary)] w-12">技术面</span>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="5"
                    value={analysisConfig.focusWeights.technical}
                    onChange={(e) => setAnalysisConfig(prev => ({
                      ...prev,
                      focusWeights: { ...prev.focusWeights, technical: parseInt(e.target.value) }
                    }))}
                    className="flex-1 h-1 rounded-full appearance-none bg-[var(--color-bg-elevated)] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--color-primary)]"
                  />
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)] w-8 text-right">{analysisConfig.focusWeights.technical}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--color-text-secondary)] w-12">情绪面</span>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="5"
                    value={analysisConfig.focusWeights.sentiment}
                    onChange={(e) => setAnalysisConfig(prev => ({
                      ...prev,
                      focusWeights: { ...prev.focusWeights, sentiment: parseInt(e.target.value) }
                    }))}
                    className="flex-1 h-1 rounded-full appearance-none bg-[var(--color-bg-elevated)] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--color-primary)]"
                  />
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)] w-8 text-right">{analysisConfig.focusWeights.sentiment}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--color-text-secondary)] w-12">资金面</span>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="5"
                    value={analysisConfig.focusWeights.funding}
                    onChange={(e) => setAnalysisConfig(prev => ({
                      ...prev,
                      focusWeights: { ...prev.focusWeights, funding: parseInt(e.target.value) }
                    }))}
                    className="flex-1 h-1 rounded-full appearance-none bg-[var(--color-bg-elevated)] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--color-primary)]"
                  />
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)] w-8 text-right">{analysisConfig.focusWeights.funding}%</span>
                </div>
                <div className="text-[10px] text-[var(--color-text-muted)] mt-1">
                  总权重: {analysisConfig.focusWeights.technical + analysisConfig.focusWeights.sentiment + analysisConfig.focusWeights.funding}%
                  {(analysisConfig.focusWeights.technical + analysisConfig.focusWeights.sentiment + analysisConfig.focusWeights.funding) !== 100 && (
                    <span className="text-[var(--color-primary)] ml-1">(建议调整为100%)</span>
                  )}
                </div>
              </div>
            </div>

            {/* 预测时间窗口 */}
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                预测窗口
              </label>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-[var(--color-bg-elevated)]/30 border border-[var(--color-border)]">
                <span className="text-[10px] text-[var(--color-primary)] font-medium px-2 py-0.5 bg-[var(--color-primary)]/10 rounded">1h</span>
                <span className="text-[10px] text-[var(--color-primary)] font-medium px-2 py-0.5 bg-[var(--color-primary)]/10 rounded">4h</span>
                <span className="text-[10px] text-[var(--color-primary)] font-medium px-2 py-0.5 bg-[var(--color-primary)]/10 rounded">24h</span>
                <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">同时输出</span>
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="p-3 border-t border-[var(--color-border)]">
            <button
              onClick={generatePrediction}
              disabled={generating || Object.values(analysisConfig.models).every(v => !v)}
              className="w-full py-2.5 bg-gradient-to-r from-[var(--color-primary)] to-orange-500 hover:from-[var(--color-secondary)] hover:to-orange-400 text-[var(--color-bg-base)] font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  分析中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  启动 AI 单次分析
                </>
              )}
            </button>
            {Object.values(analysisConfig.models).every(v => !v) && (
              <p className="text-[10px] text-[var(--color-bearish)] text-center mt-1">请至少启用一个 AI 模型</p>
            )}
          </div>
        </div>
      </div>

      {/* ===== 第二行：AI 行情判官 - 特别突出 ===== */}
      <div className="relative">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)]/5 via-purple-500/5 to-blue-500/5 rounded-3xl -m-2" />

        <div className="relative p-2">
          {/* 标题区域 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-500/20">
                <img src="/logo.png" alt="AI行情判官" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">AI 行情判官</h2>
                <p className="text-xs text-[var(--color-text-muted)]">DeepSeek · Gemini · Grok 三大模型综合分析</p>
              </div>
            </div>

            {/* 右侧：分析时间、倒计时、共识强度 */}
            <div className="flex items-center gap-4">
              {/* 分析时间 */}
              {prediction && (
                <div className="text-right">
                  <div className="text-[10px] text-[var(--color-text-muted)]">分析时间</div>
                  <div className="text-sm font-mono text-[var(--color-text-secondary)]">
                    {new Date(prediction.createdAt).toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              )}

              {/* 下次分析倒计时 */}
              <div className="text-right px-3 py-1.5 rounded-lg bg-[var(--color-bg-elevated)]/50 border border-[var(--color-border)]">
                <div className="text-[10px] text-[var(--color-text-muted)]">下次自动分析</div>
                <div className="text-lg font-mono font-bold text-[var(--color-primary)] flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {nextAnalysisCountdown}
                </div>
              </div>

              {/* 共识强度 */}
              {prediction && (
                <div className="text-center">
                  <div className="text-[10px] text-[var(--color-text-muted)] mb-0.5">共识强度</div>
                  <div className={`px-3 py-1.5 rounded-xl font-bold text-lg ${
                    (prediction.consensusStrength || 0) >= 70 ? 'bg-[var(--color-bullish)]/20 text-[var(--color-bullish)]' :
                    (prediction.consensusStrength || 0) >= 50 ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'bg-[var(--color-bearish)]/20 text-[var(--color-bearish)]'
                  }`}>
                    {prediction.consensusStrength || '--'}%
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI 卡片 - 每个卡片显示所有时间窗口 */}
          {prediction?.aiOutputs && prediction.aiOutputs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {prediction.aiOutputs.map((ai, i) => (
                <AICardCompact
                  key={i}
                  ai={ai}
                  accuracy={aiAccuracy?.[ai.name.toLowerCase()]}
                  onExpand={() => setExpandedAI(ai)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-elevated)]/50 border-2 border-dashed border-[var(--color-border)] rounded-2xl p-12 text-center">
              <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-4 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-500/20">
                <img src="/logo.png" alt="AI行情判官" className="w-full h-full object-cover" />
              </div>
              <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">等待 AI 分析</h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4 max-w-md mx-auto">
                点击「启动分析」按钮，AI行情判官将调用 DeepSeek、Gemini、Grok 三大模型进行市场分析
              </p>
              <div className="flex items-center justify-center gap-2 mb-6 text-sm text-[var(--color-text-muted)]">
                <svg className="w-4 h-4 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                下次自动分析: <span className="font-mono font-bold text-[var(--color-primary)]">{nextAnalysisCountdown}</span>
              </div>
              <button
                onClick={generatePrediction}
                disabled={generating}
                className="px-8 py-3 bg-gradient-to-r from-[var(--color-primary)] to-orange-500 hover:from-[var(--color-secondary)] hover:to-orange-400 text-[var(--color-bg-base)] font-bold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-[var(--color-primary)]/30"
              >
                {generating ? '分析中...' : '立即启动分析'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===== 第三行：市场数据概览 ===== */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--color-text-primary)]">实时市场数据</span>
            <span className="flex items-center gap-1 text-xs text-[var(--color-bullish)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-bullish)] animate-pulse" />
              LIVE
            </span>
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">
            更新于 {lastUpdate?.toLocaleTimeString('zh-CN') || '--:--:--'}
          </span>
        </div>
        <div className="p-4">
          <MarketOverview market={market} />
        </div>
      </div>

      {/* ===== 第四行：数据源状态 ===== */}
      <DataSourcesPanel
        market={market}
        health={market?.health || null}
        lastUpdate={lastUpdate}
      />

      {/* ===== 第五行：详细数据面板 ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 订单簿 */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
            <span className="font-semibold text-[var(--color-text-primary)]">订单簿深度</span>
            <span className="text-xs text-[var(--color-text-muted)]">Binance</span>
          </div>
          <div className="p-4">
            <OrderBook orderBook={market?.binance.orderBook || null} />
          </div>
        </div>

        {/* 实时成交 */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
            <span className="font-semibold text-[var(--color-text-primary)]">实时成交</span>
            <span className="text-xs text-[var(--color-text-muted)]">最近 15 笔</span>
          </div>
          <div className="p-4">
            <RecentTradesPanel trades={market?.binance.recentTrades || []} />
          </div>
        </div>

        {/* 强平数据 */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
            <span className="font-semibold text-[var(--color-text-primary)]">合约强平</span>
            <span className="text-xs text-[var(--color-text-muted)]">Binance Futures</span>
          </div>
          <div className="p-4">
            <LiquidationsPanel liquidations={market?.binance.liquidations || []} />
          </div>
        </div>
      </div>

      {/* ===== 第六行：恐贪指数 + 新闻 ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 恐贪指数 */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
            <span className="font-semibold text-[var(--color-text-primary)]">恐惧贪婪指数</span>
            <span className="text-xs text-[var(--color-text-muted)]">Alternative.me</span>
          </div>
          <div className="p-4">
            <FearGreedIndex data={market?.external.fearGreed || null} />
          </div>
        </div>

        {/* 新闻 - 占两列 */}
        <div className="lg:col-span-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
            <span className="font-semibold text-[var(--color-text-primary)]">最新资讯</span>
            <span className="text-xs text-[var(--color-text-muted)]">CryptoCompare</span>
          </div>
          <div className="p-4 max-h-72 overflow-y-auto">
            <NewsSection news={market?.external.news || []} />
          </div>
        </div>
      </div>

        {/* ===== AI 详情弹窗 ===== */}
        {expandedAI && (
          <AIDetailModal
            ai={expandedAI}
            accuracy={aiAccuracy?.[expandedAI.name.toLowerCase()]}
            onClose={() => setExpandedAI(null)}
          />
        )}
      </div>
    </div>
  );
}
