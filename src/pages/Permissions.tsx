import { useState, useMemo } from 'react';
import {
  Shield,
  Users,
  Search,
  Globe,
  MapPin,
  Building2,
  CheckCircle2,
  XCircle,
  Lock,
  ChevronRight,
  Crown,
  Star,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import type { AdminLevel } from '@shared/types';

interface PermissionUser {
  id: string;
  username: string;
  fullName: string;
  role: AdminLevel;
  roleName: string;
  unitName: string;
  province: string;
  permissions: string[];
  lastLogin: string;
  status: 'active' | 'inactive';
}

interface RoleInfo {
  level: AdminLevel;
  name: string;
  icon: typeof Globe;
  color: string;
  description: string;
  scope: string;
  permissions: string[];
}

interface PermissionModule {
  id: string;
  name: string;
  icon: typeof Shield;
  national: boolean;
  province: boolean;
  unit: boolean;
}

const mockUsers: PermissionUser[] = [
  {
    id: '1',
    username: 'admin_national',
    fullName: '张国立',
    role: 'national',
    roleName: '国家级管理员',
    unitName: '应急管理部危化品监管局',
    province: '全国',
    permissions: ['dashboard:view', 'monitoring:view', 'alerts:manage', 'approvals:manage', 'inventory:view', 'procurement:manage', 'diagnosis:view', 'permissions:manage', 'reports:export', 'users:manage'],
    lastLogin: '2024-01-15 09:30:00',
    status: 'active',
  },
  {
    id: '2',
    username: 'admin_beijing',
    fullName: '李京生',
    role: 'province',
    roleName: '省级管理员',
    unitName: '北京市应急管理局',
    province: '北京市',
    permissions: ['dashboard:view', 'monitoring:view', 'alerts:manage', 'approvals:manage', 'inventory:view', 'procurement:view', 'diagnosis:view', 'reports:export'],
    lastLogin: '2024-01-15 08:45:00',
    status: 'active',
  },
  {
    id: '3',
    username: 'admin_shanghai',
    fullName: '王海',
    role: 'province',
    roleName: '省级管理员',
    unitName: '上海市应急管理局',
    province: '上海市',
    permissions: ['dashboard:view', 'monitoring:view', 'alerts:manage', 'approvals:manage', 'inventory:view', 'procurement:view', 'diagnosis:view', 'reports:export'],
    lastLogin: '2024-01-14 16:20:00',
    status: 'active',
  },
  {
    id: '4',
    username: 'admin_guangdong',
    fullName: '陈粤',
    role: 'province',
    roleName: '省级管理员',
    unitName: '广东省应急管理厅',
    province: '广东省',
    permissions: ['dashboard:view', 'monitoring:view', 'alerts:manage', 'approvals:manage', 'inventory:view', 'procurement:view', 'diagnosis:view', 'reports:export'],
    lastLogin: '2024-01-15 10:15:00',
    status: 'active',
  },
  {
    id: '5',
    username: 'lab_001',
    fullName: '刘实验',
    role: 'unit',
    roleName: '单位管理员',
    unitName: '清华大学化学实验室',
    province: '北京市',
    permissions: ['dashboard:view', 'monitoring:view', 'alerts:view', 'inventory:manage', 'procurement:create', 'diagnosis:view', 'usage:record'],
    lastLogin: '2024-01-15 07:50:00',
    status: 'active',
  },
  {
    id: '6',
    username: 'lab_002',
    fullName: '赵安全',
    role: 'unit',
    roleName: '单位管理员',
    unitName: '北京大学化学与分子工程学院',
    province: '北京市',
    permissions: ['dashboard:view', 'monitoring:view', 'alerts:view', 'inventory:manage', 'procurement:create', 'diagnosis:view', 'usage:record'],
    lastLogin: '2024-01-14 14:30:00',
    status: 'active',
  },
  {
    id: '7',
    username: 'lab_003',
    fullName: '钱华',
    role: 'unit',
    roleName: '单位管理员',
    unitName: '复旦大学化学系',
    province: '上海市',
    permissions: ['dashboard:view', 'monitoring:view', 'alerts:view', 'inventory:manage', 'procurement:create', 'diagnosis:view', 'usage:record'],
    lastLogin: '2024-01-15 08:00:00',
    status: 'active',
  },
  {
    id: '8',
    username: 'lab_004',
    fullName: '孙科',
    role: 'unit',
    roleName: '单位管理员',
    unitName: '上海交通大学化工学院',
    province: '上海市',
    permissions: ['dashboard:view', 'monitoring:view', 'alerts:view', 'inventory:manage', 'procurement:create', 'diagnosis:view', 'usage:record'],
    lastLogin: '2024-01-13 09:15:00',
    status: 'inactive',
  },
  {
    id: '9',
    username: 'lab_005',
    fullName: '周明',
    role: 'unit',
    roleName: '单位管理员',
    unitName: '华南理工大学化学与化工学院',
    province: '广东省',
    permissions: ['dashboard:view', 'monitoring:view', 'alerts:view', 'inventory:manage', 'procurement:create', 'diagnosis:view', 'usage:record'],
    lastLogin: '2024-01-15 11:00:00',
    status: 'active',
  },
  {
    id: '10',
    username: 'lab_006',
    fullName: '吴工',
    role: 'unit',
    roleName: '单位管理员',
    unitName: '中山大学化学学院',
    province: '广东省',
    permissions: ['dashboard:view', 'monitoring:view', 'alerts:view', 'inventory:manage', 'procurement:create', 'diagnosis:view', 'usage:record'],
    lastLogin: '2024-01-12 16:45:00',
    status: 'inactive',
  },
];

const rolesInfo: RoleInfo[] = [
  {
    level: 'national',
    name: '国家级管理员',
    icon: Crown,
    color: 'from-amber-500 to-orange-600',
    description: '拥有全国范围内最高管理权限，可监管所有省份和单位的危化品安全数据，进行跨区域协调和决策。',
    scope: '全国所有省份、所有单位',
    permissions: ['数据概览（全国）', '实时监控（全国）', '预警管理（全部）', '审批管理（三级）', '库存查询（全国）', '采购管理（审批）', '智能诊断', '权限管理', '报告导出', '用户管理'],
  },
  {
    level: 'province',
    name: '省级管理员',
    icon: Star,
    color: 'from-blue-500 to-cyan-600',
    description: '负责本省范围内危化品安全监管，可查看本省所有单位数据，审批本省采购和处置申请，协调省内应急资源。',
    scope: '本省范围内所有单位',
    permissions: ['数据概览（本省）', '实时监控（本省）', '预警管理（本省）', '审批管理（二、三级）', '库存查询（本省）', '采购查询（本省）', '智能诊断', '报告导出'],
  },
  {
    level: 'unit',
    name: '单位管理员',
    icon: UserCheck,
    color: 'from-emerald-500 to-teal-600',
    description: '负责本单位危化品日常管理，包括库存管理、使用记录、预警响应、采购申请等具体操作。',
    scope: '仅本单位数据和操作',
    permissions: ['数据概览（本单位）', '实时监控（本单位）', '预警查看与响应', '库存管理', '采购申请', '使用记录', '智能诊断'],
  },
];

const permissionModules: PermissionModule[] = [
  { id: 'dashboard', name: '数据概览', icon: Shield, national: true, province: true, unit: true },
  { id: 'monitoring', name: '实时监控', icon: Shield, national: true, province: true, unit: true },
  { id: 'alerts_view', name: '预警查看', icon: AlertTriangle, national: true, province: true, unit: true },
  { id: 'alerts_manage', name: '预警管理', icon: AlertTriangle, national: true, province: true, unit: false },
  { id: 'approvals_1', name: '一级审批（实验员）', icon: CheckCircle2, national: false, province: false, unit: true },
  { id: 'approvals_2', name: '二级审批（单位负责人）', icon: CheckCircle2, national: true, province: true, unit: true },
  { id: 'approvals_3', name: '三级审批（省级主管）', icon: CheckCircle2, national: true, province: true, unit: false },
  { id: 'inventory_view', name: '库存查询', icon: Building2, national: true, province: true, unit: true },
  { id: 'inventory_manage', name: '库存管理', icon: Building2, national: false, province: false, unit: true },
  { id: 'procurement_create', name: '采购申请', icon: Building2, national: false, province: false, unit: true },
  { id: 'procurement_view', name: '采购查询', icon: Building2, national: true, province: true, unit: true },
  { id: 'procurement_manage', name: '采购审批', icon: Building2, national: true, province: false, unit: false },
  { id: 'diagnosis', name: '智能诊断', icon: Shield, national: true, province: true, unit: true },
  { id: 'reports', name: '报告导出', icon: Shield, national: true, province: true, unit: false },
  { id: 'permissions', name: '权限管理', icon: Lock, national: true, province: false, unit: false },
  { id: 'users', name: '用户管理', icon: Users, national: true, province: false, unit: false },
];

const tabOptions: { value: AdminLevel | 'all'; label: string; icon: typeof Globe }[] = [
  { value: 'all', label: '全部用户', icon: Users },
  { value: 'national', label: '国家级', icon: Globe },
  { value: 'province', label: '省级', icon: MapPin },
  { value: 'unit', label: '单位级', icon: Building2 },
];

const permissionLabels: Record<string, string> = {
  'dashboard:view': '数据概览',
  'monitoring:view': '实时监控',
  'alerts:view': '预警查看',
  'alerts:manage': '预警管理',
  'approvals:manage': '审批管理',
  'inventory:view': '库存查询',
  'inventory:manage': '库存管理',
  'procurement:create': '采购申请',
  'procurement:view': '采购查询',
  'procurement:manage': '采购审批',
  'diagnosis:view': '智能诊断',
  'permissions:manage': '权限管理',
  'reports:export': '报告导出',
  'users:manage': '用户管理',
  'usage:record': '使用记录',
};

export default function Permissions() {
  const { user, getAdminLevel } = useAppStore();
  const [activeTab, setActiveTab] = useState<AdminLevel | 'all'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  const isNational = getAdminLevel() === 'national';

  const filteredUsers = useMemo(() => {
    return mockUsers.filter((u) => {
      const matchesTab = activeTab === 'all' || u.role === activeTab;
      const matchesSearch = searchKeyword
        ? u.username.includes(searchKeyword) ||
          u.fullName.includes(searchKeyword) ||
          u.unitName.includes(searchKeyword) ||
          u.province.includes(searchKeyword)
        : true;
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchKeyword]);

  const statistics = useMemo(() => {
    return {
      total: mockUsers.length,
      national: mockUsers.filter((u) => u.role === 'national').length,
      province: mockUsers.filter((u) => u.role === 'province').length,
      unit: mockUsers.filter((u) => u.role === 'unit').length,
      active: mockUsers.filter((u) => u.status === 'active').length,
    };
  }, []);

  const getRoleIcon = (role: AdminLevel) => {
    switch (role) {
      case 'national':
        return Crown;
      case 'province':
        return Star;
      case 'unit':
        return UserCheck;
    }
  };

  const getRoleBadgeColor = (role: AdminLevel) => {
    switch (role) {
      case 'national':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'province':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case 'unit':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    }
  };

  if (!isNational) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="glass-card p-12 text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent-danger/10 flex items-center justify-center">
            <Lock className="w-10 h-10 text-accent-danger" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">无权限访问</h2>
          <p className="text-slate-400 mb-6">
            该页面仅对国家级管理员开放。如需访问，请联系上级管理员获取相应权限。
          </p>
          <div className="bg-surface-light/50 rounded-lg p-4">
            <div className="text-sm text-slate-500 mb-2">您当前的角色</div>
            <div className="flex items-center justify-center gap-2">
              {user?.role && (
                <span className={cn('badge border', getRoleBadgeColor(user.role))}>
                  {getRoleIcon(user.role) && (() => {
                    const Icon = getRoleIcon(user.role);
                    return <Icon className="w-3 h-3" />;
                  })()}
                  {user.roleName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-primary-400" />
            权限管理
          </h1>
          <p className="text-slate-400 mt-1">管理系统用户权限，查看角色权限范围和权限矩阵</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{statistics.total}</div>
              <div className="text-xs text-slate-400">总用户数</div>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400">{statistics.national}</div>
              <div className="text-xs text-slate-400">国家级</div>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Star className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">{statistics.province}</div>
              <div className="text-xs text-slate-400">省级</div>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{statistics.unit}</div>
              <div className="text-xs text-slate-400">单位级</div>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-safe/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-accent-safe" />
            </div>
            <div>
              <div className="text-2xl font-bold text-accent-safe">{statistics.active}</div>
              <div className="text-xs text-slate-400">活跃用户</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {rolesInfo.map((role) => {
          const Icon = role.icon;
          return (
            <div key={role.level} className="glass-card p-6 hover:shadow-glow transition-all duration-300">
              <div className="flex items-start gap-4 mb-4">
                <div className={cn('w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg', role.color)}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{role.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">管理范围：{role.scope}</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 mb-4 leading-relaxed">{role.description}</p>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  权限列表
                </div>
                <div className="space-y-1.5">
                  {role.permissions.map((perm, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                      <ChevronRight className="w-4 h-4 text-primary-400 flex-shrink-0" />
                      <span className="truncate">{perm}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">
            <Shield className="w-5 h-5 text-primary-400" />
            权限矩阵
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header w-1/3">功能模块</th>
                <th className="table-header text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    国家级
                  </div>
                </th>
                <th className="table-header text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Star className="w-4 h-4 text-blue-400" />
                    省级
                  </div>
                </th>
                <th className="table-header text-center">
                  <div className="flex items-center justify-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    单位级
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {permissionModules.map((module) => {
                const ModuleIcon = module.icon;
                return (
                  <tr key={module.id} className="hover:bg-surface-light/30 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <ModuleIcon className="w-4 h-4 text-primary-400" />
                        <span className="text-white font-medium">{module.name}</span>
                      </div>
                    </td>
                    <td className="table-cell text-center">
                      {module.national ? (
                        <CheckCircle2 className="w-5 h-5 text-accent-safe mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-slate-600 mx-auto" />
                      )}
                    </td>
                    <td className="table-cell text-center">
                      {module.province ? (
                        <CheckCircle2 className="w-5 h-5 text-accent-safe mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-slate-600 mx-auto" />
                      )}
                    </td>
                    <td className="table-cell text-center">
                      {module.unit ? (
                        <CheckCircle2 className="w-5 h-5 text-accent-safe mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-slate-600 mx-auto" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">
            <Users className="w-5 h-5 text-primary-400" />
            用户列表
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索用户名、姓名、单位..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="input-field flex-1"
            />
          </div>

          <div className="flex items-center gap-1 bg-surface-light/50 rounded-lg p-1">
            {tabOptions.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
                    activeTab === tab.value
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-surface-light',
                  )}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">用户信息</th>
                <th className="table-header">角色</th>
                <th className="table-header">所属单位</th>
                <th className="table-header">所在地区</th>
                <th className="table-header">状态</th>
                <th className="table-header">最后登录</th>
                <th className="table-header">权限列表</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-cell text-center py-12">
                    <Users className="w-12 h-12 mx-auto text-slate-500 mb-3 opacity-30" />
                    <p className="text-slate-400">暂无符合条件的用户</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const RoleIcon = getRoleIcon(u.role);
                  return (
                    <tr key={u.id} className="hover:bg-surface-light/30 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold">
                            {u.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="text-white font-medium">{u.fullName}</div>
                            <div className="text-xs text-slate-400 font-mono">{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={cn('badge border', getRoleBadgeColor(u.role))}>
                          <RoleIcon className="w-3 h-3" />
                          {u.roleName}
                        </span>
                      </td>
                      <td className="table-cell text-slate-300">{u.unitName}</td>
                      <td className="table-cell text-slate-300">{u.province}</td>
                      <td className="table-cell">
                        <span
                          className={cn(
                            'badge border',
                            u.status === 'active'
                              ? 'bg-accent-safe/10 border-accent-safe/30 text-accent-safe'
                              : 'bg-slate-500/10 border-slate-500/30 text-slate-400',
                          )}
                        >
                          {u.status === 'active' ? '活跃' : '未激活'}
                        </span>
                      </td>
                      <td className="table-cell text-slate-400 font-mono text-xs">{u.lastLogin}</td>
                      <td className="table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[300px]">
                          {u.permissions.slice(0, 3).map((perm) => (
                            <span
                              key={perm}
                              className="text-xs px-2 py-0.5 rounded bg-surface-light text-slate-300 border border-surface-border"
                              title={permissionLabels[perm] || perm}
                            >
                              {permissionLabels[perm] || perm}
                            </span>
                          ))}
                          {u.permissions.length > 3 && (
                            <span className="text-xs px-2 py-0.5 rounded bg-surface-light text-slate-400 border border-surface-border">
                              +{u.permissions.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-surface-border">
          <div className="text-sm text-slate-400">
            共 <span className="text-white font-medium">{filteredUsers.length}</span> 条记录
          </div>
        </div>
      </div>
    </div>
  );
}
