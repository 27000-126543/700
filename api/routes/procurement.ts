import { Router } from 'express';
import multer from 'multer';
import { db } from '../db/database';
import { success, error } from '../utils/response';
import { nanoid } from 'nanoid';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/', (req, res) => {
  const { unitId, year, status } = req.query;

  let where = '1=1';
  const params: any[] = [];

  if (unitId) {
    where += ' AND unit_id = ?';
    params.push(unitId);
  }
  if (year) {
    where += ' AND year = ?';
    params.push(year);
  }
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }

  const plans = db
    .prepare(`SELECT * FROM procurement_plans WHERE ${where} ORDER BY uploaded_at DESC`)
    .all(...params)
    .map((plan: any) => {
      const items = db
        .prepare('SELECT * FROM procurement_items WHERE plan_id = ?')
        .all(plan.id)
        .map((item: any) => ({
          ...item,
          casNo: item.cas_no,
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
          expectedDate: item.expected_date,
          supplierQualified: !!item.supplier_qualified,
          quotaCheck: item.quota_check,
          capacityCheck: item.capacity_check,
        }));

      return {
        id: plan.id,
        unitId: plan.unit_id,
        unitName: plan.unit_name,
        year: plan.year,
        items,
        uploadedBy: plan.uploaded_by,
        uploadedAt: plan.uploaded_at,
        status: plan.status,
        issues: plan.issues ? JSON.parse(plan.issues) : [],
      };
    });

  success(res, plans);
});

router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return error(res, '请上传Excel文件', 400);
    }

    const { unitId, unitName, uploadedBy } = req.body;

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (rows.length === 0) {
      return error(res, 'Excel文件为空', 400);
    }

    const planId = 'PLN' + nanoid(8);
    const items: any[] = [];
    const issues: any[] = [];

    const suppliers = db.prepare('SELECT * FROM suppliers').all() as any[];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const itemId = 'ITM' + nanoid(6);

      const supplierName = row['供应商名称'] || row['supplier_name'] || row['供应商'];
      const supplier = suppliers.find(
        (s: any) => s.name === supplierName || s.id === row['供应商ID'],
      );

      const chemicalName = row['化学品名称'] || row['chemical_name'] || row['名称'];
      const quantity = parseFloat(row['采购数量'] || row['quantity'] || 0);
      const unit = row['单位'] || row['unit'] || 'kg';

      let supplierQualified = supplier?.is_qualified ? true : false;
      let quotaCheck: any = 'pass';
      let capacityCheck: any = 'pass';

      if (!supplier || !supplier.is_qualified) {
        issues.push({
          itemId,
          type: 'supplier',
          severity: 'error',
          message: `第${i + 2}行：供应商"${supplierName}"资质无效或未找到`,
        });
      }

      const expectedTotal = quantity;
      if (expectedTotal > 1000) {
        quotaCheck = 'warn';
        issues.push({
          itemId,
          type: 'quota',
          severity: 'warning',
          message: `第${i + 2}行：${chemicalName}采购量${quantity}${unit}超出年度配额`,
        });
      }

      const labInv = db
        .prepare(
          'SELECT SUM(max_capacity) as total_cap, SUM(current_stock) as current_stock FROM chemical_inventory WHERE lab_id IN (SELECT id FROM laboratories WHERE unit_id = ?)',
        )
        .get(unitId) as any;

      const totalCapacity = labInv?.total_cap || 0;
      const currentStock = labInv?.current_stock || 0;
      const afterStock = currentStock + quantity;

      if (totalCapacity > 0 && afterStock > totalCapacity * 1.2) {
        capacityCheck = 'fail';
        issues.push({
          itemId,
          type: 'capacity',
          severity: 'error',
          message: `第${i + 2}行：${chemicalName}采购后将超出存储容量${(((afterStock / totalCapacity) - 1) * 100).toFixed(1)}%`,
        });
      } else if (totalCapacity > 0 && afterStock > totalCapacity) {
        capacityCheck = 'warn';
      }

      items.push({
        id: itemId,
        chemicalName,
        casNo: row['CAS号'] || row['cas_no'] || '',
        quantity,
        unit,
        supplierName,
        supplierId: supplier?.id || '',
        unitPrice: parseFloat(row['单价'] || row['unit_price'] || 0),
        totalPrice: parseFloat(row['总价'] || row['total_price'] || 0),
        expectedDate: row['预计到货日期'] || row['expected_date'] || dayjs().add(30, 'day').format('YYYY-MM-DD'),
        supplierQualified,
        quotaCheck,
        capacityCheck,
      });
    }

    const hasErrors = issues.some((i) => i.severity === 'error');
    const status = hasErrors ? 'has_issues' : 'pending';

    db.prepare(
      `INSERT INTO procurement_plans (id, unit_id, unit_name, year, status, uploaded_by, issues) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      planId,
      unitId,
      unitName,
      dayjs().year(),
      status,
      uploadedBy,
      JSON.stringify(issues),
    );

    const insertItem = db.prepare(
      `INSERT INTO procurement_items 
       (id, plan_id, chemical_name, cas_no, quantity, unit, supplier_name, supplier_id, 
        unit_price, total_price, expected_date, supplier_qualified, quota_check, capacity_check)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const item of items) {
      insertItem.run(
        item.id,
        planId,
        item.chemicalName,
        item.casNo,
        item.quantity,
        item.unit,
        item.supplierName,
        item.supplierId,
        item.unitPrice,
        item.totalPrice,
        item.expectedDate,
        item.supplierQualified ? 1 : 0,
        item.quotaCheck,
        item.capacityCheck,
      );
    }

    success(
      res,
      {
        id: planId,
        unitId,
        unitName,
        year: dayjs().year(),
        items,
        uploadedBy,
        uploadedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        status,
        issues,
      },
      hasErrors ? '导入成功，但存在异常需要处理' : '导入成功',
    );
  } catch (err: any) {
    error(res, err.message || '文件解析失败');
  }
});

router.get('/template', (req, res) => {
  const data = [
    {
      化学品名称: '浓硫酸',
      CAS号: '7664-93-9',
      采购数量: 50,
      单位: 'L',
      单价: 25.5,
      总价: 1275,
      供应商名称: '国药集团化学试剂有限公司',
      供应商ID: 'SUP0001',
      预计到货日期: '2026-07-15',
    },
    {
      化学品名称: '氢氧化钠',
      CAS号: '1310-73-2',
      采购数量: 100,
      单位: 'kg',
      单价: 12.8,
      总价: 1280,
      供应商名称: '阿拉丁试剂(上海)有限公司',
      供应商ID: 'SUP0002',
      预计到货日期: '2026-07-20',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '采购计划');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', 'attachment; filename="年度采购计划模板.xlsx"');
  res.send(buffer);
});

export default router;
