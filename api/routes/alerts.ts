import { Router } from 'express';
import { db } from '../db/database';
import { success, error, paginated } from '../utils/response';
import { nanoid } from 'nanoid';
import dayjs from 'dayjs';

const router = Router();

router.get('/', (req, res) => {
  const { level, status, type, province, page = 1, pageSize = 20 } = req.query;

  let where = '1=1';
  const params: any[] = [];

  if (level) {
    where += ' AND level = ?';
    params.push(level);
  }
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  if (type) {
    where += ' AND type = ?';
    params.push(type);
  }
  if (province) {
    where += ' AND province = ?';
    params.push(province);
  }

  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM alerts WHERE ${where}`);
  const total = (countStmt.get(...params) as any).count;

  const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const items = db
    .prepare(
      `SELECT * FROM alerts WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, parseInt(pageSize as string), offset)
    .map((item: any) => ({
      ...item,
      escalationDeadline: item.escalation_deadline,
      relatedChemicalId: item.related_chemical_id,
      relatedChemicalName: item.related_chemical_name,
      relatedSensorId: item.related_sensor_id,
      createdAt: item.created_at,
      escalatedAt: item.escalated_at,
      resolvedAt: item.resolved_at,
      resolvedBy: item.resolved_by,
      resolutionNote: item.resolution_note,
    }));

  paginated(res, items, total, parseInt(page as string), parseInt(pageSize as string));
});

router.get('/:id', (req, res) => {
  const alert = db
    .prepare('SELECT * FROM alerts WHERE id = ?')
    .get(req.params.id) as any;

  if (!alert) {
    return error(res, '预警不存在', 404);
  }

  const approvalFlow = db
    .prepare(`SELECT * FROM approval_flows WHERE alert_id = ?`)
    .get(req.params.id) as any;

  let flowWithSteps: any = null;
  if (approvalFlow) {
    const steps = db
      .prepare(`SELECT * FROM approval_steps WHERE flow_id = ? ORDER BY step`)
      .all(approvalFlow.id)
      .map((step: any) => ({
        step: step.step,
        role: step.role,
        operatorId: step.operator_id,
        operatorName: step.operator_name,
        status: step.status,
        comment: step.comment,
        operatedAt: step.operated_at,
      }));

    flowWithSteps = {
      id: approvalFlow.id,
      alertId: approvalFlow.alert_id,
      currentStep: approvalFlow.current_step,
      status: approvalFlow.status,
      steps,
      createdAt: approvalFlow.created_at,
      completedAt: approvalFlow.completed_at,
      sealedChemicalIds: approvalFlow.sealed_chemical_ids
        ? JSON.parse(approvalFlow.sealed_chemical_ids)
        : null,
    };
  }

  success(res, {
    ...alert,
    escalationDeadline: alert.escalation_deadline,
    relatedChemicalId: alert.related_chemical_id,
    relatedChemicalName: alert.related_chemical_name,
    relatedSensorId: alert.related_sensor_id,
    createdAt: alert.created_at,
    escalatedAt: alert.escalated_at,
    resolvedAt: alert.resolved_at,
    resolvedBy: alert.resolved_by,
    resolutionNote: alert.resolution_note,
    approvalFlow: flowWithSteps,
  });
});

router.post('/:id/resolve', (req, res) => {
  const { id } = req.params;
  const { operatorId, note } = req.body;

  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id) as any;
  if (!alert) {
    return error(res, '预警不存在', 404);
  }

  db.prepare(
    `UPDATE alerts 
     SET status = 'resolved', resolved_at = ?, resolved_by = ?, resolution_note = ? 
     WHERE id = ?`,
  ).run(dayjs().format('YYYY-MM-DD HH:mm:ss'), operatorId, note, id);

  const updated = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
  success(res, updated, '预警已处置');
});

router.post('/:id/escalate', (req, res) => {
  const { id } = req.params;

  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id) as any;
  if (!alert) {
    return error(res, '预警不存在', 404);
  }

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

  db.prepare(
    `UPDATE alerts SET level = 2, status = 'escalated', escalated_at = ? WHERE id = ?`,
  ).run(now, id);

  const flowId = 'FLW' + nanoid(8);
  db.prepare(
    `INSERT INTO approval_flows (id, alert_id, current_step, status, created_at) 
     VALUES (?, ?, 1, 'pending', ?)`,
  ).run(flowId, id, now);

  const steps = [
    { step: 1, role: '实验员' },
    { step: 2, role: '单位负责人' },
    { step: 3, role: '上级主管部门' },
  ];

  const insertStep = db.prepare(
    `INSERT INTO approval_steps (id, flow_id, step, role, status) VALUES (?, ?, ?, ?, 'pending')`,
  );

  for (const step of steps) {
    insertStep.run('STP' + nanoid(6), flowId, step.step, step.role);
  }

  success(res, { flowId }, '预警已升级，审批流程已启动');
});

export default router;
