import { Router } from 'express';
import dayjs from 'dayjs';
import { db } from '../db/database';
import { success, paginated } from '../utils/response';

const router = Router();

router.get('/', (req, res) => {
  const { labId, category, ids, page = 1, pageSize = 20 } = req.query;

  let where = '1=1';
  const params: any[] = [];

  if (ids) {
    const idList = Array.isArray(ids) ? ids : String(ids).split(',');
    const placeholders = idList.map(() => '?').join(',');
    where += ` AND id IN (${placeholders})`;
    params.push(...idList);
  }
  if (labId) {
    where += ' AND lab_id = ?';
    params.push(labId);
  }
  if (category) {
    where += ' AND category = ?';
    params.push(category);
  }

  const countStmt = db.prepare(
    `SELECT COUNT(*) as count FROM chemical_inventory WHERE ${where}`,
  );
  const total = (countStmt.get(...params) as any).count;

  const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const items = db
    .prepare(
      `SELECT * FROM chemical_inventory WHERE ${where} ORDER BY current_stock DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, parseInt(pageSize as string), offset)
    .map((item: any) => ({
      id: item.id,
      labId: item.lab_id,
      labName: item.lab_name,
      chemicalName: item.chemical_name,
      casNo: item.cas_no,
      category: item.category,
      hazardLevel: item.hazard_level,
      currentStock: item.current_stock,
      safeLevel: item.safe_level,
      maxCapacity: item.max_capacity,
      unit: item.unit,
      turnoverRate: item.turnover_rate,
      lastRestock: item.last_restock,
      supplierId: item.supplier_id,
      supplierName: item.supplier_name,
      updatedAt: item.updated_at,
    }));

  if (ids) {
    success(res, items);
  } else {
    paginated(res, items, total, parseInt(page as string), parseInt(pageSize as string));
  }
});

router.get('/turnover', (req, res) => {
  const { unitId, days = 30 } = req.query;

  let sql = `
    SELECT 
      l.id as lab_id,
      l.name as lab_name,
      u.name as unit_name,
      AVG(ci.turnover_rate) as rate,
      SUM(ci.current_stock) as total_stock
    FROM laboratories l
    JOIN units u ON l.unit_id = u.id
    JOIN chemical_inventory ci ON l.id = ci.lab_id
  `;
  const params: any[] = [];

  if (unitId) {
    sql += ' WHERE u.id = ?';
    params.push(unitId);
  }

  sql += ' GROUP BY l.id, l.name, u.name ORDER BY rate DESC';

  const data = db.prepare(sql).all(...params).map((item: any, idx: number) => ({
    labId: item.lab_id,
    labName: item.lab_name,
    unitName: item.unit_name,
    rate: Math.round(item.rate * 100) / 100,
    totalStock: Math.round(item.total_stock),
    ranking: idx + 1,
  }));

  success(res, data);
});

router.get('/categories', (req, res) => {
  const data = db
    .prepare(
      `SELECT category, 
              COUNT(*) as count, 
              SUM(current_stock) as total_stock,
              SUM(CASE WHEN current_stock < safe_level THEN 1 ELSE 0 END) as low_stock_count
       FROM chemical_inventory 
       GROUP BY category 
       ORDER BY total_stock DESC`,
    )
    .all();

  success(res, data);
});

router.get('/sensors', (req, res) => {
  const { labId, type } = req.query;

  let where = '1=1';
  const params: any[] = [];

  if (labId) {
    where += ' AND lab_id = ?';
    params.push(labId);
  }
  if (type) {
    where += ' AND type = ?';
    params.push(type);
  }

  const sensors = db
    .prepare(`SELECT * FROM sensors WHERE ${where} ORDER BY type, location`)
    .all(...params)
    .map((item: any) => ({
      ...item,
      labName: item.lab_name,
    }));

  success(res, sensors);
});

router.get('/usage-records', (req, res) => {
  const { labId, days = 30, page = 1, pageSize = 20 } = req.query;

  let where = '1=1';
  const params: any[] = [];

  if (labId) {
    where += ' AND lab_id = ?';
    params.push(labId);
  }

  where += ` AND timestamp >= DATE('now', '-${parseInt(days as string)} days')`;

  const countStmt = db.prepare(
    `SELECT COUNT(*) as count FROM usage_records WHERE ${where}`,
  );
  const total = (countStmt.get(...params) as any).count;

  const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const items = db
    .prepare(
      `SELECT * FROM usage_records WHERE ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, parseInt(pageSize as string), offset)
    .map((item: any) => ({
      ...item,
      labName: item.lab_name,
      chemicalId: item.chemical_id,
      chemicalName: item.chemical_name,
      doubleLockVerified: !!item.double_lock_verified,
      lockOperator1: item.lock_operator1,
      lockOperator2: item.lock_operator2,
    }));

  paginated(res, items, total, parseInt(page as string), parseInt(pageSize as string));
});

