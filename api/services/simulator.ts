import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dayjs from 'dayjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'chemical-safety.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomInRange(min, max + 1));
}

let idCounter = 0;
function generateUniqueId(prefix: string): string {
  idCounter++;
  return `${prefix}_${Date.now()}_${process.hrtime.bigint()}_${idCounter}`;
}

export function updateSensorData(): void {
  try {
    const database = getDb();
    
    const sensors = database.prepare('SELECT id, type, lab_id, threshold FROM sensors ORDER BY RANDOM() LIMIT 100').all() as {
      id: string;
      type: string;
      lab_id: string;
      threshold: number;
    }[];

    const updateStmt = database.prepare(`
      UPDATE sensors 
      SET value = ?, status = ?, timestamp = ?
      WHERE id = ?
    `);

    const now = dayjs().toISOString();

    for (const sensor of sensors) {
      let value: number;
      let status: 'normal' | 'warning' | 'alarm';

      const anomalyChance = Math.random();

      if (sensor.type === 'temperature') {
        if (anomalyChance < 0.03) {
          value = randomInRange(35, 50);
          status = 'alarm';
        } else if (anomalyChance < 0.08) {
          value = randomInRange(28, 35);
          status = 'warning';
        } else {
          value = randomInRange(18, 26);
          status = 'normal';
        }
      } else if (sensor.type === 'humidity') {
        if (anomalyChance < 0.03) {
          value = randomInRange(75, 95);
          status = 'alarm';
        } else if (anomalyChance < 0.08) {
          value = randomInRange(65, 75);
          status = 'warning';
        } else {
          value = randomInRange(35, 60);
          status = 'normal';
        }
      } else {
        if (anomalyChance < 0.02) {
          value = randomInRange(sensor.threshold * 1.5, sensor.threshold * 3);
          status = 'alarm';
        } else if (anomalyChance < 0.06) {
          value = randomInRange(sensor.threshold * 0.8, sensor.threshold);
          status = 'warning';
        } else {
          value = randomInRange(0, sensor.threshold * 0.3);
          status = 'normal';
        }
      }

      updateStmt.run(value.toFixed(2), status, now, sensor.id);

      if (status === 'alarm') {
        generateLeakAlert(sensor.lab_id, sensor.id, sensor.type, value);
      }
    }

    console.log(`[${now}] Updated ${sensors.length} sensor records`);
  } catch (error) {
    console.error('Error updating sensor data:', error);
  }
}

