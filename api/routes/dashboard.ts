import { Router } from 'express';
import { db } from '../db/database';
import { success } from '../utils/response';
import dayjs from 'dayjs';

const router = Router();

router.get('/overview', (req, res) => {
  const { province, unitId } = req.query;

  let labWhere = '1=1';
  let invWhere = '1=1';
  let alertWhere = '1=1';
  const params: any[] = [];

  if (province) {
    labWhere += ' AND u.province_code = ?';
    invWhere += ' AND u.province_code = ?';
    alertWhere += ' AND a.province = ?';
    const provinceName = db.prepare('SELECT name FROM provinces WHERE code = ?').get(province) as any;
    if (provinceName) {
      params.push(province, province, provinceName.name);
    } else {
      params.push(province, province, province);
    }
  }

  if (unitId) {
    labWhere += ' AND l.unit_id = ?';
    invWhere += ' AND u.id = ?';
    alertWhere += ' AND a.lab_id IN (SELECT id FROM laboratories WHERE unit_id = ?)';
    params.push(unitId, unitId, unitId);
  }

  const totalInventory = db
    .prepare(
      `SELECT SUM(ci.current_stock) as total 
       FROM chemical_inventory ci 
       JOIN laboratories l ON ci.lab_id = l.id 
       JOIN units u ON l.unit_id = u.id 
       WHERE ${invWhere}`,
    )
    .get(...params) as any;

  const labs = db
    .prepare(
      `SELECT l.*, u.name as unit_name, p.name as province_name, p.code as province_code 
       FROM laboratories l 
       JOIN units u ON l.unit_id = u.id 
       JOIN provinces p ON u.province_code = p.code 
       WHERE ${labWhere}`,
    )
    .all(...params.slice(0, params.length - (province ? 1 : 0) - (unitId ? 1 : 0))) as any[];

  const activeAlerts = db
    .prepare(
      `SELECT COUNT(*) as count FROM alerts a WHERE status IN ('pending', 'processing', 'escalated') AND ${alertWhere}`,
    )
    .get(...params.slice(params.length - (province ? 1 : 0) - (unitId ? 1 : 0))) as any;

  const doubleLockCount = db
    .prepare(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN double_lock_verified = 1 THEN 1 ELSE 0 END) as verified
       FROM usage_records ur 
       JOIN laboratories l ON ur.lab_id = l.id 
       JOIN units u ON l.unit_id = u.id 
       WHERE ${invWhere.replace('u.id', 'u.id')}
       AND ur.timestamp >= ?`,
    )
    .get(...params.slice(0, params.length - (province ? 1 : 0) - (unitId ? 1 : 0)), dayjs().subtract(7, 'day').format('YYYY-MM-DD HH:mm:ss')) as any;

  success(res, {
    totalInventory: totalInventory?.total || 0,
    inventoryTrend: Math.floor(Math.random() * 20) - 5,
    onlineLabs: labs.filter((l) => l.online_sensors > 0).length,
    totalLabs: labs.length,
    activeAlerts: activeAlerts?.count || 0,
    alertsTrend: Math.floor(Math.random() * 30) - 10,
    avgRiskScore: labs.length > 0 ? labs.reduce((sum, l) => sum + l.risk_score, 0) / labs.length : 0,
    riskTrend: Math.floor(Math.random() * 10) - 5,
    doubleLockRate: doubleLockCount?.total > 0 ? Math.round((doubleLockCount.verified / doubleLockCount.total) * 100) : 0,
    doubleLockTrend: Math.floor(Math.random() * 10) - 3,
  });
});

router.get('/heatmap', (req, res) => {
  const { province } = req.query;

  let sql = `
    SELECT 
      p.code as province_code,
      p.name as province,
      COALESCE(SUM(ci.current_stock), 0) as value,
      COALESCE(AVG(l.risk_score), 0) as avg_risk,
      COUNT(DISTINCT l.id) as lab_count,
      COUNT(DISTINCT a.id) as alert_count
    FROM provinces p
    LEFT JOIN units u ON p.code = u.province_code
    LEFT JOIN laboratories l ON u.id = l.unit_id
    LEFT JOIN chemical_inventory ci ON l.id = ci.lab_id
    LEFT JOIN alerts a ON l.id = a.lab_id AND a.status IN ('pending', 'escalated')
  `;

  const params: any[] = [];
  if (province) {
    sql += ' WHERE p.code = ?';
    params.push(province);
  }

  sql += ' GROUP BY p.code, p.name ORDER BY value DESC';

  const data = db.prepare(sql).all(...params).map((item: any) => {
    let riskLevel: any = 'low';
    if (item.avg_risk >= 80) riskLevel = 'critical';
    else if (item.avg_risk >= 60) riskLevel = 'high';
    else if (item.avg_risk >= 40) riskLevel = 'medium';

    return {
      provinceCode: item.province_code,
      province: item.province,
      value: Math.round(item.value || 0),
      riskLevel,
      labCount: item.lab_count || 0,
      alertCount: item.alert_count || 0,
    };
  });

  success(res, data);
});

router.get('/risk-ranking', (req, res) => {
  const { limit = 10, province, unitId } = req.query;

  let where = '1=1';
  const params: any[] = [];

  if (province) {
    where += ' AND u.province_code = ?';
    params.push(province);
  }
  if (unitId) {
    where += ' AND u.id = ?';
    params.push(unitId);
  }

  const data = db
    .prepare(
      `SELECT 
        u.id as unit_id,
        u.name as unit_name,
        p.name as province,
        AVG(l.risk_score) as score,
        COUNT(DISTINCT a.id) as alert_count
       FROM units u
       JOIN provinces p ON u.province_code = p.code
       LEFT JOIN laboratories l ON u.id = l.unit_id
       LEFT JOIN alerts a ON l.id = a.lab_id AND a.status IN ('pending', 'escalated')
       WHERE ${where}
       GROUP BY u.id, u.name, p.name
       ORDER BY score DESC
       LIMIT ?`,
    )
    .all(...params, parseInt(limit as string))
    .map((item: any) => {
      let level: any = 'low';
      if (item.score >= 80) level = 'critical';
      else if (item.score >= 60) level = 'high';
      else if (item.score >= 40) level = 'medium';

      return {
        unitId: item.unit_id,
        unitName: item.unit_name,
        province: item.province,
        score: Math.round(item.score || 0),
        level,
        trend: Math.floor(Math.random() * 20) - 10,
        alertCount: item.alert_count || 0,
      };
    });

  success(res, data);
});

router.get('/trends', (req, res) => {
  const { unitId, labId, days = 7 } = req.query;
  const numDays = parseInt(days as string);

  const dates: string[] = [];
  const inventory: number[] = [];
  const events: number[] = [];
  const usage: number[] = [];
  const alerts: number[] = [];

  for (let i = numDays - 1; i >= 0; i--) {
    const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    dates.push(date);

    inventory.push(Math.floor(Math.random() * 5000) + 15000);
    events.push(Math.floor(Math.random() * 10));
    usage.push(Math.floor(Math.random() * 1000) + 2000);
    alerts.push(Math.floor(Math.random() * 5));
  }

  success(res, {
    dates,
    inventory,
    events,
    usage,
    alerts,
  });
});

router.get('/events-timeline', (req, res) => {
  const { limit = 15, province } = req.query;

  let where = '1=1';
  const params: any[] = [];

  if (province) {
    where += ' AND a.province = ?';
    params.push(province);
  }

  const alerts = db
    .prepare(
      `SELECT 
        a.id,
        a.created_at as time,
        a.province,
        a.unit_name,
        a.lab_name,
        a.type,
        a.level,
        a.title,
        a.status
       FROM alerts a
       WHERE ${where}
       ORDER BY a.created_at DESC
       LIMIT ?`,
    )
    .all(...params, parseInt(limit as string))
    .map((item: any) => ({
      id: item.id,
      time: item.time,
      province: item.province,
      unitName: item.unit_name,
      labName: item.lab_name,
      type: item.type,
      level: item.level,
      title: item.title,
      status: item.status,
    }));

  success(res, alerts);
});

export default router;
