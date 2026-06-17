import { Router } from 'express';
import { db } from '../db/database';
import { success } from '../utils/response';

const router = Router();

router.get('/provinces', (req, res) => {
  const provinces = db.prepare('SELECT code, name FROM provinces ORDER BY name').all();
  success(res, provinces);
});

router.get('/units', (req, res) => {
  const { provinceCode } = req.query;
  let sql = 'SELECT u.*, p.name as province FROM units u JOIN provinces p ON u.province_code = p.code WHERE 1=1';
  const params: any[] = [];

  if (provinceCode) {
    sql += ' AND u.province_code = ?';
    params.push(provinceCode);
  }

  sql += ' ORDER BY u.name';
  const units = db.prepare(sql).all(...params);
  success(res, units);
});

router.get('/suppliers', (req, res) => {
  const suppliers = db
    .prepare('SELECT * FROM suppliers ORDER BY name')
    .all()
    .map((s: any) => ({
      ...s,
      isQualified: !!s.is_qualified,
      validUntil: s.valid_until,
      licenseNo: s.license_no,
    }));
  success(res, suppliers);
});

export default router;
