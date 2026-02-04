import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

let _db: BetterSQLite3Database<typeof schema> | null = null;
let _sqlite: Database.Database | null = null;

function getDbPath(): string {
  const dbPath = process.env.DATABASE_PATH || './data/btc-radar.db';
  return path.resolve(process.cwd(), dbPath);
}

function ensureDataDir() {
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function initializeTables(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS predictions (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      btc_price REAL NOT NULL,
      data_health_grade TEXT NOT NULL,
      data_health_reason TEXT,
      consensus_strength INTEGER NOT NULL,
      divergence_summary TEXT
    );

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
    );

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
    );

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
    );

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
    );

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
    );

    CREATE INDEX IF NOT EXISTS idx_prediction_windows_prediction_id ON prediction_windows(prediction_id);
    CREATE INDEX IF NOT EXISTS idx_ai_outputs_prediction_id ON ai_outputs(prediction_id);
    CREATE INDEX IF NOT EXISTS idx_settlements_prediction_id ON settlements(prediction_id);
    CREATE INDEX IF NOT EXISTS idx_ai_settlements_prediction_id ON ai_settlements(prediction_id);
    CREATE INDEX IF NOT EXISTS idx_ai_settlements_ai_name ON ai_settlements(ai_name);
    CREATE INDEX IF NOT EXISTS idx_market_data_snapshots_prediction_id ON market_data_snapshots(prediction_id);
  `);
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!_db) {
    ensureDataDir();
    const dbPath = getDbPath();
    console.log('Initializing database at:', dbPath);
    _sqlite = new Database(dbPath);
    _sqlite.pragma('journal_mode = WAL');
    _sqlite.pragma('busy_timeout = 5000');
    initializeTables(_sqlite);
    _db = drizzle(_sqlite, { schema });
  }
  return _db;
}

// 为了兼容现有代码，直接导出 getDb() 的结果
// 注意：这会在模块加载时立即初始化数据库
export const db = getDb();
