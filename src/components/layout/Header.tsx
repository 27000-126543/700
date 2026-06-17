import { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  LogOut,
  User,
  MapPin,
  Building2,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { api } from '@/lib/api';
import type { Alert as AlertType, Province, UnitInfo } from '@shared/types';
import { cn } from '@/lib/utils';

export default function Header() {
  const {
    user,
    logout,
    currentProvince,
    setCurrentProvince,
    currentUnit,
    setCurrentUnit,
    provinces,
    setUnreadAlerts,
    unreadAlerts,
  } = useAppStore();

  const [showAlerts, setShowAlerts] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProvinceSelect, setShowProvinceSelect] = useState(false);
  const [showUnitSelect, setShowUnitSelect] = useState(false);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [units, setUnits] = useState<UnitInfo[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (currentProvince) {
      loadUnits();
    }
  }, [currentProvince]);

  const loadUnits = async () => {
    if (!currentProvince) return;
    setLoadingUnits(true);
    try {
      const data = await api.get<UnitInfo[]>('/units', { provinceCode: currentProvince });
      setUnits(data);
    } catch (err) {
      console.error('加载单位列表失败:', err);
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleProvinceChange = (province: Province | null) => {
    setCurrentProvince(province?.code || null);
    setShowProvinceSelect(false);
  };

  const handleUnitChange = (unit: UnitInfo | null) => {
    setCurrentUnit(unit?.id || null);
    setShowUnitSelect(false);
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const currentProvinceName = provinces.find((p) => p.code === currentProvince)?.name;
  const currentUnitName = units.find((u) => u.id === currentUnit)?.name;

  const levelColors: Record<number, string> = {
    1: 'bg-accent-warning/10 text-accent-warning border-accent-warning/30',
    2: 'bg-accent-danger/10 text-accent-danger border-accent-danger/30',
  };

  const levelIcons: Record<number, typeof AlertCircle> = {
    1: AlertTriangle,
    2: AlertCircle,
  };

  return (
    <header className="h-16 bg-surface-card/80 backdrop-blur-xl border-b border-surface-border flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => {
              setShowProvinceSelect(!showProvinceSelect);
              setShowUnitSelect(false);
              setShowUserMenu(false);
              setShowAlerts(false);
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-light hover:bg-surface-light/80 transition-all duration-200 border border-surface-border',
              showProvinceSelect ? 'border-primary-500' : '',
            )}
          >
            <MapPin className="w-4 h-4 text-primary-400" />
            <span className="text-sm font-medium text-slate-200">
              {currentProvinceName || '全国'}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {showProvinceSelect && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-surface-card border border-surface-border rounded-xl shadow-card z-50 max-h-80 overflow-y-auto">
              <div className="p-2">
                <button
                  onClick={() => handleProvinceChange(null)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors',
                    !currentProvince
                      ? 'bg-primary-700/40 text-primary-200'
                      : 'text-slate-300 hover:bg-surface-light',
                  )}
                >
                  <MapPin className="w-4 h-4" />
                  全国（所有省份）
                </button>
                <div className="h-px bg-surface-border my-1" />
                {provinces.map((province) => (
                  <button
                    key={province.code}
                    onClick={() => handleProvinceChange(province)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors',
                      currentProvince === province.code
                        ? 'bg-primary-700/40 text-primary-200'
                        : 'text-slate-300 hover:bg-surface-light',
                    )}
                  >
                    <MapPin className="w-4 h-4" />
                    {province.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {currentProvince && (
          <div className="relative">
            <button
              onClick={() => {
                setShowUnitSelect(!showUnitSelect);
                setShowProvinceSelect(false);
                setShowUserMenu(false);
                setShowAlerts(false);
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-light hover:bg-surface-light/80 transition-all duration-200 border border-surface-border',
                showUnitSelect ? 'border-primary-500' : '',
                loadingUnits ? 'opacity-70 cursor-wait' : '',
              )}
            >
              <Building2 className="w-4 h-4 text-accent-info" />
              <span className="text-sm font-medium text-slate-200">
                {loadingUnits ? '加载中...' : currentUnitName || '全部单位'}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {showUnitSelect && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-surface-card border border-surface-border rounded-xl shadow-card z-50 max-h-80 overflow-y-auto">
                <div className="p-2">
                  <button
                    onClick={() => handleUnitChange(null)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors',
                      !currentUnit
                        ? 'bg-primary-700/40 text-primary-200'
                        : 'text-slate-300 hover:bg-surface-light',
                    )}
                  >
                    <Building2 className="w-4 h-4" />
                    全部单位
                  </button>
                  <div className="h-px bg-surface-border my-1" />
                  {units.map((unit) => (
                    <button
                      key={unit.id}
                      onClick={() => handleUnitChange(unit)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors',
                        currentUnit === unit.id
                          ? 'bg-primary-700/40 text-primary-200'
                          : 'text-slate-300 hover:bg-surface-light',
                      )}
                    >
                      <Building2 className="w-4 h-4" />
                      <div className="flex-1 overflow-hidden">
                        <div className="truncate">{unit.name}</div>
                        <div className="text-xs text-slate-500 truncate">{unit.address}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="搜索实验室、化学品..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-72 pl-10 pr-4 py-2 bg-surface-light border border-surface-border rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowAlerts(!showAlerts);
              setShowProvinceSelect(false);
              setShowUnitSelect(false);
              setShowUserMenu(false);
            }}
            className="relative p-2 rounded-lg hover:bg-surface-light transition-colors"
          >
            <Bell className="w-5 h-5 text-slate-300" />
            {unreadAlerts > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-accent-danger text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadAlerts > 9 ? '9+' : unreadAlerts}
              </span>
            )}
          </button>

          {showAlerts && (
            <div className="absolute top-full right-0 mt-2 w-96 bg-surface-card border border-surface-border rounded-xl shadow-card z-50">
              <div className="p-4 border-b border-surface-border">
                <h3 className="font-semibold text-white">预警通知</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  共 {unreadAlerts} 条未处理预警
                </p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>暂无预警通知</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {alerts.slice(0, 10).map((alert) => {
                      const LevelIcon = levelIcons[alert.level];
                      return (
                        <div
                          key={alert.id}
                          className={cn(
                            'p-3 rounded-lg border transition-colors cursor-pointer hover:bg-surface-light',
                            levelColors[alert.level],
                            alert.status === 'pending' ? 'animate-pulse-slow' : '',
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <LevelIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{alert.title}</div>
                              <div className="text-xs opacity-80 mt-0.5">
                                {alert.unitName} - {alert.labName}
                              </div>
                              <div className="text-xs opacity-60 mt-1">
                                {new Date(alert.createdAt).toLocaleString('zh-CN')}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-surface-border">
                <button className="w-full text-sm text-primary-400 hover:text-primary-300 font-medium">
                  查看全部预警 →
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-surface-border" />

        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowProvinceSelect(false);
              setShowUnitSelect(false);
              setShowAlerts(false);
            }}
            className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-surface-light transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-info to-primary-600 flex items-center justify-center text-white font-bold text-sm">
              {user?.fullName?.charAt(0) || user?.username?.charAt(0)}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium text-white">
                {user?.fullName || user?.username}
              </div>
              <div className="text-xs text-slate-400">{user?.roleName}</div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-surface-card border border-surface-border rounded-xl shadow-card z-50">
              <div className="p-2">
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-slate-300 hover:bg-surface-light transition-colors">
                  <User className="w-4 h-4" />
                  个人信息
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-accent-danger hover:bg-accent-danger/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  退出登录
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
