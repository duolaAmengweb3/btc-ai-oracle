'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatProbability } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface WindowCardProps {
  windowType: '1h' | '4h' | '24h';
  data?: {
    probUp: number;
    probDown: number;
    probFlat: number;
    probMove1pct: number;
    probMove2pct: number;
    expectedRangePct: number;
    confidence: number;
    mainConclusion: string;
  };
  predictionId?: string;
  settlement?: {
    actualReturnPct: number;
    actualDirection: string;
    isHit: boolean;
  };
}

export function WindowCard({ windowType, data, predictionId, settlement }: WindowCardProps) {
  if (!data) {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-lg">{windowType}</span>
            <Badge variant="outline">无数据</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-gray-500">
            暂无预测数据
          </div>
        </CardContent>
      </Card>
    );
  }

  const mainDirection = data.probUp > data.probDown
    ? 'up'
    : data.probDown > data.probUp
      ? 'down'
      : 'flat';

  const DirectionIcon = mainDirection === 'up'
    ? TrendingUp
    : mainDirection === 'down'
      ? TrendingDown
      : Minus;

  const directionColor = mainDirection === 'up'
    ? 'text-green-400'
    : mainDirection === 'down'
      ? 'text-red-400'
      : 'text-yellow-400';

  return (
    <Card className="hover:border-gray-700 transition-colors">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">{windowType}</span>
            <DirectionIcon className={`w-5 h-5 ${directionColor}`} />
          </div>
          <Badge
            variant={data.confidence >= 70 ? 'success' : data.confidence >= 50 ? 'warning' : 'danger'}
          >
            置信度 {data.confidence}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 方向概率 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-gray-400">上涨</span>
            </span>
            <span className="text-green-400 font-medium">{formatProbability(data.probUp)}</span>
          </div>
          <Progress value={data.probUp * 100} indicatorClassName="bg-green-500" />

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <Minus className="w-3 h-3 text-yellow-400" />
              <span className="text-gray-400">震荡</span>
            </span>
            <span className="text-yellow-400 font-medium">{formatProbability(data.probFlat)}</span>
          </div>
          <Progress value={data.probFlat * 100} indicatorClassName="bg-yellow-500" />

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-red-400" />
              <span className="text-gray-400">下跌</span>
            </span>
            <span className="text-red-400 font-medium">{formatProbability(data.probDown)}</span>
          </div>
          <Progress value={data.probDown * 100} indicatorClassName="bg-red-500" />
        </div>

        {/* 波动概率 */}
        <div className="flex items-center gap-4 text-sm border-t border-gray-800 pt-3">
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-orange-400" />
            <span className="text-gray-400">波动&ge;1%:</span>
            <span className="text-orange-400 font-medium">{formatProbability(data.probMove1pct)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">波动&ge;2%:</span>
            <span className="text-orange-400 font-medium">{formatProbability(data.probMove2pct)}</span>
          </div>
        </div>

        {/* 预期区间 */}
        <div className="text-sm text-gray-400">
          预期波动区间: <span className="text-white font-medium">±{data.expectedRangePct.toFixed(1)}%</span>
        </div>

        {/* 主结论 */}
        <div className="text-sm font-medium text-white bg-gray-800/50 rounded-lg p-2">
          {data.mainConclusion}
        </div>

        {/* 结算结果（如果有） */}
        {settlement && (
          <div className={`text-sm p-2 rounded-lg ${settlement.isHit ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            实际: {settlement.actualDirection} ({settlement.actualReturnPct >= 0 ? '+' : ''}{settlement.actualReturnPct.toFixed(2)}%)
            {settlement.isHit ? ' ✓ 命中' : ' ✗ 未命中'}
          </div>
        )}

        {/* 查看详情 */}
        {predictionId && (
          <Link
            href={`/prediction/${predictionId}?window=${windowType}`}
            className="block text-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            查看证据 &rarr;
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
