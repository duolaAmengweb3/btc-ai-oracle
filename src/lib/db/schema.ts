import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// 预测记录主表
export const predictions = sqliteTable('predictions', {
  id: text('id').primaryKey(), // 格式: YYYYMMDDHH
  createdAt: text('created_at').notNull(),
  btcPrice: real('btc_price').notNull(),
  dataHealthGrade: text('data_health_grade').notNull(), // normal / degraded / halted
  dataHealthReason: text('data_health_reason'),
  consensusStrength: integer('consensus_strength').notNull(), // 0-100
  divergenceSummary: text('divergence_summary'), // JSON array
});

// 三窗口预测详情
export const predictionWindows = sqliteTable('prediction_windows', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  predictionId: text('prediction_id').notNull().references(() => predictions.id),
  windowType: text('window_type').notNull(), // 1h / 4h / 24h
  probUp: real('prob_up').notNull(),
  probDown: real('prob_down').notNull(),
  probFlat: real('prob_flat').notNull(),
  probMove1pct: real('prob_move_1pct').notNull(),
  probMove2pct: real('prob_move_2pct').notNull(),
  expectedRangePct: real('expected_range_pct').notNull(),
  confidence: integer('confidence').notNull(), // 0-100
  mainConclusion: text('main_conclusion').notNull(),
  invalidationConditions: text('invalidation_conditions'), // JSON array
  topFactors: text('top_factors'), // JSON array
});

// 各AI原始输出
export const aiOutputs = sqliteTable('ai_outputs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  predictionId: text('prediction_id').notNull().references(() => predictions.id),
  aiName: text('ai_name').notNull(), // deepseek / gemini / xai
  windowType: text('window_type').notNull(), // 1h / 4h / 24h
  probUp: real('prob_up').notNull(),
  probDown: real('prob_down').notNull(),
  probFlat: real('prob_flat').notNull(),
  confidence: integer('confidence').notNull(),
  reasoning: text('reasoning'),
  rawResponse: text('raw_response'), // JSON
});

// 对账结算记录
export const settlements = sqliteTable('settlements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  predictionId: text('prediction_id').notNull().references(() => predictions.id),
  windowType: text('window_type').notNull(), // 1h / 4h / 24h
  actualReturnPct: real('actual_return_pct').notNull(),
  actualDirection: text('actual_direction').notNull(), // up / down / flat
  predictedDirection: text('predicted_direction').notNull(),
  isHit: integer('is_hit').notNull(), // 0/1
  settledAt: text('settled_at').notNull(),
  startPrice: real('start_price').notNull(),
  endPrice: real('end_price').notNull(),
});

// AI 单独结算记录（跟踪每个 AI 的准确率）
export const aiSettlements = sqliteTable('ai_settlements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  predictionId: text('prediction_id').notNull().references(() => predictions.id),
  aiName: text('ai_name').notNull(), // deepseek / gemini / xai
  windowType: text('window_type').notNull(), // 1h / 4h / 24h
  predictedDirection: text('predicted_direction').notNull(), // up / down / flat
  actualDirection: text('actual_direction').notNull(), // up / down / flat
  confidence: integer('confidence').notNull(), // AI 的置信度
  isHit: integer('is_hit').notNull(), // 0/1 是否预测正确
  settledAt: text('settled_at').notNull(),
});

// 市场数据快照
export const marketDataSnapshots = sqliteTable('market_data_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  predictionId: text('prediction_id').notNull().references(() => predictions.id),
  btcPrice: real('btc_price').notNull(),
  priceChange1h: real('price_change_1h'),
  priceChange24h: real('price_change_24h'),
  volume24h: real('volume_24h'),
  fundingRate: real('funding_rate'),
  openInterest: real('open_interest'),
  obImbalance: real('ob_imbalance'),
  realizedVol: real('realized_vol'),
  snapshotTime: text('snapshot_time').notNull(),
});

// 类型导出
export type Prediction = typeof predictions.$inferSelect;
export type NewPrediction = typeof predictions.$inferInsert;
export type PredictionWindow = typeof predictionWindows.$inferSelect;
export type AIOutput = typeof aiOutputs.$inferSelect;
export type Settlement = typeof settlements.$inferSelect;
export type AISettlement = typeof aiSettlements.$inferSelect;
export type MarketDataSnapshot = typeof marketDataSnapshots.$inferSelect;
