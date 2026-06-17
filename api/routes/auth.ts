import { Router } from 'express';
import { db } from '../db/database';
import { success, error } from '../utils/response';

const router = Router();

const roleLevelMap: Record<string, string> = {
  national: '国家级管理员',
  province: '省级管理员',
  unit: '单位管理员',
  lab: '实验员',
};

router.post('/login', (req, res) => {
  try {
    const { username, password, role } = req.body;

    const user = db
      .prepare(
        `SELECT u.*, r.name as role_name, r.level as role_level, r.permissions 
         FROM users u 
         JOIN roles r ON u.role_id = r.id 
         WHERE u.username = ?`,
      )
      .get(username) as any;

    if (!user || user.password_hash !== password) {
      return error(res, '用户名或密码错误', 401);
    }

    const token = 'token_' + Math.random().toString(36).substring(2, 15);

    success(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: role || user.role_level,
        roleName: roleLevelMap[role as keyof typeof roleLevelMap] || user.role_name,
        unitId: user.unit_id,
        unitName: user.unit_name,
        province: user.province,
        permissions: JSON.parse(user.permissions || '[]'),
      },
    });
  } catch (err: any) {
    error(res, err.message || '登录失败');
  }
});

router.post('/logout', (req, res) => {
  success(res, null, '已退出登录');
});

export default router;
