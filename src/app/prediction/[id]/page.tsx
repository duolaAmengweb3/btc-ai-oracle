'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatPrice, formatProbability } from '@/lib/utils';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

interface Prediction {
  id: string;
  createdAt: string;
  btcPrice: number;
  dataHealth: {
    grade: string;
    reason: string | null;
  };
  consensusStrength: number;
  divergenceSummary: string[];
  windows: {
    [key: string]: WindowData;
  };
  aiOutputs: AIOutput[];
  settlements: {
    [key: string]: Settlement;
  };
  marketSnapshot?: MarketSnapshot;
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

interface TopFactor {
  name: string;
  direction: 'up' | 'down' | 'neutral';
  strength: number;
  evidence: string;
}

interface AIOutput {
  name: string;
  windows: {
    [key: string]: {
      probUp: number;
      probDown: number;
      probFlat: number;
      confidence: number;
    };
  };
  reasoning?: string;
}

interface Settlement {
  actualReturnPct: number;
  actualDirection: string;
  predictedDirection: string;
  isHit: boolean;
  settledAt: string;
  startPrice: number;
  endPrice: number;
}

interface MarketSnapshot {
  btcPrice: number;
  priceChange1h: number;
  priceChange24h: number;
  volume24h: number;
  fundingRate: number | null;
  realizedVol: number;
}

export default function PredictionDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWindow, setSelectedWindow] = useState<string>(
    searchParams.get('window') || '4h'
  );

  useEffect(() => {
    async function fetchPrediction() {
      try {
        setLoading(true);
        const res = await fetch(`/api/predictions/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setPrediction(data);
        }
      } catch (error) {
        console.error('Failed to fetch prediction:', error);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchPrediction();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">预测不存在</p>
        <Link href="/" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
          返回首页
        </Link>
      </div>
    );
  }

  const currentWindow = prediction.windows[selectedWindow];
  const settlement = prediction.settlements[selectedWindow];

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </Link>

      {/* 头部信息 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">预测详情</h1>
          <p className="text-gray-400 mt-1">
            ID: {prediction.id} | {new Date(prediction.createdAt).toLocaleString('zh-CN')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">BTC:</span>
          <span className="text-xl font-bold">{formatPrice(prediction.btcPrice)}</span>
        </div>
      </div>

      {/* 窗口选择 */}
      <div className="flex gap-2">
        {['1h', '4h', '24h'].map((window) => (
          <button
            key={window}
            onClick={() => setSelectedWindow(window)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedWindow === window
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {window}
          </button>
        ))}
      </div>

      {currentWindow ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 预测结果 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{selectedWindow} 预测结果</span>
                <Badge
                  variant={currentWindow.confidence >= 70 ? 'success' : currentWindow.confidence >= 50 ? 'warning' : 'danger'}
                >
                  置信度 {currentWindow.confidence}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 方向概率 */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      上涨 (&gt;+0.5%)
                    </span>
                    <span className="text-green-400">{formatProbability(currentWindow.probUp)}</span>
                  </div>
                  <Progress value={currentWindow.probUp * 100} indicatorClassName="bg-green-500" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1">
                      <Minus className="w-4 h-4 text-yellow-400" />
                      震荡 (±0.5%)
                    </span>
                    <span className="text-yellow-400">{formatProbability(currentWindow.probFlat)}</span>
                  </div>
                  <Progress value={currentWindow.probFlat * 100} indicatorClassName="bg-yellow-500" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1">
                      <TrendingDown className="w-4 h-4 text-red-400" />
                      下跌 (&lt;-0.5%)
                    </span>
                    <span className="text-red-400">{formatProbability(currentWindow.probDown)}</span>
                  </div>
                  <Progress value={currentWindow.probDown * 100} indicatorClassName="bg-red-500" />
                </div>
              </div>

              {/* 波动概率 */}
              <div className="border-t border-gray-800 pt-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-400 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  波动事件概率
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-orange-400">
                      {formatProbability(currentWindow.probMove1pct)}
                    </div>
                    <div className="text-xs text-gray-400">波动 &ge; 1%</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-orange-400">
                      {formatProbability(currentWindow.probMove2pct)}
                    </div>
                    <div className="text-xs text-gray-400">波动 &ge; 2%</div>
                  </div>
                </div>
              </div>

              {/* 主结论 */}
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
                <p className="font-medium">{currentWindow.mainConclusion}</p>
              </div>
            </CardContent>
          </Card>

          {/* 结算结果（如果有） */}
          {settlement ? (
            <Card className={settlement.isHit ? 'border-green-800' : 'border-red-800'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {settlement.isHit ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  结算结果
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">预测方向</div>
                    <div className="text-lg font-medium capitalize">{settlement.predictedDirection}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">实际方向</div>
                    <div className="text-lg font-medium capitalize">{settlement.actualDirection}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">起始价格</div>
                    <div className="text-lg font-medium">{formatPrice(settlement.startPrice)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">结束价格</div>
                    <div className="text-lg font-medium">{formatPrice(settlement.endPrice)}</div>
                  </div>
                </div>
                <div className="text-center py-4 border-t border-gray-800">
                  <div className="text-3xl font-bold">
                    <span className={settlement.actualReturnPct >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {settlement.actualReturnPct >= 0 ? '+' : ''}{settlement.actualReturnPct.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 mt-1">实际收益率</div>
                </div>
                <div className={`text-center py-2 rounded-lg ${settlement.isHit ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                  {settlement.isHit ? '预测命中' : '预测未命中'}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>等待结算</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">该窗口尚未到期，无法结算</p>
              </CardContent>
            </Card>
          )}

          {/* 驱动因子 */}
          {currentWindow.topFactors && currentWindow.topFactors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  关键驱动因子
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentWindow.topFactors.map((factor, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {factor.direction === 'up' ? (
                          <TrendingUp className="w-4 h-4 text-green-400" />
                        ) : factor.direction === 'down' ? (
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        ) : (
                          <Minus className="w-4 h-4 text-yellow-400" />
                        )}
                        <span className="font-medium">{factor.name}</span>
                      </div>
                      <span className="text-sm text-gray-400">强度: {factor.strength}</span>
                    </div>
                    <Progress
                      value={factor.strength}
                      indicatorClassName={
                        factor.direction === 'up'
                          ? 'bg-green-500'
                          : factor.direction === 'down'
                            ? 'bg-red-500'
                            : 'bg-yellow-500'
                      }
                    />
                    <p className="text-sm text-gray-400">{factor.evidence}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 无效条件 */}
          {currentWindow.invalidationConditions && currentWindow.invalidationConditions.length > 0 && (
            <Card className="border-orange-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-400">
                  <AlertTriangle className="w-5 h-5" />
                  无效条件
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {currentWindow.invalidationConditions.map((condition, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-orange-400 mt-0.5">•</span>
                      <span className="text-gray-300">{condition}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            该窗口无预测数据
          </CardContent>
        </Card>
      )}

      {/* AI 分析摘要 */}
      {prediction.aiOutputs && prediction.aiOutputs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI 分析摘要</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {prediction.aiOutputs.map((ai) => (
              <div key={ai.name} className="border-b border-gray-800 pb-4 last:border-0 last:pb-0">
                <h4 className="font-medium capitalize mb-2">{ai.name}</h4>
                {ai.reasoning && (
                  <p className="text-sm text-gray-400">{ai.reasoning}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
