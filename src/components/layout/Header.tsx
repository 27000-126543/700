import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  CheckCircle,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { api } from '@/lib/api';
import type { Alert as AlertType, Province, UnitInfo } from '@shared/types';
import { cn } from '@/lib/utils';

export default function Header() {
  const navigate = useNavigate();
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

  const fetchRecentAlerts = useCallback(async () => {
    try {
      const pendingData = await api.get<{ items: AlertType[]; total: number }>('/alerts', {
        status: 'pending',
        pageSize: 5,
      });
      const processingData = await api.get<{ items: AlertType[]; total: number }>('/alerts', {
        status: 'processing',
        pageSize: 3,
      });
      const escalatedData = await api.get<{ items: AlertType[]; total: number }>('/alerts', {
        status: 'escalated',
        pageSize: 2,
      });
      
      const allItems = [
        ...(pendingData.items || []),
        ...(processingData.items || []),
        ...(escalatedData.items || []),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);
      
      const totalUnread = (pendingData.total || 0) + (processingData.total || 0) + (escalatedData.total || 0);
      
      setAlerts(allItems);
      setUnreadAlerts(totalUnread);
    } catch (err) {
      console.error('加载预警列表失败:', err);
    }
  }, [setUnreadAlerts]);

  useEffect(() => {
    fetchRecentAlerts();
    const interval = setInterval(fetchRecentAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchRecentAlerts]);

  useEffect(() => {
    if (currentProvince) {
      loadUnits();
    }
  }, [currentProvince]);

  const loadUnits = async () => {
    if (!currentProvince) return;
    setLoadingUnits(true);
    try {
      const data = await api.get<UnitInfo[]>('/common/units', { provinceCode: currentProvince });
      setUnits(data);
    } catch (err) {
      console.error('加载单位列表失败:', err);
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleProvinceChange = (province: Province | null) => {
    setCurrentProvince(province?.code || null);
    setCurrentUnit(null);
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

  const handleViewAllAlerts = () => {
    setShowAlerts(false);
    navigate('/alerts');
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

  const typeLabels: Record<string, string> = {
    leak: '泄漏',
    temperature: '超温',
    humidity: '超湿',
    low_stock: '库存不足',
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
              if (!showAlerts) fetchRecentAlerts();
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
              <div className="p-4 border-b border-surface-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">预警通知</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    共 {unreadAlerts} 条未处理预警
                  </p>
                </div>
                {unreadAlerts > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-accent-danger/20 text-accent-danger rounded-full">
                    {unreadAlerts} 条待处理
                  </span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-accent-safe/30" />
                    <p>暂无未处理预警</p>
                    <p className="text-xs text-slate-600 mt-1">所有预警均已处理</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {alerts.slice(0, 10).map((alert) => {
                      const LevelIcon = levelIcons[alert.level] || AlertTriangle;
                      return (
                        <div
                          key={alert.id}
                          className={cn(
                            'p-3 rounded-lg border transition-colors cursor-pointer hover:bg-surface-light',
                            levelColors[alert.level] || levelColors[1],
                          )}
                          onClick={() => {
                            setShowAlerts(false);
                            navigate('/alerts');
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <LevelIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{alert.title}</div>
                              <div className="text-xs opacity-80 mt-0.5">
                                {alert.unitName} - {alert.labName}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {alert.type && typeLabels[alert.type] && (
                                  <span className="text-xs px-1.5 py-0.5 bg-surface-light/50 rounded">
                                    {typeLabels[alert.type]}
                                  </span>
                                )}
                                <span className="text-xs opacity-60">
                                  {new Date(alert.createdAt).toLocaleString('zh-CN')}
                                </span>
                              </div>
                            </div>
                            <span className={cn(
                              'text-xs px-1.5 py-0.5 rounded font-medium',
                              alert.level === 1
                                ? 'bg-accent-warning/20 text-accent-warning'
                                : 'bg-accent-danger/20 text-accent-danger'
                            )}>
                              {alert.level}级
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-surface-border">
                <button
                  onClick={handleViewAllAlerts}
                  className="w-full text-sm text-primary-400 hover:text-primary-300 font-medium flex items-center justify-center gap-1"
                >
                  查看全部预警
                  <ChevronDown className="w-3 h-3 rotate-180" />
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
