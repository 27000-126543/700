import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Package,
  Building2,
  AlertTriangle,
  Activity,
  TrendingUp,
  TrendingDown,
  MapPin,
  Clock,
  ChevronRight,
  RefreshCw,
  Filter,
  AlertCircle,
  Flame,
  Shield,
  Thermometer,
  Droplets,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import StatCard from '@/components/common/StatCard';
import RiskBadge from '@/components/common/RiskBadge';
import ChinaHeatmap from '@/components/charts/ChinaHeatmap';
import TrendChart from '@/components/charts/TrendChart';
import RiskRoseChart from '@/components/charts/RiskRoseChart';
import GaugeChart from '@/components/charts/GaugeChart';
import type {
  DashboardOverview,
  HeatmapData,
  RiskRankingItem,
  TrendData,
  EventTimelineItem,
} from '@shared/types';

export default function Dashboard() {
  const { currentProvince, currentUnit, setCurrentProvince, setCurrentUnit, provinces } =
    useAppStore();

  const [loading, setLoading] = useState({
    overview: true,
    heatmap: true,
    ranking: true,
    trends: true,
    timeline: true,
  });

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [riskRanking, setRiskRanking] = useState<RiskRankingItem[]>([]);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [timeline, setTimeline] = useState<EventTimelineItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const currentProvinceName = useMemo(() => {
    if (!currentProvince) return '全国';
    const province = provinces.find((p) => p.code === currentProvince);
    return province?.name || currentProvince;
  }, [currentProvince, provinces]);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, overview: true }));
      const params: Record<string, unknown> = {};
      if (currentProvince) params.province = currentProvince;
      if (currentUnit) params.unitId = currentUnit;
      const data = await api.get<DashboardOverview>('/dashboard/overview', params);
      setOverview(data);
      setError(null);
    } catch (err) {
      console.error('获取概览数据失败:', err);
      setError('获取概览数据失败');
    } finally {
      setLoading((prev) => ({ ...prev, overview: false }));
    }
  }, [currentProvince, currentUnit]);

  const fetchHeatmap = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, heatmap: true }));
      const params: Record<string, unknown> = {};
      if (currentProvince) params.province = currentProvince;
      const data = await api.get<HeatmapData[]>('/dashboard/heatmap', params);
      setHeatmapData(data);
    } catch (err) {
      console.error('获取热力图数据失败:', err);
    } finally {
      setLoading((prev) => ({ ...prev, heatmap: false }));
    }
  }, [currentProvince]);

  const fetchRiskRanking = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, ranking: true }));
      const params: Record<string, unknown> = { limit: 10 };
      if (currentProvince) params.province = currentProvince;
      if (currentUnit) params.unitId = currentUnit;
      const data = await api.get<RiskRankingItem[]>('/dashboard/risk-ranking', params);
      setRiskRanking(data);
    } catch (err) {
      console.error('获取风险排名失败:', err);
    } finally {
      setLoading((prev) => ({ ...prev, ranking: false }));
    }
  }, [currentProvince, currentUnit]);

  const fetchTrends = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, trends: true }));
      const params: Record<string, unknown> = { days: 7 };
      if (currentUnit) params.unitId = currentUnit;
      const data = await api.get<TrendData>('/dashboard/trends', params);
      setTrendData(data);
    } catch (err) {
      console.error('获取趋势数据失败:', err);
    } finally {
      setLoading((prev) => ({ ...prev, trends: false }));
    }
  }, [currentUnit]);

  const fetchTimeline = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, timeline: true }));
      const params: Record<string, unknown> = { limit: 15 };
      if (currentProvince) params.province = currentProvinceName;
      const data = await api.get<EventTimelineItem[]>('/dashboard/events-timeline', params);
      setTimeline(data);
    } catch (err) {
      console.error('获取事件时间线失败:', err);
    } finally {
      setLoading((prev) => ({ ...prev, timeline: false }));
    }
  }, [currentProvince, currentProvinceName]);

  const fetchAllData = useCallback(() => {
    fetchOverview();
    fetchHeatmap();
    fetchRiskRanking();
    fetchTrends();
    fetchTimeline();
  }, [fetchOverview, fetchHeatmap, fetchRiskRanking, fetchTrends, fetchTimeline]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleProvinceClick = useCallback(
    (province: HeatmapData) => {
      if (currentProvince === province.provinceCode) {
        setCurrentProvince(null);
        setCurrentUnit(null);
      } else {
        setCurrentProvince(province.provinceCode);
        setCurrentUnit(null);
      }
    },
    [currentProvince, setCurrentProvince, setCurrentUnit],
  );

  const handleUnitClick = useCallback(
    (item: RiskRankingItem) => {
      if (currentUnit === item.unitId) {
        setCurrentUnit(null);
      } else {
        setCurrentUnit(item.unitId);
      }
    },
    [currentUnit, setCurrentUnit],
  );

  const handleResetFilter = useCallback(() => {
    setCurrentProvince(null);
    setCurrentUnit(null);
  }, [setCurrentProvince, setCurrentUnit]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'leak':
        return <Droplets className="w-4 h-4" />;
      case 'temperature':
        return <Thermometer className="w-4 h-4" />;
      case 'humidity':
        return <Droplets className="w-4 h-4" />;
      case 'low_stock':
        return <Package className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      leak: '泄漏事件',
      temperature: '温度异常',
      humidity: '湿度异常',
      low_stock: '库存不足',
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '待处理',
      processing: '处理中',
      resolved: '已解决',
      escalated: '已升级',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'text-accent-warning bg-accent-warning/10 border-accent-warning/30',
      processing: 'text-primary-300 bg-primary-600/10 border-primary-600/30',
      resolved: 'text-accent-safe bg-accent-safe/10 border-accent-safe/30',
      escalated: 'text-accent-danger bg-accent-danger/10 border-accent-danger/30',
    };
    return colors[status] || 'text-slate-400 bg-slate-500/10 border-slate-500/30';
  };

  const roseChartData = useMemo(() => {
    const typeCounts: Record<string, number> = {
      泄漏事件: 0,
      温度异常: 0,
      湿度异常: 0,
      库存不足: 0,
    };
    timeline.forEach((item) => {
      const label = getAlertTypeLabel(item.type);
      typeCounts[label] = (typeCounts[label] || 0) + 1;
    });
    return Object.fromEntries(Object.entries(typeCounts).filter(([_, v]) => v > 0));
  }, [timeline]);

  const isLoading = Object.values(loading).some(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="w-7 h-7 text-primary-400" />
            安全监控概览
          </h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            当前区域:
            <span className="text-primary-300 font-medium">
              {currentUnit
                ? riskRanking.find((r) => r.unitId === currentUnit)?.unitName || '未知单位'
                : currentProvinceName}
            </span>
            {(currentProvince || currentUnit) && (
              <button
                onClick={handleResetFilter}
                className="ml-2 text-xs text-slate-500 hover:text-primary-400 flex items-center gap-1 transition-colors"
              >
                <Filter className="w-3 h-3" />
                清除筛选
              </button>
            )}
          </p>
        </div>
        <button
          onClick={fetchAllData}
          disabled={isLoading}
          className={cn(
            'btn-outline flex items-center gap-2',
            isLoading && 'opacity-50 cursor-not-allowed',
          )}
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          刷新数据
        </button>
      </div>

      {error && (
        <div className="glass-card border-accent-danger/50 bg-accent-danger/10 p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-accent-danger" />
          <span className="text-accent-danger">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总库存量"
          value={loading.overview ? '...' : overview?.totalInventory.toLocaleString() || '0'}
          subtitle="吨危化品"
          icon={<Package className="w-5 h-5" />}
          trend={overview?.inventoryTrend}
          trendLabel="较上周"
          color="blue"
        />
        <StatCard
          title="在线实验室"
          value={
            loading.overview
              ? '...'
              : `${overview?.onlineLabs || 0}/${overview?.totalLabs || 0}`
          }
          subtitle="实验室总数"
          icon={<Building2 className="w-5 h-5" />}
          trend={overview?.onlineLabs && overview?.totalLabs ? Math.round((overview.onlineLabs / overview.totalLabs) * 100) : 0}
          trendLabel="在线率"
          color="green"
        />
        <StatCard
          title="活跃预警"
          value={loading.overview ? '...' : overview?.activeAlerts || 0}
          subtitle="待处理预警"
          icon={<AlertTriangle className="w-5 h-5" />}
          trend={overview?.alertsTrend}
          trendLabel="较上周"
          color="red"
        />
        <StatCard
          title="平均风险评分"
          value={loading.overview ? '...' : overview?.avgRiskScore.toFixed(1) || '0'}
          subtitle="综合风险指数"
          icon={<Activity className="w-5 h-5" />}
          trend={overview?.riskTrend}
          trendLabel="较上周"
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChinaHeatmap
            data={heatmapData}
            onProvinceClick={handleProvinceClick}
            height={500}
            className={loading.heatmap ? 'opacity-60' : ''}
          />
        </div>

        <div className="glass-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-danger animate-pulse" />
              风险单位排名
            </h3>
            <span className="text-xs text-slate-500">TOP {riskRanking.length}</span>
          </div>

          {loading.ranking ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
              {riskRanking.map((item, index) => (
                <div
                  key={item.unitId}
                  onClick={() => handleUnitClick(item)}
                  className={cn(
                    'group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200',
                    currentUnit === item.unitId
                      ? 'bg-primary-600/20 border border-primary-500/50'
                      : 'bg-surface-light/50 hover:bg-surface-light border border-transparent hover:border-surface-border',
                  )}
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                      index === 0
                        ? 'bg-gradient-to-br from-accent-gold to-amber-600 text-white'
                        : index === 1
                          ? 'bg-gradient-to-br from-slate-400 to-slate-500 text-white'
                          : index === 2
                            ? 'bg-gradient-to-br from-amber-700 to-amber-800 text-white'
                            : 'bg-surface-card text-slate-400',
                    )}
                  >
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">
                        {item.unitName}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-primary-400 transition-colors opacity-0 group-hover:opacity-100" />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">{item.province}</span>
                      <span className="text-xs text-slate-600">•</span>
                      <span className="text-xs text-accent-danger">
                        <AlertTriangle className="w-3 h-3 inline mr-0.5" />
                        {item.alertCount}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <RiskBadge level={item.level} size="sm" showIcon={false} />
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-mono font-bold text-white">
                        {item.score.toFixed(0)}
                      </span>
                      {item.trend !== undefined && item.trend !== 0 && (
                        <span
                          className={cn(
                            'text-xs flex items-center',
                            item.trend > 0 ? 'text-accent-danger' : 'text-accent-safe',
                          )}
                        >
                          {item.trend > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {Math.abs(item.trend)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {riskRanking.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                  <Shield className="w-12 h-12 mb-2 opacity-30" />
                  <p className="text-sm">暂无风险单位数据</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        {trendData && !loading.trends ? (
          <TrendChart data={trendData} height={380} />
        ) : (
          <div className="glass-card h-[420px] flex items-center justify-center">
            <div className="w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Flame className="w-4 h-4 text-accent-danger" />
              风险类型分布
            </h3>
          </div>
          <RiskRoseChart
            data={Object.keys(roseChartData).length > 0 ? roseChartData : { '暂无数据': 1 }}
            height={300}
          />
        </div>

        <div className="glass-card p-5 flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-2">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent-warning" />
              综合风险指数
            </h3>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <GaugeChart
              value={overview?.avgRiskScore || 0}
              size={260}
              showLabel={false}
            />
          </div>
          <div className="text-center mt-2">
            <p className="text-xs text-slate-500">
              双锁验证率: {overview?.doubleLockRate || 0}%
              {overview?.doubleLockTrend !== undefined && (
                <span
                  className={cn(
                    'ml-1',
                    overview.doubleLockTrend > 0 ? 'text-accent-safe' : 'text-accent-danger',
                  )}
                >
                  ({overview.doubleLockTrend > 0 ? '+' : ''}
                  {overview.doubleLockTrend}%)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="glass-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-400" />
              安全事件时间线
            </h3>
            <span className="text-xs text-slate-500">最近 {timeline.length} 条</span>
          </div>

          {loading.timeline ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 -mr-1">
              <div className="relative">
                <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-surface-border" />

                <div className="space-y-4">
                  {timeline.map((item, index) => (
                    <div key={item.id} className="relative pl-7">
                      <div
                        className={cn(
                          'absolute left-0 top-1 w-[22px] h-[22px] rounded-full flex items-center justify-center border-2 border-surface',
                          item.level === 1
                            ? 'bg-accent-danger shadow-glow-danger'
                            : 'bg-accent-warning shadow-glow-warning',
                        )}
                      >
                        {getAlertIcon(item.type)}
                      </div>

                      <div
                        className={cn(
                          'p-3 rounded-lg bg-surface-light/50 border border-surface-border/50 hover:border-primary-600/30 transition-colors cursor-pointer',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={cn(
                                  'text-xs px-2 py-0.5 rounded-full border font-medium',
                                  item.level === 1
                                    ? 'text-accent-danger bg-accent-danger/10 border-accent-danger/30'
                                    : 'text-accent-warning bg-accent-warning/10 border-accent-warning/30',
                                )}
                              >
                                {item.level === 1 ? '一级' : '二级'}
                              </span>
                              <span className="text-xs text-slate-500">
                                {getAlertTypeLabel(item.type)}
                              </span>
                            </div>
                            <p className="text-sm text-white font-medium mb-1 line-clamp-1">
                              {item.title}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">
                                {item.province} · {item.unitName}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={cn(
                                'text-xs px-2 py-0.5 rounded-full border font-medium',
                                getStatusColor(item.status),
                              )}
                            >
                              {getStatusLabel(item.status)}
                            </span>
                            <span className="text-xs text-slate-600 font-mono">
                              {dayjs(item.time).format('MM-DD HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {index < timeline.length - 1 && (
                        <div className="absolute left-[11px] top-[26px] w-0.5 h-4 bg-gradient-to-b from-surface-border to-transparent" />
                      )}
                    </div>
                  ))}
                </div>

                {timeline.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <Shield className="w-12 h-12 mb-2 opacity-30" />
                    <p className="text-sm">近期安全事件</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
