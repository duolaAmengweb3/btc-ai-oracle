'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatPrice } from '@/lib/utils';
import { Loader2, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import Link from 'next/link';

interface PredictionSummary {
  id: string;
  createdAt: string;
  btcPrice: number;
  dataHealthGrade: string;
  consensusStrength: number;
}

interface Stats {
  period: string;
  totalPredictions: number;
  windows: {
    [key: string]: {
      total: number;
      hits: number;
      hitRate: number;
      avgConfidence: number;
    };
  };
}

export default function HistoryPage() {
  const [predictions, setPredictions] = useState<PredictionSummary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsDays, setStatsDays] = useState(7);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [predictionsRes, statsRes] = await Promise.all([
          fetch('/api/predictions?limit=50'),
          fetch(`/api/stats?days=${statsDays}`),
        ]);

        if (predictionsRes.ok) {
          const data = await predictionsRes.json();
          setPredictions(data.predictions);
        }

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [statsDays]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--color-primary)] mx-auto mb-4" />
          <p className="text-[var(--color-text-secondary)]">加载历史数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">历史与对账</h1>
        <div className="flex gap-2">
          {[7, 30].map((days) => (
            <button
              key={days}
              onClick={() => setStatsDays(days)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statsDays === days
                  ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                  : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {days}天
            </button>
          ))}
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['1h', '4h', '24h'].map((window) => {
            const windowStats = stats.windows[window];
            if (!windowStats) return null;

            const hitRateColor = windowStats.hitRate >= 0.6
              ? 'text-green-400'
              : windowStats.hitRate >= 0.5
                ? 'text-yellow-400'
                : 'text-red-400';

            return (
              <Card key={window}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span>{window} 窗口</span>
                    <Badge variant={windowStats.hitRate >= 0.6 ? 'success' : windowStats.hitRate >= 0.5 ? 'warning' : 'danger'}>
                      {(windowStats.hitRate * 100).toFixed(0)}% 命中
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)]">总预测数</span>
                    <span className="text-[var(--color-text-primary)]">{windowStats.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)]">命中数</span>
                    <span className="text-[var(--color-bullish)]">{windowStats.hits}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--color-text-secondary)]">命中率</span>
                      <span className={hitRateColor}>{(windowStats.hitRate * 100).toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={windowStats.hitRate * 100}
                      indicatorClassName={
                        windowStats.hitRate >= 0.6
                          ? 'bg-[var(--color-bullish)]'
                          : windowStats.hitRate >= 0.5
                            ? 'bg-[var(--color-primary)]'
                            : 'bg-[var(--color-bearish)]'
                      }
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)]">平均置信度</span>
                    <span className="text-[var(--color-text-primary)]">{windowStats.avgConfidence}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 预测列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            历史预测记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          {predictions.length === 0 ? (
            <p className="text-[var(--color-text-secondary)] text-center py-8">暂无历史记录</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-3 text-[var(--color-text-secondary)] font-medium">预测ID</th>
                    <th className="text-left py-3 text-[var(--color-text-secondary)] font-medium">时间</th>
                    <th className="text-right py-3 text-[var(--color-text-secondary)] font-medium">BTC价格</th>
                    <th className="text-center py-3 text-[var(--color-text-secondary)] font-medium">数据状态</th>
                    <th className="text-center py-3 text-[var(--color-text-secondary)] font-medium">共识强度</th>
                    <th className="text-right py-3 text-[var(--color-text-secondary)] font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-hover)]">
                      <td className="py-3 font-mono text-[var(--color-text-primary)]">{p.id}</td>
                      <td className="py-3 text-[var(--color-text-secondary)]">
                        {new Date(p.createdAt).toLocaleString('zh-CN')}
                      </td>
                      <td className="py-3 text-right text-[var(--color-text-primary)]">{formatPrice(p.btcPrice)}</td>
                      <td className="py-3 text-center">
                        <Badge
                          variant={
                            p.dataHealthGrade === 'normal'
                              ? 'success'
                              : p.dataHealthGrade === 'degraded'
                                ? 'warning'
                                : 'danger'
                          }
                        >
                          {p.dataHealthGrade}
                        </Badge>
                      </td>
                      <td className="py-3 text-center">
                        <span className={
                          p.consensusStrength >= 70
                            ? 'text-[var(--color-bullish)]'
                            : p.consensusStrength >= 50
                              ? 'text-[var(--color-primary)]'
                              : 'text-[var(--color-bearish)]'
                        }>
                          {p.consensusStrength}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/prediction/${p.id}`}
                          className="text-[var(--color-primary)] hover:text-[var(--color-secondary)] transition-colors"
                        >
                          详情
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
