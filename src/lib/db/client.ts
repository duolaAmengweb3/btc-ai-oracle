import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

// 使用 Turso (LibSQL) - 同时支持本地开发和生产环境
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./data/btc-radar.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

// 初始化表（首次运行时）
async function initializeTables() {
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS predictions (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        btc_price REAL NOT NULL,
        data_health_grade TEXT NOT NULL,
        data_health_reason TEXT,
        consensus_strength INTEGER NOT NULL,
        divergence_summary TEXT
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS prediction_windows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prediction_id TEXT NOT NULL REFERENCES predictions(id),
        window_type TEXT NOT NULL,
        prob_up REAL NOT NULL,
        prob_down REAL NOT NULL,
        prob_flat REAL NOT NULL,
        prob_move_1pct REAL NOT NULL,
        prob_move_2pct REAL NOT NULL,
        expected_range_pct REAL NOT NULL,
        confidence INTEGER NOT NULL,
        main_conclusion TEXT NOT NULL,
        invalidation_conditions TEXT,
        top_factors TEXT
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS ai_outputs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prediction_id TEXT NOT NULL REFERENCES predictions(id),
        ai_name TEXT NOT NULL,
        window_type TEXT NOT NULL,
        prob_up REAL NOT NULL,
        prob_down REAL NOT NULL,
        prob_flat REAL NOT NULL,
        confidence INTEGER NOT NULL,
        reasoning TEXT,
        raw_response TEXT
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS settlements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prediction_id TEXT NOT NULL REFERENCES predictions(id),
        window_type TEXT NOT NULL,
        actual_return_pct REAL NOT NULL,
        actual_direction TEXT NOT NULL,
        predicted_direction TEXT NOT NULL,
        is_hit INTEGER NOT NULL,
        settled_at TEXT NOT NULL,
        start_price REAL NOT NULL,
        end_price REAL NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS ai_settlements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prediction_id TEXT NOT NULL REFERENCES predictions(id),
        ai_name TEXT NOT NULL,
        window_type TEXT NOT NULL,
        predicted_direction TEXT NOT NULL,
        actual_direction TEXT NOT NULL,
        confidence INTEGER NOT NULL,
        is_hit INTEGER NOT NULL,
        settled_at TEXT NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS market_data_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prediction_id TEXT NOT NULL REFERENCES predictions(id),
        btc_price REAL NOT NULL,
        price_change_1h REAL,
        price_change_24h REAL,
        volume_24h REAL,
        funding_rate REAL,
        open_interest REAL,
        ob_imbalance REAL,
        realized_vol REAL,
        snapshot_time TEXT NOT NULL
      )
    `);

    // 创建索引
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_prediction_windows_prediction_id ON prediction_windows(prediction_id)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_ai_outputs_prediction_id ON ai_outputs(prediction_id)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_settlements_prediction_id ON settlements(prediction_id)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_ai_settlements_prediction_id ON ai_settlements(prediction_id)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_ai_settlements_ai_name ON ai_settlements(ai_name)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_market_data_snapshots_prediction_id ON market_data_snapshots(prediction_id)`);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database tables:', error);
  }
}

// 初始化
initializeTables();