router.get('/labs', (req, res) => {
  const { province, unitId, page = 1, pageSize = 20 } = req.query;

  let where = '1=1';
  const params: any[] = [];

  if (province) {
    where += ' AND p.code = ?';
    params.push(province);
  }
  if (unitId) {
    where += ' AND u.id = ?';
    params.push(unitId);
  }

  const countStmt = db.prepare(
    `SELECT COUNT(*) as count 
     FROM laboratories l
     JOIN units u ON l.unit_id = u.id
     JOIN provinces p ON u.province_code = p.code
     WHERE ${where}`,
  );
  const total = (countStmt.get(...params) as any).count;

  const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const items = db
    .prepare(
      `SELECT l.*, u.name as unit_name, p.name as province, p.code as province_code
       FROM laboratories l
       JOIN units u ON l.unit_id = u.id
       JOIN provinces p ON u.province_code = p.code
       WHERE ${where}
       ORDER BY l.risk_score DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, parseInt(pageSize as string), offset)
    .map((item: any) => {
      let riskLevel: any = 'low';
      if (item.risk_score >= 80) riskLevel = 'critical';
      else if (item.risk_score >= 60) riskLevel = 'high';
      else if (item.risk_score >= 40) riskLevel = 'medium';

      return {
        id: item.id,
        name: item.name,
        unitId: item.unit_id,
        unitName: item.unit_name,
        province: item.province,
        provinceCode: item.province_code,
        city: item.city || '',
        address: item.address || '',
        manager: item.manager,
        phone: item.phone,
        sensorCount: item.sensor_count,
        onlineSensors: item.online_sensors,
        riskScore: Math.round(item.risk_score),
        riskLevel,
        lastUpdate: item.last_update,
      };
    });

  paginated(res, items, total, parseInt(page as string), parseInt(pageSize as string));
});

router.get('/sensors/:id/history', (req, res) => {
  const { id } = req.params;
  const { hours = 24 } = req.query;

  const sensor = db
    .prepare('SELECT * FROM sensors WHERE id = ?')
    .get(id) as any;

  if (!sensor) {
    return success(res, { timestamps: [], values: [] });
  }

  const hoursNum = parseInt(hours as string);
  const timestamps: string[] = [];
  const values: number[] = [];

  for (let i = hoursNum; i >= 0; i--) {
    const time = dayjs().subtract(i, 'hour');
    timestamps.push(time.format('YYYY-MM-DD HH:00'));

    let baseValue = sensor.value;
    const fluctuation = sensor.type === 'temperature' ? 3 : sensor.type === 'humidity' ? 10 : 2;
    const randomChange = (Math.random() - 0.5) * 2 * fluctuation;
    
    let value = baseValue + randomChange;
    
    if (sensor.type === 'temperature') {
      value = Math.max(15, Math.min(40, value));
    } else if (sensor.type === 'humidity') {
      value = Math.max(20, Math.min(90, value));
    } else {
      value = Math.max(0, Math.min(20, value));
    }

    values.push(parseFloat(value.toFixed(2)));
  }

  success(res, {
    sensorId: id,
    timestamps,
    values,
    unit: sensor.unit,
    type: sensor.type,
  });
});

router.get('/labs/:id', (req, res) => {
  const lab = db
    .prepare(
      `SELECT l.*, u.name as unit_name, p.name as province, p.code as province_code
       FROM laboratories l
       JOIN units u ON l.unit_id = u.id
       JOIN provinces p ON u.province_code = p.code
       WHERE l.id = ?`,
    )
    .get(req.params.id) as any;

  if (!lab) {
    return success(res, null);
  }

  let riskLevel: any = 'low';
  if (lab.risk_score >= 80) riskLevel = 'critical';
  else if (lab.risk_score >= 60) riskLevel = 'high';
  else if (lab.risk_score >= 40) riskLevel = 'medium';

  const inventory = db
    .prepare('SELECT * FROM chemical_inventory WHERE lab_id = ? ORDER BY current_stock DESC')
    .all(lab.id)
    .map((item: any) => ({
      ...item,
      casNo: item.cas_no,
      hazardLevel: item.hazard_level,
      currentStock: item.current_stock,
      safeLevel: item.safe_level,
      maxCapacity: item.max_capacity,
      turnoverRate: item.turnover_rate,
      lastRestock: item.last_restock,
      supplierId: item.supplier_id,
      supplierName: item.supplier_name,
    }));

  const sensors = db
    .prepare('SELECT * FROM sensors WHERE lab_id = ? ORDER BY type')
    .all(lab.id)
    .map((item: any) => ({
      ...item,
      labName: item.lab_name,
    }));

  const records = db
    .prepare('SELECT * FROM usage_records WHERE lab_id = ? ORDER BY timestamp DESC LIMIT 30')
    .all(lab.id)
    .map((item: any) => ({
      ...item,
      labName: item.lab_name,
      chemicalId: item.chemical_id,
      chemicalName: item.chemical_name,
      doubleLockVerified: !!item.double_lock_verified,
      lockOperator1: item.lock_operator1,
      lockOperator2: item.lock_operator2,
    }));

  success(res, {
    id: lab.id,
    name: lab.name,
    unitId: lab.unit_id,
    unitName: lab.unit_name,
    province: lab.province,
    provinceCode: lab.province_code,
    city: lab.city || '',
    address: lab.address || '',
    manager: lab.manager,
    phone: lab.phone,
    sensorCount: lab.sensor_count,
    onlineSensors: lab.online_sensors,
    riskScore: Math.round(lab.risk_score),
    riskLevel,
    lastUpdate: lab.last_update,
    inventory,
    sensors,
    records,
  });
});

export default router;
