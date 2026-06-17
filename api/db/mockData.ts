import { db } from './database';
import { nanoid } from 'nanoid';
import dayjs from 'dayjs';

const provincesData = [
  { code: '110000', name: '北京市' },
  { code: '310000', name: '上海市' },
  { code: '440000', name: '广东省' },
  { code: '320000', name: '江苏省' },
  { code: '330000', name: '浙江省' },
  { code: '370000', name: '山东省' },
  { code: '510000', name: '四川省' },
  { code: '420000', name: '湖北省' },
  { code: '430000', name: '湖南省' },
  { code: '410000', name: '河南省' },
  { code: '130000', name: '河北省' },
  { code: '120000', name: '天津市' },
  { code: '610000', name: '陕西省' },
  { code: '210000', name: '辽宁省' },
  { code: '220000', name: '吉林省' },
  { code: '230000', name: '黑龙江省' },
  { code: '340000', name: '安徽省' },
  { code: '350000', name: '福建省' },
  { code: '360000', name: '江西省' },
  { code: '450000', name: '广西壮族自治区' },
  { code: '460000', name: '海南省' },
  { code: '500000', name: '重庆市' },
  { code: '520000', name: '贵州省' },
  { code: '530000', name: '云南省' },
  { code: '540000', name: '西藏自治区' },
  { code: '620000', name: '甘肃省' },
  { code: '630000', name: '青海省' },
  { code: '640000', name: '宁夏回族自治区' },
  { code: '650000', name: '新疆维吾尔自治区' },
  { code: '150000', name: '内蒙古自治区' },
];

const chemicalCategories = ['酸类', '碱类', '有机溶剂', '氧化剂', '还原剂', '盐类', '气体', '其他'];

const chemicals = [
  { name: '浓硫酸', cas: '7664-93-9', category: '酸类', hazard: 'critical' },
  { name: '浓盐酸', cas: '7647-01-0', category: '酸类', hazard: 'high' },
  { name: '浓硝酸', cas: '7697-37-2', category: '酸类', hazard: 'critical' },
  { name: '氢氧化钠', cas: '1310-73-2', category: '碱类', hazard: 'high' },
  { name: '氢氧化钾', cas: '1310-58-3', category: '碱类', hazard: 'high' },
  { name: '甲醇', cas: '67-56-1', category: '有机溶剂', hazard: 'high' },
  { name: '乙醇', cas: '64-17-5', category: '有机溶剂', hazard: 'medium' },
  { name: '丙酮', cas: '67-64-1', category: '有机溶剂', hazard: 'medium' },
  { name: '乙腈', cas: '75-05-8', category: '有机溶剂', hazard: 'high' },
  { name: '过氧化氢', cas: '7722-84-1', category: '氧化剂', hazard: 'critical' },
  { name: '高锰酸钾', cas: '7722-64-7', category: '氧化剂', hazard: 'high' },
  { name: '硝酸银', cas: '7761-88-8', category: '盐类', hazard: 'medium' },
  { name: '硫酸铜', cas: '7758-98-7', category: '盐类', hazard: 'medium' },
  { name: '氯化钠', cas: '7647-14-5', category: '盐类', hazard: 'low' },
  { name: '氮气', cas: '7727-37-9', category: '气体', hazard: 'low' },
  { name: '氧气', cas: '7782-44-7', category: '气体', hazard: 'medium' },
  { name: '氯气', cas: '7782-50-5', category: '气体', hazard: 'critical' },
  { name: '甲醛', cas: '50-00-0', category: '其他', hazard: 'high' },
];

const supplierNames = [
  '国药集团化学试剂有限公司',
  '阿拉丁试剂(上海)有限公司',
  '上海麦克林生化科技有限公司',
  '北京化工厂',
  '天津大茂化学试剂厂',
  '广州化学试剂厂',
  '成都科龙化工试剂厂',
  '西陇科学股份有限公司',
];

const unitSuffixes = ['大学', '研究院', '研究所', '科学院', '实验中心', '检测中心'];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysAgo: number) {
  return dayjs().subtract(randomInt(0, daysAgo), 'day').format('YYYY-MM-DD HH:mm:ss');
}

