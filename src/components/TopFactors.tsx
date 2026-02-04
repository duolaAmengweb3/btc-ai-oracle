'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';

interface TopFactor {
  name: string;
  direction: 'up' | 'down' | 'neutral';
  strength: number;
  evidence: string;
}

interface TopFactorsProps {
  factors: TopFactor[];
}

export function TopFactors({ factors }: TopFactorsProps) {
  if (!factors || factors.length === 0) {
    return null;
  }

  const DirectionIcon = ({ direction }: { direction: string }) => {
    if (direction === 'up') return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (direction === 'down') return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-yellow-400" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <span>关键驱动因子 Top {Math.min(5, factors.length)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {factors.slice(0, 5).map((factor, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DirectionIcon direction={factor.direction} />
                  <span className="font-medium">{factor.name}</span>
                </div>
                <span className="text-sm text-gray-400">
                  强度: {factor.strength}
                </span>
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
        </div>
      </CardContent>
    </Card>
  );
}