function generateLeakAlert(labId: string, sensorId: string, type: string, value: number): void {
  try {
    const database = getDb();

    const existingAlert = database.prepare(`
      SELECT id FROM alerts 
      WHERE lab_id = ? AND related_sensor_id = ? AND status IN ('pending', 'processing')
    `).get(labId, sensorId);

    if (existingAlert) return;

    const lab = database.prepare(`
      SELECT l.name, u.name as unit_name, p.name as province
      FROM laboratories l
      JOIN units u ON l.unit_id = u.id
      JOIN provinces p ON u.province_code = p.code
      WHERE l.id = ?
    `).get(labId) as { name: string; unit_name: string; province: string };

    if (!lab) return;

    const alertId = `alert_${Date.now()}_${randomInt(1000, 9999)}`;
    const now = dayjs();
    const deadline = now.add(30, 'minute').toISOString();

    let alertType: string;
    let title: string;
    let description: string;

    if (type === 'leak') {
      alertType = 'leak';
      title = '化学品泄漏报警';
      description = `检测到危险化学品泄漏，浓度达到 ${value.toFixed(2)} ppm，超过安全阈值，请立即处置！`;
    } else if (type === 'temperature') {
      alertType = 'temperature';
      title = '温度异常报警';
      description = `实验室温度异常，当前温度 ${value.toFixed(2)}°C，超出安全范围！`;
    } else {
      alertType = 'humidity';
      title = '湿度异常报警';
      description = `实验室湿度异常，当前湿度 ${value.toFixed(2)}%RH，超出安全范围！`;
    }

    database.prepare(`
      INSERT INTO alerts (id, lab_id, lab_name, unit_name, province, level, type, title, description, 
                         related_sensor_id, status, created_at, escalation_deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      alertId,
      labId,
      lab.name,
      lab.unit_name,
      lab.province,
      1,
      alertType,
      title,
      description,
      sensorId,
      'pending',
      now.toISOString(),
      deadline
    );

    console.log(`[${now.toISOString()}] Generated ${type} alert: ${alertId} for lab ${lab.name}`);
  } catch (error) {
    console.error('Error generating alert:', error);
  }
}

export function checkAlertEscalation(): void {
  try {
    const database = getDb();
    const now = dayjs();

    const pendingAlerts = database.prepare(`
      SELECT id, lab_id, lab_name, unit_name, province, type, title, description, 
             created_at, escalation_deadline, related_chemical_id
      FROM alerts 
      WHERE status = 'pending' AND level = 1 AND escalation_deadline <= ?
    `).all(now.toISOString()) as {
      id: string;
      lab_id: string;
      lab_name: string;
      unit_name: string;
      province: string;
      type: string;
      title: string;
      description: string;
      created_at: string;
      escalation_deadline: string;
      related_chemical_id?: string;
    }[];

    for (const alert of pendingAlerts) {
      const updateStmt = database.prepare(`
        UPDATE alerts 
        SET level = 2, status = 'escalated', escalated_at = ?
        WHERE id = ?
      `);
      updateStmt.run(now.toISOString(), alert.id);

      const approvalId = `approval_${Date.now()}_${randomInt(1000, 9999)}`;
      
      database.prepare(`
        INSERT INTO approval_flows (id, alert_id, current_step, status, created_at)
        VALUES (?, ?, 1, 'pending', ?)
      `).run(approvalId, alert.id, now.toISOString());

      const steps = [
        { step: 1, role: '实验员确认' },
        { step: 2, role: '单位负责人复核' },
        { step: 3, role: '上级主管部门批准' },
      ];

      const stepStmt = database.prepare(`
        INSERT INTO approval_steps (id, flow_id, step, role, status)
        VALUES (?, ?, ?, ?, 'pending')
      `);

      for (const s of steps) {
        stepStmt.run(`stp_${Date.now()}_${randomInt(1000, 9999)}_${s.step}`, approvalId, s.step, s.role);
      }

      const chemicals = database.prepare(`
        SELECT id FROM chemical_inventory WHERE lab_id = ? AND hazard_level IN ('high', 'critical')
      `).all(alert.lab_id) as { id: string }[];

      const chemicalIds = chemicals.map(c => c.id).join(',');
      
      database.prepare(`
        UPDATE approval_flows 
        SET sealed_chemical_ids = ? 
        WHERE id = ?
      `).run(chemicalIds, approvalId);

      console.log(`[${now.toISOString()}] Alert ${alert.id} escalated to level 2, approval flow ${approvalId} created`);
    }

    if (pendingAlerts.length > 0) {
      console.log(`[${now.toISOString()}] Escalated ${pendingAlerts.length} alerts`);
    }
  } catch (error) {
    console.error('Error checking alert escalation:', error);
  }
}

export function updateUsageRecords(): void {
  try {
    const database = getDb();
    
    if (Math.random() > 0.3) return;

    const inventory = database.prepare(`
      SELECT ci.id, ci.lab_id, ci.chemical_name, l.name as lab_name
      FROM chemical_inventory ci
      JOIN laboratories l ON ci.lab_id = l.id
      WHERE ci.current_stock > 0
      ORDER BY RANDOM()
      LIMIT 5
    `).all() as {
      id: string;
      lab_id: string;
      chemical_name: string;
      lab_name: string;
    }[];

    const users = database.prepare(`
      SELECT u.full_name FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE r.level = 'unit' LIMIT 10
    `).all() as { full_name: string }[];

    const usageStmt = database.prepare(`
      INSERT INTO usage_records (id, lab_id, lab_name, chemical_id, chemical_name, 
                                  amount, unit, user, double_lock_verified, 
                                  lock_operator1, lock_operator2, purpose, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStockStmt = database.prepare(`
      UPDATE chemical_inventory SET current_stock = current_stock - ? WHERE id = ?
    `);

    const checkLowStockStmt = database.prepare(`
      SELECT current_stock, safe_level, lab_id FROM chemical_inventory WHERE id = ?
    `);

    const now = dayjs().toISOString();

    for (const item of inventory) {
      const amount = randomInRange(0.1, 2.5);
      const doubleLockVerified = Math.random() > 0.1;
      const user = users[randomInt(0, users.length - 1)];

      const recordId = `usage_${Date.now()}_${randomInt(1000, 9999)}`;

      usageStmt.run(
        recordId,
        item.lab_id,
        item.lab_name,
        item.id,
        item.chemical_name,
        amount.toFixed(2),
        'kg',
        user.full_name,
        doubleLockVerified ? 1 : 0,
        doubleLockVerified ? user.full_name : null,
        doubleLockVerified && users.length > 1 ? users[randomInt(0, users.length - 1)].full_name : null,
        '实验研究使用',
        now
      );

      updateStockStmt.run(amount, item.id);

      const stockInfo = checkLowStockStmt.get(item.id) as {
        current_stock: number;
        safe_level: number;
        lab_id: string;
      };

      if (stockInfo.current_stock < stockInfo.safe_level) {
        generateLowStockAlert(stockInfo.lab_id, item.id, item.chemical_name);
      }
    }

    console.log(`[${now}] Generated ${inventory.length} usage records`);
  } catch (error) {
    console.error('Error updating usage records:', error);
  }
}

function generateLowStockAlert(labId: string, chemicalId: string, chemicalName: string): void {
  try {
    const database = getDb();

    const existingAlert = database.prepare(`
      SELECT id FROM alerts 
      WHERE lab_id = ? AND related_chemical_id = ? AND status IN ('pending', 'processing')
    `).get(labId, chemicalId);

    if (existingAlert) return;

    const lab = database.prepare(`
      SELECT l.name, u.name as unit_name, p.name as province, ci.current_stock, ci.safe_level
      FROM laboratories l
      JOIN units u ON l.unit_id = u.id
      JOIN provinces p ON u.province_code = p.code
      JOIN chemical_inventory ci ON ci.lab_id = l.id
      WHERE l.id = ? AND ci.id = ?
    `).get(labId, chemicalId) as { 
      name: string; 
      unit_name: string; 
      province: string;
      current_stock: number;
      safe_level: number;
    };

    if (!lab) return;

    const alertId = `alert_${Date.now()}_${randomInt(1000, 9999)}`;
    const now = dayjs();
    const deadline = now.add(30, 'minute').toISOString();

    database.prepare(`
      INSERT INTO alerts (id, lab_id, lab_name, unit_name, province, level, type, title, description, 
                         related_chemical_id, related_chemical_name, status, created_at, escalation_deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      alertId,
      labId,
      lab.name,
      lab.unit_name,
      lab.province,
      1,
      'low_stock',
      '库存不足预警',
      `化学品 ${chemicalName} 当前库存 ${lab.current_stock.toFixed(2)} kg，低于安全水位 ${lab.safe_level.toFixed(2)} kg，请及时补充！`,
      chemicalId,
      chemicalName,
      'pending',
      now.toISOString(),
      deadline
    );

    console.log(`[${now.toISOString()}] Generated low stock alert: ${alertId} for ${chemicalName}`);
  } catch (error) {
    console.error('Error generating low stock alert:', error);
  }
}

export function updateLabRiskScores(): void {
  try {
    const database = getDb();
    const now = dayjs().toISOString();

    const labs = database.prepare('SELECT id FROM laboratories').all() as { id: string }[];

    const updateStmt = database.prepare(`
      UPDATE laboratories 
      SET risk_score = ?, risk_level = ?, last_update = ?
      WHERE id = ?
    `);

    for (const lab of labs) {
      const alertCount = database.prepare(`
        SELECT COUNT(*) as count FROM alerts 
        WHERE lab_id = ? AND status IN ('pending', 'processing', 'escalated')
      `).get(lab.id) as { count: number };

      const alarmSensors = database.prepare(`
        SELECT COUNT(*) as count FROM sensors 
        WHERE lab_id = ? AND status = 'alarm'
      `).get(lab.id) as { count: number };

      const warningSensors = database.prepare(`
        SELECT COUNT(*) as count FROM sensors 
        WHERE lab_id = ? AND status = 'warning'
      `).get(lab.id) as { count: number };

      const lowStockCount = database.prepare(`
        SELECT COUNT(*) as count FROM chemical_inventory 
        WHERE lab_id = ? AND current_stock < safe_level
      `).get(lab.id) as { count: number };

      let score = 20;
      score += alertCount.count * 15;
      score += alarmSensors.count * 10;
      score += warningSensors.count * 5;
      score += lowStockCount.count * 8;
      score += randomInRange(-5, 5);
      
      score = Math.max(0, Math.min(100, score));

      let level: 'low' | 'medium' | 'high' | 'critical';
      if (score < 30) level = 'low';
      else if (score < 60) level = 'medium';
      else if (score < 85) level = 'high';
      else level = 'critical';

      updateStmt.run(score.toFixed(1), level, now, lab.id);
    }

    console.log(`[${now}] Updated risk scores for ${labs.length} laboratories`);
  } catch (error) {
    console.error('Error updating risk scores:', error);
  }
}

let sensorInterval: NodeJS.Timeout | null = null;
let escalationInterval: NodeJS.Timeout | null = null;
let usageInterval: NodeJS.Timeout | null = null;
let riskScoreInterval: NodeJS.Timeout | null = null;

export function startSimulation(): void {
  console.log('Starting real-time data simulation...');

  updateSensorData();
  checkAlertEscalation();
  updateLabRiskScores();

  sensorInterval = setInterval(updateSensorData, 15000);
  
  escalationInterval = setInterval(checkAlertEscalation, 60000);
  
  usageInterval = setInterval(updateUsageRecords, 45000);
  
  riskScoreInterval = setInterval(updateLabRiskScores, 120000);

  console.log('Simulation started successfully');
  console.log('- Sensor data updates: every 15 seconds');
  console.log('- Alert escalation checks: every 60 seconds');
  console.log('- Usage record generation: every 45 seconds');
  console.log('- Risk score updates: every 120 seconds');
}

export function stopSimulation(): void {
  console.log('Stopping real-time data simulation...');

  if (sensorInterval) {
    clearInterval(sensorInterval);
    sensorInterval = null;
  }
  if (escalationInterval) {
    clearInterval(escalationInterval);
    escalationInterval = null;
  }
  if (usageInterval) {
    clearInterval(usageInterval);
    usageInterval = null;
  }
  if (riskScoreInterval) {
    clearInterval(riskScoreInterval);
    riskScoreInterval = null;
  }

  console.log('Simulation stopped');
}

export default { startSimulation, stopSimulation };
