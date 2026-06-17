import { Router } from 'express';
import { db } from '../db/database';
import { success } from '../utils/response';
import dayjs from 'dayjs';

const router = Router();

router.get('/overview', (req, res) => {
  const { province, unitId } = req.query;

  let labJoin = ' JOIN units u ON l.unit_id = u.id JOIN provinces p ON u.province_code = p.code ';
  let labWhere = '1=1';
  const labParams: any[] = [];

  let invJoin = ' JOIN laboratories l ON ci.lab_id = l.id JOIN units u ON l.unit_id = u.id JOIN provinces p ON u.province_code = p.code ';
  let invWhere = '1=1';
  const invParams: any[] = [];

  let alertWhere = '1=1';
  const alertParams: any[] = [];

  if (province) {
    labWhere += ' AND u.province_code = ?';
    labParams.push(province);
    invWhere += ' AND u.province_code = ?';
    invParams.push(province);
    const provinceName = db.prepare('SELECT name FROM provinces WHERE code = ?').get(province) as any;
    alertWhere += ' AND a.province = ?';
    alertParams.push(provinceName?.name || province);
  }

  if (unitId) {
    labWhere += ' AND l.unit_id = ?';
    labParams.push(unitId);
    invWhere += ' AND u.id = ?';
    invParams.push(unitId);
    alertWhere += ' AND a.lab_id IN (SELECT id FROM laboratories WHERE unit_id = ?)';
    alertParams.push(unitId);
  }

  const totalInventory = db
    .prepare(
      `SELECT SUM(ci.current_stock) as total 
       FROM chemical_inventory ci 
       ${invJoin}
       WHERE ${invWhere}`,
    )
    .get(...invParams) as any;

  const labs = db
    .prepare(
      `SELECT l.*, u.name as unit_name, p.name as province_name, p.code as province_code 
       FROM laboratories l 
       ${labJoin}
       WHERE ${labWhere}`,
    )
    .all(...labParams) as any[];

  const activeAlerts = db
    .prepare(
      `SELECT COUNT(*) as count FROM alerts a WHERE a.status IN ('pending', 'processing', 'escalated') AND ${alertWhere}`,
    )
    .get(...alertParams) as any;

  let dlJoin = ' JOIN laboratories l ON ur.lab_id = l.id JOIN units u ON l.unit_id = u.id ';
  let dlWhere = '1=1';
  const dlParams: any[] = [];
  if (province) {
    dlWhere += ' AND u.province_code = ?';
    dlParams.push(province);
  }
  if (unitId) {
    dlWhere += ' AND u.id = ?';
    dlParams.push(unitId);
  }
  dlParams.push(dayjs().subtract(7, 'day').format('YYYY-MM-DD HH:mm:ss'));

  const doubleLockCount = db
    .prepare(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN double_lock_verified = 1 THEN 1 ELSE 0 END) as verified
       FROM usage_records ur 
       ${dlJoin}
       WHERE ${dlWhere}
       AND ur.timestamp >= ?`,
    )
    .get(...dlParams) as any;

  success(res, {
    totalInventory: totalInventory?.total || 0,
    inventoryTrend: Math.floor(Math.random() * 20) - 5,
    onlineLabs: labs.filter((l) => l.online_sensors > 0).length,
    totalLabs: labs.length,
    activeAlerts: activeAlerts?.count || 0,
    alertsTrend: Math.floor(Math.random() * 30) - 10,
    avgRiskScore: labs.length > 0 ? Math.round(labs.reduce((sum, l) => sum + (l.risk_score || 0), 0) / labs.length * 10) / 10 : 0,
    riskTrend: Math.floor(Math.random() * 10) - 5,
    doubleLockRate: doubleLockCount?.total > 0 ? Math.round((doubleLockCount.verified / doubleLockCount.total) * 100) : 0,
    doubleLockTrend: Math.floor(Math.random() * 10) - 3,
  });
});

router.get('/heatmap', (req, res) => {
  const data = db.prepare(`
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
    GROUP BY p.code, p.name
    ORDER BY value DESC
  `).all().map((item: any) => {
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

  let invWhere = '1=1';
  const invParams: any[] = [];
  let alertWhere = '1=1';
  const alertParams: any[] = [];
  let usageWhere = '1=1';
  const usageParams: any[] = [];

  if (unitId) {
    invWhere += ' AND u.id = ?';
    invParams.push(unitId);
    alertWhere += ' AND a.lab_id IN (SELECT id FROM laboratories WHERE unit_id = ?)';
    alertParams.push(unitId);
    usageWhere += ' AND ur.lab_id IN (SELECT id FROM laboratories WHERE unit_id = ?)';
    usageParams.push(unitId);
  }

  const dates: string[] = [];
  const inventory: number[] = [];
  const events: number[] = [];
  const usage: number[] = [];
  const alerts: number[] = [];

  for (let i = numDays - 1; i >= 0; i--) {
    const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    const nextDate = dayjs().subtract(i - 1, 'day').format('YYYY-MM-DD');
    dates.push(date);

    const invResult = db.prepare(
      `SELECT SUM(ci.current_stock) as total FROM chemical_inventory ci
       JOIN laboratories l ON ci.lab_id = l.id JOIN units u ON l.unit_id = u.id
       WHERE ${invWhere}`,
    ).get(...invParams) as any;
    inventory.push(Math.round(invResult?.total || 0));

    const evtResult = db.prepare(
      `SELECT COUNT(*) as count FROM alerts a WHERE date(a.created_at) = ? AND ${alertWhere}`,
    ).get(date, ...alertParams) as any;
    events.push(evtResult?.count || 0);

    const usgResult = db.prepare(
      `SELECT COUNT(*) as count FROM usage_records ur WHERE date(ur.timestamp) = ? AND ${usageWhere}`,
    ).get(date, ...usageParams) as any;
    usage.push(usgResult?.count || 0);

    const altResult = db.prepare(
      `SELECT COUNT(*) as count FROM alerts a WHERE date(a.created_at) = ? AND a.status IN ('pending','escalated') AND ${alertWhere}`,
    ).get(date, ...alertParams) as any;
    alerts.push(altResult?.count || 0);
  }

  success(res, { dates, inventory, events, usage, alerts });
});

router.get('/events-timeline', (req, res) => {
  const { limit = 15, province } = req.query;

  let where = '1=1';
  const params: any[] = [];

  if (province) {
    where += ' AND a.province = ?';
    const provinceName = db.prepare('SELECT name FROM provinces WHERE code = ?').get(province) as any;
    params.push(provinceName?.name || province);
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
