import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  AlertTriangle,
  ClipboardCheck,
  Package,
  ShoppingCart,
  FileBarChart,
  Users,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

const navItems = [
  {
    path: '/dashboard',
    label: '核心看板',
    icon: LayoutDashboard,
  },
  {
    path: '/monitoring',
    label: '实时监测',
    icon: Activity,
  },
  {
    path: '/alerts',
    label: '预警应急',
    icon: AlertTriangle,
  },
  {
    path: '/approvals',
    label: '审批流程',
    icon: ClipboardCheck,
  },
  {
    path: '/inventory',
    label: '库存管理',
    icon: Package,
  },
  {
    path: '/procurement',
    label: '采购计划',
    icon: ShoppingCart,
  },
  {
    path: '/diagnosis',
    label: '安全诊断',
    icon: FileBarChart,
  },
  {
    path: '/permissions',
    label: '权限管理',
    icon: Users,
    permission: 'admin:manage',
  },
];

export default function Sidebar() {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar, user, hasPermission } = useAppStore();

  const filteredNavItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-surface-card/95 backdrop-blur-xl border-r border-surface-border transition-all duration-300 flex-shrink-0',
        sidebarCollapsed ? 'w-20' : 'w-64',
      )}
    >
      <div className="flex items-center h-16 px-4 border-b border-surface-border">
        <div
          className={cn(
            'flex items-center gap-3 overflow-hidden',
            sidebarCollapsed ? 'justify-center w-full' : '',
          )}
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white whitespace-nowrap">
                危化品监测
              </span>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                全国安全调度平台
              </span>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'nav-link group relative',
                isActive ? 'nav-link-active' : '',
                sidebarCollapsed ? 'justify-center px-2' : '',
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 flex-shrink-0 transition-colors',
                  isActive ? 'text-primary-300' : 'text-slate-400 group-hover:text-white',
                )}
              />
              {!sidebarCollapsed && <span>{item.label}</span>}
              {isActive && (
                <span className="absolute left-0 w-1 h-6 bg-primary-400 rounded-r-full" />
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-surface-border">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-light transition-all duration-200"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">收起菜单</span>
            </>
          )}
        </button>
      </div>

      {user && (
        <div
          className={cn(
            'p-3 border-t border-surface-border bg-surface-light/50',
            sidebarCollapsed ? 'px-2' : '',
          )}
        >
          <div
            className={cn(
              'flex items-center gap-3',
              sidebarCollapsed ? 'justify-center' : '',
            )}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-info to-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user.fullName?.charAt(0) || user.username?.charAt(0)}
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium text-white truncate">
                  {user.fullName}
                </span>
                <span className="text-xs text-slate-400 truncate">{user.roleName}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
