'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Bot } from 'lucide-react';

interface AIOutput {
  name: string;
  windows: {
    '1h': { probUp: number; probDown: number; probFlat: number; confidence: number };
    '4h': { probUp: number; probDown: number; probFlat: number; confidence: number };
    '24h': { probUp: number; probDown: number; probFlat: number; confidence: number };
  };
  reasoning?: string;
}

interface AIConsensusPanelProps {
  consensusStrength: number;
  divergenceSummary: string[];
  aiOutputs: AIOutput[];
}

function getDirection(probUp: number, probDown: number): 'up' | 'down' | 'flat' {
  if (probUp > probDown + 0.1) return 'up';
  if (probDown > probUp + 0.1) return 'down';
  return 'flat';
}

function DirectionBadge({ direction }: { direction: 'up' | 'down' | 'flat' }) {
  if (direction === 'up') {
    return (
      <span className="flex items-center gap-1 text-green-400">
        <TrendingUp className="w-3 h-3" />
        <span className="text-xs">多</span>
      </span>
    );
  }
  if (direction === 'down') {
    return (
      <span className="flex items-center gap-1 text-red-400">
        <TrendingDown className="w-3 h-3" />
        <span className="text-xs">空</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-yellow-400">
      <Minus className="w-3 h-3" />
      <span className="text-xs">中</span>
    </span>
  );
}

export function AIConsensusPanel({ consensusStrength, divergenceSummary, aiOutputs }: AIConsensusPanelProps) {
  const consensusVariant = consensusStrength >= 70
    ? 'success'
    : consensusStrength >= 50
      ? 'warning'
      : 'danger';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <span>AI 分歧面板</span>
          </div>
          <Badge variant={consensusVariant}>
            共识强度 {consensusStrength}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 共识强度进度条 */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">模型一致性</span>
            <span className={consensusStrength >= 70 ? 'text-green-400' : consensusStrength >= 50 ? 'text-yellow-400' : 'text-red-400'}>
              {consensusStrength}%
            </span>
          </div>
          <Progress
            value={consensusStrength}
            indicatorClassName={
              consensusStrength >= 70
                ? 'bg-green-500'
                : consensusStrength >= 50
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }
          />
        </div>

        {/* AI投票表格 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 text-gray-400 font-medium">模型</th>
                <th className="text-center py-2 text-gray-400 font-medium">1h</th>
                <th className="text-center py-2 text-gray-400 font-medium">4h</th>
                <th className="text-center py-2 text-gray-400 font-medium">24h</th>
                <th className="text-right py-2 text-gray-400 font-medium">置信度</th>
              </tr>
            </thead>
            <tbody>
              {aiOutputs.map((ai) => (
                <tr key={ai.name} className="border-b border-gray-800/50">
                  <td className="py-2 font-medium capitalize">{ai.name}</td>
                  <td className="text-center py-2">
                    <DirectionBadge direction={getDirection(ai.windows['1h'].probUp, ai.windows['1h'].probDown)} />
                  </td>
                  <td className="text-center py-2">
                    <DirectionBadge direction={getDirection(ai.windows['4h'].probUp, ai.windows['4h'].probDown)} />
                  </td>
                  <td className="text-center py-2">
                    <DirectionBadge direction={getDirection(ai.windows['24h'].probUp, ai.windows['24h'].probDown)} />
                  </td>
                  <td className="text-right py-2 text-gray-400">
                    {Math.round((ai.windows['1h'].confidence + ai.windows['4h'].confidence + ai.windows['24h'].confidence) / 3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分歧摘要 */}
        {divergenceSummary.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-400">分歧原因</h4>
            <ul className="space-y-1">
              {divergenceSummary.map((summary, index) => (
                <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  {summary}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
