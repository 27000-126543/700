import { Router } from 'express';
import { db } from '../db/database';
import { success, error, paginated } from '../utils/response';
import dayjs from 'dayjs';

const router = Router();

router.get('/', (req, res) => {
  const { status, currentStep, page = 1, pageSize = 20 } = req.query;

  let where = '1=1';
  const params: any[] = [];

  if (status) {
    where += ' AND af.status = ?';
    params.push(status);
  }
  if (currentStep) {
    where += ' AND af.current_step = ?';
    params.push(currentStep);
  }

  const countStmt = db.prepare(
    `SELECT COUNT(*) as count FROM approval_flows af WHERE ${where}`,
  );
  const total = (countStmt.get(...params) as any).count;

  const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const flows = db
    .prepare(
      `SELECT af.*, a.title as alert_title, a.level as alert_level, 
              a.lab_name, a.unit_name, a.province
       FROM approval_flows af
       JOIN alerts a ON af.alert_id = a.id
       WHERE ${where}
       ORDER BY af.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, parseInt(pageSize as string), offset);

  const items = flows.map((flow: any) => {
    const steps = db
      .prepare(`SELECT * FROM approval_steps WHERE flow_id = ? ORDER BY step`)
      .all(flow.id)
      .map((step: any) => ({
        step: step.step,
        role: step.role,
        operatorId: step.operator_id,
        operatorName: step.operator_name,
        status: step.status,
        comment: step.comment,
        operatedAt: step.operated_at,
      }));

    return {
      id: flow.id,
      alertId: flow.alert_id,
      alertInfo: {
        id: flow.alert_id,
        title: flow.alert_title,
        level: flow.alert_level,
        labName: flow.lab_name,
        unitName: flow.unit_name,
        province: flow.province,
      },
      currentStep: flow.current_step,
      status: flow.status,
      steps,
      createdAt: flow.created_at,
      completedAt: flow.completed_at,
      sealedChemicalIds: flow.sealed_chemical_ids
        ? JSON.parse(flow.sealed_chemical_ids)
        : null,
    };
  });

  paginated(res, items, total, parseInt(page as string), parseInt(pageSize as string));
});

router.get('/:id', (req, res) => {
  const flow = db
    .prepare(
      `SELECT af.*, a.* 
       FROM approval_flows af
       JOIN alerts a ON af.alert_id = a.id
       WHERE af.id = ?`,
    )
    .get(req.params.id) as any;

  if (!flow) {
    return error(res, '审批流程不存在', 404);
  }

  const steps = db
    .prepare(`SELECT * FROM approval_steps WHERE flow_id = ? ORDER BY step`)
    .all(flow.id)
    .map((step: any) => ({
      step: step.step,
      role: step.role,
      operatorId: step.operator_id,
      operatorName: step.operator_name,
      status: step.status,
      comment: step.comment,
      operatedAt: step.operated_at,
    }));

  success(res, {
    id: flow.id,
    alertId: flow.alert_id,
    alertInfo: {
      id: flow.alert_id,
      labId: flow.lab_id,
      labName: flow.lab_name,
      unitName: flow.unit_name,
      province: flow.province,
      level: flow.level,
      type: flow.type,
      title: flow.title,
      description: flow.description,
      status: flow.status,
      createdAt: flow.created_at,
      escalationDeadline: flow.escalation_deadline,
    },
    currentStep: flow.current_step,
    status: flow.status,
    steps,
    createdAt: flow.created_at,
    completedAt: flow.completed_at,
    sealedChemicalIds: flow.sealed_chemical_ids
      ? JSON.parse(flow.sealed_chemical_ids)
      : null,
  });
});

router.post('/:id/operate', (req, res) => {
  const { id } = req.params;
  const { step, operatorId, status, comment } = req.body;

  const flow = db.prepare('SELECT * FROM approval_flows WHERE id = ?').get(id) as any;
  if (!flow) {
    return error(res, '审批流程不存在', 404);
  }

  if (flow.current_step !== parseInt(step as string)) {
    return error(res, '当前审批步骤不匹配');
  }

  if (flow.status !== 'pending') {
    return error(res, '审批流程已结束');
  }

  const operator = db.prepare('SELECT full_name FROM users WHERE id = ?').get(operatorId) as any;
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

  db.prepare(
    `UPDATE approval_steps 
     SET status = ?, operator_id = ?, operator_name = ?, comment = ?, operated_at = ? 
     WHERE flow_id = ? AND step = ?`,
  ).run(status, operatorId, operator?.full_name || '未知', comment, now, id, step);

  if (status === 'rejected') {
    db.prepare(`UPDATE approval_flows SET status = 'rejected', completed_at = ? WHERE id = ?`).run(
      now,
      id,
    );
    return success(res, null, '审批已驳回');
  }

  if (parseInt(step as string) < 3) {
    db.prepare(`UPDATE approval_flows SET current_step = ? WHERE id = ?`).run(
      parseInt(step as string) + 1,
      id,
    );
  } else {
    db.prepare(
      `UPDATE approval_flows SET status = 'approved', current_step = 4, completed_at = ? WHERE id = ?`,
    ).run(now, id);

    const labId = db.prepare('SELECT lab_id FROM alerts WHERE id = ?').get(flow.alert_id) as any;
    const chemicals = db
      .prepare('SELECT id FROM chemical_inventory WHERE lab_id = ?')
      .all(labId?.lab_id)
      .map((c: any) => c.id);

    db.prepare(
      `UPDATE approval_flows SET sealed_chemical_ids = ? WHERE id = ?`,
    ).run(JSON.stringify(chemicals), id);

    db.prepare(`UPDATE alerts SET status = 'resolved' WHERE id = ?`).run(flow.alert_id);
  }

  const updatedFlow = db.prepare('SELECT * FROM approval_flows WHERE id = ?').get(id);
  success(res, updatedFlow, status === 'approved' ? '审批已通过' : '操作成功');
});

export default router;
