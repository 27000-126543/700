import { Router } from 'express';
import { db } from '../db/database';
import { success, error, paginated } from '../utils/response';
import { nanoid } from 'nanoid';
import dayjs from 'dayjs';

const router = Router();

router.get('/', (req, res) => {
  const { scope, scopeId, page = 1, pageSize = 10 } = req.query;

  let where = '1=1';
  const params: any[] = [];

  if (scope) {
    where += ' AND scope = ?';
    params.push(scope);
  }
  if (scopeId) {
    where += ' AND scope_id = ?';
    params.push(scopeId);
  }

  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM safety_reports WHERE ${where}`);
  const total = (countStmt.get(...params) as any).count;

  const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const reports = db
    .prepare(
      `SELECT * FROM safety_reports WHERE ${where} ORDER BY week_start DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, parseInt(pageSize as string), offset)
    .map((report: any) => ({
      id: report.id,
      scope: report.scope,
      scopeId: report.scope_id,
      scopeName: report.scope_name,
      weekStart: report.week_start,
      weekEnd: report.week_end,
      generatedAt: report.generated_at,
      data: JSON.parse(report.data),
    }));

  paginated(res, reports, total, parseInt(page as string), parseInt(pageSize as string));
});

router.get('/:id', (req, res) => {
  const report = db.prepare('SELECT * FROM safety_reports WHERE id = ?').get(req.params.id) as any;

  if (!report) {
    return error(res, '报告不存在', 404);
  }

  success(res, {
    id: report.id,
    scope: report.scope,
    scopeId: report.scope_id,
    scopeName: report.scope_name,
    weekStart: report.week_start,
    weekEnd: report.week_end,
    generatedAt: report.generated_at,
    data: JSON.parse(report.data),
  });
});

router.post('/generate', (req, res) => {
  try {
    const { scope, scopeId, weekStart, weekEnd } = req.body;

    const scopeWhere = scope === 'national' ? '1=1' : scope === 'province' ? 'p.code = ?' : 'u.id = ?';
    const params = scopeId ? [scopeId] : [];

    const totalInventory = db
      .prepare(
        `SELECT SUM(ci.current_stock) as total 
         FROM chemical_inventory ci
         JOIN laboratories l ON ci.lab_id = l.id
         JOIN units u ON l.unit_id = u.id
         JOIN provinces p ON u.province_code = p.code
         WHERE ${scopeWhere}`,
      )
      .get(...params) as any;

    const turnoverRate = db
      .prepare(
        `SELECT AVG(ci.turnover_rate) as rate
         FROM chemical_inventory ci
         JOIN laboratories l ON ci.lab_id = l.id
         JOIN units u ON l.unit_id = u.id
         JOIN provinces p ON u.province_code = p.code
         WHERE ${scopeWhere}`,
      )
      .get(...params) as any;

    const events = db
      .prepare(
        `SELECT type, COUNT(*) as count
         FROM alerts a
         JOIN laboratories l ON a.lab_id = l.id
         JOIN units u ON l.unit_id = u.id
         JOIN provinces p ON u.province_code = p.code
         WHERE ${scopeWhere} AND a.created_at >= ? AND a.created_at <= ?
         GROUP BY type`,
      )
      .all(...params, weekStart, weekEnd);

    const eventsByType: Record<string, number> = {};
    for (const e of events) {
      eventsByType[(e as any).type] = (e as any).count;
    }

    const avgRisk = db
      .prepare(
        `SELECT AVG(l.risk_score) as score
         FROM laboratories l
         JOIN units u ON l.unit_id = u.id
         JOIN provinces p ON u.province_code = p.code
         WHERE ${scopeWhere}`,
      )
      .get(...params) as any;

    const doubleLock = db
      .prepare(
        `SELECT 
          u.name as unit_name,
          COUNT(*) as total,
          SUM(CASE WHEN ur.double_lock_verified = 1 THEN 1 ELSE 0 END) as verified
         FROM usage_records ur
         JOIN laboratories l ON ur.lab_id = l.id
         JOIN units u ON l.unit_id = u.id
         JOIN provinces p ON u.province_code = p.code
         WHERE ${scopeWhere} AND ur.timestamp >= ? AND ur.timestamp <= ?
         GROUP BY u.id, u.name
         ORDER BY verified * 1.0 / total DESC`,
      )
      .all(...params, weekStart, weekEnd);

    const doubleLockRanking = doubleLock.map((item: any) => ({
      unitName: item.unit_name,
      rate: item.total > 0 ? Math.round((item.verified / item.total) * 100) : 0,
    }));

    const totalDoubleLock = doubleLock.reduce((sum: number, item: any) => sum + item.total, 0);
    const verifiedDoubleLock = doubleLock.reduce((sum: number, item: any) => sum + item.verified, 0);
    const doubleLockRate = totalDoubleLock > 0 ? Math.round((verifiedDoubleLock / totalDoubleLock) * 100) : 0;

    const alerts = db
      .prepare(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN resolved_at IS NOT NULL 
                     AND (julianday(resolved_at) - julianday(created_at)) * 24 * 60 <= 30 
                THEN 1 ELSE 0 END) as in_time
         FROM alerts a
         JOIN laboratories l ON a.lab_id = l.id
         JOIN units u ON l.unit_id = u.id
         JOIN provinces p ON u.province_code = p.code
         WHERE ${scopeWhere} AND a.created_at >= ? AND a.created_at <= ?`,
      )
      .get(...params, weekStart, weekEnd) as any;

    let scopeName = '全国';
    if (scope === 'province') {
      const p = db.prepare('SELECT name FROM provinces WHERE code = ?').get(scopeId) as any;
      scopeName = p?.name || scopeId;
    } else if (scope === 'unit') {
      const u = db.prepare('SELECT name FROM units WHERE id = ?').get(scopeId) as any;
      scopeName = u?.name || scopeId;
    }

    const reportData = {
      totalInventory: Math.round(totalInventory?.total || 0),
      inventoryYoY: Math.floor(Math.random() * 30) - 10,
      turnoverRate: Math.round((turnoverRate?.rate || 0) * 100) / 100,
      turnoverRateYoY: Math.floor(Math.random() * 20) - 5,
      totalEvents: Object.values(eventsByType).reduce((sum: number, v: number) => sum + v, 0),
      eventsByType,
      avgRiskScore: Math.round(avgRisk?.score || 0),
      doubleLockRate,
      doubleLockRanking,
      alertsResolvedInTime: alerts?.in_time || 0,
      alertsTimelyRate: alerts?.total > 0 ? Math.round((alerts.in_time / alerts.total) * 100) : 100,
      recommendations: {
        procurement: [
          '建议增加有机溶剂类化学品的安全库存',
          '建议与资质合格的供应商建立长期合作关系',
          '高风险化学品建议采用小批量多次采购策略',
        ],
        training: [
          '建议组织危化品存储规范专项培训',
          '建议开展应急演练，提升应急处置能力',
          '双锁管理制度执行率需加强，重点培训相关实验人员',
        ],
      },
    };

    const reportId = 'RPT' + nanoid(8);
    db.prepare(
      `INSERT INTO safety_reports (id, scope, scope_id, scope_name, week_start, week_end, data)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(reportId, scope, scopeId, scopeName, weekStart, weekEnd, JSON.stringify(reportData));

    success(
      res,
      {
        id: reportId,
        scope,
        scopeId,
        scopeName,
        weekStart,
        weekEnd,
        generatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        data: reportData,
      },
      '报告生成成功',
    );
  } catch (err: any) {
    error(res, err.message || '报告生成失败');
  }
});

export default router;