export function initMockData() {
  const existingProvinces = db.prepare('SELECT COUNT(*) as count FROM provinces').get() as { count: number };
  if (existingProvinces.count > 0) {
    console.log('Mock data already exists, skipping initialization');
    return;
  }

  const insertProvince = db.prepare(
    'INSERT INTO provinces (code, name) VALUES (?, ?)',
  );
  const insertUnit = db.prepare(
    'INSERT INTO units (id, name, province_code, address, contact) VALUES (?, ?, ?, ?, ?)',
  );
  const insertLab = db.prepare(
    'INSERT INTO laboratories (id, name, unit_id, manager, phone, risk_score, sensor_count, online_sensors) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const insertInventory = db.prepare(
    'INSERT INTO chemical_inventory (id, lab_id, lab_name, chemical_name, cas_no, category, hazard_level, current_stock, unit, safe_level, max_capacity, turnover_rate, supplier_id, supplier_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const insertSensor = db.prepare(
    'INSERT INTO sensors (id, lab_id, lab_name, type, location, value, unit, threshold, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const insertUsageRecord = db.prepare(
    'INSERT INTO usage_records (id, lab_id, lab_name, chemical_id, chemical_name, amount, unit, user, double_lock_verified, lock_operator1, lock_operator2, purpose, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const insertSupplier = db.prepare(
    'INSERT INTO suppliers (id, name, license_no, is_qualified, valid_until, contact) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const insertAlert = db.prepare(
    'INSERT INTO alerts (id, lab_id, lab_name, unit_name, province, level, type, title, description, related_chemical_id, related_chemical_name, status, escalation_deadline, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const insertRole = db.prepare(
    'INSERT INTO roles (id, name, level, permissions) VALUES (?, ?, ?, ?)',
  );
  const insertUser = db.prepare(
    'INSERT INTO users (id, username, password_hash, full_name, role_id, phone) VALUES (?, ?, ?, ?, ?, ?)',
  );

  const transaction = db.transaction(() => {
    for (const province of provincesData) {
      insertProvince.run(province.code, province.name);
    }

    const suppliers: { id: string; name: string }[] = [];
    for (let i = 0; i < supplierNames.length; i++) {
      const id = 'SUP' + String(i + 1).padStart(4, '0');
      suppliers.push({ id, name: supplierNames[i] });
      insertSupplier.run(
        id,
        supplierNames[i],
        'XK' + randomInt(100000, 999999),
        i < 6 ? 1 : 0,
        dayjs().add(randomInt(30, 730), 'day').format('YYYY-MM-DD'),
        '139' + randomInt(10000000, 99999999),
      );
    }

    const roles = [
      { id: 'R001', name: '国家级管理员', level: 'national', perms: ['*'] },
      { id: 'R002', name: '省级管理员', level: 'province', perms: ['dashboard:*', 'monitoring:*', 'alerts:*', 'approvals:*', 'inventory:*', 'procurement:*', 'diagnosis:*'] },
      { id: 'R003', name: '单位管理员', level: 'unit', perms: ['dashboard:*', 'monitoring:*', 'alerts:*', 'approvals:unit', 'inventory:*', 'procurement:*', 'diagnosis:*'] },
      { id: 'R004', name: '实验员', level: 'unit', perms: ['monitoring:view', 'alerts:confirm', 'usage:create'] },
    ];

    for (const role of roles) {
      insertRole.run(role.id, role.name, role.level, JSON.stringify(role.perms));
    }

    insertUser.run(
      'U001',
      'admin',
      'admin123',
      '张建国',
      'R001',
      '13800138000',
    );
    insertUser.run(
      'U002',
      'province_admin',
      'admin123',
      '李明华',
      'R002',
      '13900139000',
    );
    insertUser.run(
      'U003',
      'unit_admin',
      'admin123',
      '王晓峰',
      'R003',
      '13700137000',
    );
    insertUser.run(
      'U004',
      'lab_user',
      'admin123',
      '陈实验',
      'R004',
      '13600136000',
    );

    const labUsers = ['张伟', '李娜', '王强', '刘芳', '陈明', '杨丽', '赵磊', '周静'];

    let unitId = 1;
    let labId = 1;

    for (const province of provincesData.slice(0, 15)) {
      const unitCount = randomInt(2, 5);
      for (let u = 0; u < unitCount; u++) {
        const unitIdStr = 'UNIT' + String(unitId).padStart(6, '0');
        const unitName = randomChoice(['清华', '北大', '中科', '复旦', '上海交大', '浙大', '南大', '中国科学']) + randomChoice(unitSuffixes);
        insertUnit.run(
          unitIdStr,
          `${province.name}${unitName}`,
          province.code,
          `${province.name}${randomChoice(['市', '区', '县'])}${randomChoice(['科技路', '创新路', '学府路', '科研路'])}${randomInt(1, 999)}号`,
          '0' + randomInt(10, 99) + '-' + randomInt(10000000, 99999999),
        );

        const labCount = randomInt(2, 4);
        for (let l = 0; l < labCount; l++) {
          const labIdStr = 'LAB' + String(labId).padStart(6, '0');
          const labName = randomChoice(['化学', '生物', '材料', '环境', '医药', '食品']) + randomChoice(['实验室', '分析室', '检测室', '研究室']) + String(randomInt(1, 9));
          const riskScore = randomFloat(20, 95);
          let riskLevel: any = 'low';
          if (riskScore >= 80) riskLevel = 'critical';
          else if (riskScore >= 60) riskLevel = 'high';
          else if (riskScore >= 40) riskLevel = 'medium';

          insertLab.run(
            labIdStr,
            labName,
            unitIdStr,
            randomChoice(labUsers),
            '13' + randomInt(50, 99) + randomInt(10000000, 99999999),
            riskScore,
            randomInt(6, 12),
            randomInt(4, 10),
          );

          const chemicalCount = randomInt(5, 12);
          const usedChemicals = new Set<string>();
          const inventoryItems: { id: string; name: string }[] = [];
          for (let c = 0; c < chemicalCount; c++) {
            let chemical = randomChoice(chemicals);
            while (usedChemicals.has(chemical.name)) {
              chemical = randomChoice(chemicals);
            }
            usedChemicals.add(chemical.name);

            const maxCapacity = randomFloat(50, 500);
            const safeLevel = maxCapacity * randomFloat(0.1, 0.2);
            const currentStock = randomFloat(safeLevel, maxCapacity * 0.9);
            const supplier = randomChoice(suppliers);
            const invId = 'INV' + nanoid(8);

            inventoryItems.push({ id: invId, name: chemical.name });

            insertInventory.run(
              invId,
              labIdStr,
              labName,
              chemical.name,
              chemical.cas,
              chemical.category,
              chemical.hazard,
              currentStock,
              randomChoice(['kg', 'g', 'L', 'mL', '瓶', '箱']),
              safeLevel,
              maxCapacity,
              randomFloat(0.2, 2.5),
              supplier.id,
              supplier.name,
            );
          }

          const sensorTypes: any = [
            { type: 'temperature', unit: '°C', threshold: 30, normalRange: [18, 28] },
            { type: 'humidity', unit: '%', threshold: 70, normalRange: [30, 65] },
            { type: 'leak', unit: 'ppm', threshold: 10, normalRange: [0, 5] },
          ];

          for (const sensorType of sensorTypes) {
            const count = sensorType.type === 'leak' ? randomInt(2, 4) : randomInt(1, 2);
            for (let s = 0; s < count; s++) {
              const isAlarm = Math.random() < 0.08;
              const isWarning = Math.random() < 0.12;
              let value = randomFloat(sensorType.normalRange[0], sensorType.normalRange[1]);
              let status: any = 'normal';

              if (isAlarm) {
                value = sensorType.threshold + randomFloat(1, 10);
                status = 'alarm';
              } else if (isWarning) {
                value = sensorType.threshold * randomFloat(0.85, 0.99);
                status = 'warning';
              }

              insertSensor.run(
                'SEN' + nanoid(8),
                labIdStr,
                labName,
                sensorType.type,
                randomChoice(['一号实验室', '二号实验室', '试剂柜', '通风橱', '储藏室']),
                value,
                sensorType.unit,
                sensorType.threshold,
                status,
              );
            }
          }

          for (let r = 0; r < randomInt(15, 40); r++) {
            const invItem = randomChoice(inventoryItems);
            const doubleLock = Math.random() < 0.85;
            insertUsageRecord.run(
              'REC' + nanoid(8),
              labIdStr,
              labName,
              invItem.id,
              invItem.name,
              randomFloat(0.01, 5),
              randomChoice(['g', 'mL', 'kg']),
              randomChoice(labUsers),
              doubleLock ? 1 : 0,
              doubleLock ? randomChoice(labUsers) : null,
              doubleLock ? randomChoice(labUsers) : null,
              randomChoice(['科研实验', '分析检测', '教学实验', '样品处理']),
              randomDate(30),
            );
          }

          if (Math.random() < 0.4 || labId <= 10) {
            const isLevel2 = Math.random() < 0.3;
            const types: any = ['low_stock', 'leak', 'temperature', 'humidity'];
            const type = randomChoice(types);
            const titles: Record<string, string[]> = {
              low_stock: ['库存低于安全水位', '化学品库存不足', '需要补充库存'],
              leak: ['检测到化学品泄露', '气体浓度超标', '传感器报警'],
              temperature: ['温度超标', '实验室温度过高', '制冷设备异常'],
              humidity: ['湿度过高', '湿度超标', '除湿设备异常'],
            };

            const provinceName = province.name;
            const unitNameFull = `${province.name}${unitName}`;

            insertAlert.run(
              'ALT' + nanoid(8),
              labIdStr,
              labName,
              unitNameFull,
              provinceName,
              isLevel2 ? 2 : 1,
              type,
              randomChoice(titles[type]),
              `${labName}${type === 'leak' ? '检测到危险气体泄露' : type === 'low_stock' ? '化学品库存已低于安全水位线' : '环境参数超出安全阈值'}，请及时处理。`,
              null,
              null,
              isLevel2 ? 'escalated' : randomChoice(['pending', 'pending', 'processing', 'resolved']),
              dayjs().add(30, 'minute').format('YYYY-MM-DD HH:mm:ss'),
              randomDate(7),
            );
          }

          labId++;
        }
        unitId++;
      }
    }
  });

  try {
    transaction();
    console.log('Mock data initialized successfully');
  } catch (e) {
    console.error('Error initializing mock data:', e);
  }
}
