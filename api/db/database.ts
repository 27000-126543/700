import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Created data directory: ${dataDir}`);
}

const dbPath = path.join(dataDir, 'chemical-safety.db');

export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const initSQL = `
CREATE TABLE IF NOT EXISTS provinces (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  province_code TEXT NOT NULL REFERENCES provinces(code),
  address TEXT,
  contact TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS laboratories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit_id TEXT NOT NULL REFERENCES units(id),
  manager TEXT,
  phone TEXT,
  risk_score REAL DEFAULT 0,
  risk_level TEXT DEFAULT 'low',
  sensor_count INTEGER DEFAULT 0,
  online_sensors INTEGER DEFAULT 0,
  last_update DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_labs_unit ON laboratories(unit_id);

CREATE TABLE IF NOT EXISTS chemical_inventory (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL REFERENCES laboratories(id),
  lab_name TEXT,
  chemical_name TEXT NOT NULL,
  cas_no TEXT,
  category TEXT,
  hazard_level TEXT DEFAULT 'medium',
  current_stock REAL NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'kg',
  safe_level REAL NOT NULL DEFAULT 0,
  max_capacity REAL NOT NULL DEFAULT 0,
  turnover_rate REAL DEFAULT 0,
  last_restock DATETIME,
  supplier_id TEXT,
  supplier_name TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inv_lab ON chemical_inventory(lab_id);

CREATE TABLE IF NOT EXISTS sensors (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL REFERENCES laboratories(id),
  lab_name TEXT,
  type TEXT NOT NULL CHECK(type IN ('temperature','humidity','leak')),
  location TEXT,
  value REAL NOT NULL,
  unit TEXT,
  threshold REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'normal',
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sensors_lab ON sensors(lab_id);

CREATE TABLE IF NOT EXISTS sensor_data (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL REFERENCES laboratories(id),
  sensor_id TEXT NOT NULL REFERENCES sensors(id),
  type TEXT NOT NULL CHECK(type IN ('temperature','humidity','leak')),
  value REAL NOT NULL,
  unit TEXT,
  threshold REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'normal',
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sensor_data_sensor ON sensor_data(sensor_id);
CREATE INDEX IF NOT EXISTS idx_sensor_data_lab ON sensor_data(lab_id);
CREATE INDEX IF NOT EXISTS idx_sensor_data_time ON sensor_data(timestamp);

CREATE TABLE IF NOT EXISTS usage_records (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL REFERENCES laboratories(id),
  lab_name TEXT,
  chemical_id TEXT REFERENCES chemical_inventory(id),
  chemical_name TEXT,
  amount REAL NOT NULL,
  unit TEXT,
  user TEXT NOT NULL,
  double_lock_verified INTEGER NOT NULL DEFAULT 0,
  lock_operator1 TEXT,
  lock_operator2 TEXT,
  purpose TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_usage_lab ON usage_records(lab_id);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL REFERENCES laboratories(id),
  lab_name TEXT,
  unit_name TEXT,
  province TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  related_chemical_id TEXT,
  related_chemical_name TEXT,
  related_sensor_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  escalated_at DATETIME,
  resolved_at DATETIME,
  resolved_by TEXT,
  resolution_note TEXT,
  escalation_deadline DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_lab ON alerts(lab_id);

CREATE TABLE IF NOT EXISTS approval_flows (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL REFERENCES alerts(id),
  current_step INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  sealed_chemical_ids TEXT
);

CREATE TABLE IF NOT EXISTS approval_steps (
  id TEXT PRIMARY KEY,
  flow_id TEXT NOT NULL REFERENCES approval_flows(id),
  step INTEGER NOT NULL,
  role TEXT NOT NULL,
  operator_id TEXT,
  operator_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  comment TEXT,
  operated_at DATETIME
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  license_no TEXT,
  is_qualified INTEGER NOT NULL DEFAULT 1,
  valid_until DATE,
  contact TEXT
);

CREATE TABLE IF NOT EXISTS procurement_plans (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES units(id),
  unit_name TEXT,
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  uploaded_by TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  issues TEXT
);

CREATE TABLE IF NOT EXISTS procurement_items (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES procurement_plans(id),
  chemical_name TEXT NOT NULL,
  cas_no TEXT,
  quantity REAL NOT NULL,
  unit TEXT,
  supplier_name TEXT,
  supplier_id TEXT,
  unit_price REAL,
  total_price REAL,
  expected_date DATE,
  supplier_qualified INTEGER,
  quota_check TEXT,
  capacity_check TEXT
);

CREATE TABLE IF NOT EXISTS safety_reports (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  scope_name TEXT,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  data TEXT NOT NULL,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  permissions TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role_id TEXT NOT NULL REFERENCES roles(id),
  unit_id TEXT REFERENCES units(id),
  phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  username TEXT,
  action TEXT NOT NULL,
  target TEXT,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
`;

db.exec(initSQL);

import { initMockData } from './mockData.js';

try {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    console.log('Initializing mock data...');
    initMockData();
    console.log('Mock data initialized successfully');
  } else {
    console.log('Database already has data, skipping mock initialization');
  }
} catch (error) {
  console.error('Error initializing mock data:', error);
}

export default db;
