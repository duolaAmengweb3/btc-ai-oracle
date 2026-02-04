'use client';

import { Badge } from '@/components/ui/badge';
import { formatPrice, getHealthIcon } from '@/lib/utils';
import { Copy, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface TopBarProps {
  predictionId?: string;
  btcPrice?: number;
  createdAt?: string;
  dataHealth?: {
    grade: string;
    reason: string | null;
  };
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function TopBar({
  predictionId,
  btcPrice,
  createdAt,
  dataHealth,
  onRefresh,
  isLoading,
}: TopBarProps) {
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    if (predictionId) {
      navigator.clipboard.writeText(predictionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const healthVariant = dataHealth?.grade === 'normal'
    ? 'success'
    : dataHealth?.grade === 'degraded'
      ? 'warning'
      : 'danger';

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-gray-900/80 p-4 border border-gray-800">
      <div className="flex items-center gap-6">
        {/* 当前时间 */}
        <div className="text-sm">
          <span className="text-gray-400">预测时间: </span>
          <span className="text-white font-medium">
            {createdAt ? new Date(createdAt).toLocaleString('zh-CN') : '--'}
          </span>
        </div>

        {/* BTC 价格 */}
        <div className="text-sm">
          <span className="text-gray-400">BTC: </span>
          <span className="text-white font-bold text-lg">
            {btcPrice ? formatPrice(btcPrice) : '--'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* 数据健康度 */}
        {dataHealth && (
          <Badge variant={healthVariant} className="cursor-help" title={dataHealth.reason || ''}>
            {getHealthIcon(dataHealth.grade)} {dataHealth.grade === 'normal' ? '数据正常' : dataHealth.grade === 'degraded' ? '数据降级' : '数据停止'}
          </Badge>
        )}

        {/* 预测 ID */}
        {predictionId && (
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <span>ID: {predictionId}</span>
            <button
              onClick={copyId}
              className="p-1 hover:text-white transition-colors"
              title="复制ID"
            >
              <Copy className="w-3 h-3" />
            </button>
            {copied && <span className="text-green-400 text-xs">已复制</span>}
          </div>
        )}

        {/* 刷新按钮 */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="生成新预测"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
}
