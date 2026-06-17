import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Thermometer,
  Droplets,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Building2,
  Activity,
  Clock,
  BarChart3,
  Filter,
  ChevronRight,
  Wifi,
  WifiOff,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { SensorData, Laboratory, SensorStatus, SensorType } from '@shared/types';

interface SensorHistoryData {
  sensorId: string;
  timestamps: string[];
  values: number[];
  unit: string;
  type: SensorType;
}

interface LabStats {
  totalSensors: number;
  onlineSensors: number;
  normalSensors: number;
  warningSensors: number;
  alarmSensors: number;
}

const STATUS_CONFIG: Record<SensorStatus, { label: string; color: string; bgColor: string; borderColor: string; glowColor: string }> = {
  normal: {
    label: '正常',
    color: '#3CAEA3',
    bgColor: 'bg-accent-safe/10',
    borderColor: 'border-accent-safe/50',
    glowColor: 'shadow-[0_0_20px_rgba(60,174,163,0.3)]',
  },
  warning: {
    label: '警告',
    color: '#F76C5E',
    bgColor: 'bg-accent-warning/10',
    borderColor: 'border-accent-warning/50',
    glowColor: 'shadow-[0_0_20px_rgba(247,108,94,0.3)]',
  },
  alarm: {
    label: '报警',
    color: '#E63946',
    bgColor: 'bg-accent-danger/10',
    borderColor: 'border-accent-danger/50',
    glowColor: 'shadow-[0_0_30px_rgba(230,57,70,0.5)]',
  },
};

const SENSOR_TYPE_CONFIG: Record<SensorType, { label: string; icon: typeof Thermometer; unit: string }> = {
  temperature: { label: '温度', icon: Thermometer, unit: '°C' },
  humidity: { label: '湿度', icon: Droplets, unit: '%' },
  leak: { label: '泄露', icon: AlertTriangle, unit: 'ppm' },
};

function GaugeDisplay({ value, type, status }: { value: number; type: SensorType; status: SensorStatus }) {
  const config = STATUS_CONFIG[status];
  const typeConfig = SENSOR_TYPE_CONFIG[type];
  const Icon = typeConfig.icon;

  const min = type === 'temperature' ? 0 : type === 'humidity' ? 0 : 0;
  const max = type === 'temperature' ? 50 : type === 'humidity' ? 100 : 20;
  const percentage = ((value - min) / (max - min)) * 100;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  const startAngle = 210;
  const endAngle = -30;
  const angleRange = startAngle - endAngle;
  const currentAngle = startAngle - (clampedPercentage / 100) * angleRange;

  const rad = (currentAngle * Math.PI) / 180;
  const radius = 45;
  const pointerX = 50 + radius * Math.cos(rad);
  const pointerY = 50 + radius * Math.sin(rad);

  return (
    <div className="relative w-full aspect-square max-w-[160px] mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id={`gauge-gradient-${type}-${status}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={config.color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={config.color} stopOpacity="1" />
          </linearGradient>
          <filter id={`glow-${type}-${status}`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="rgba(42, 58, 92, 0.5)"
          strokeWidth="6"
        />

        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke={`url(#gauge-gradient-${type}-${status})`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${clampedPercentage * 2.51} 251`}
          strokeDashoffset="62.8"
          transform="rotate(120 50 50)"
          filter={`url(#glow-${type}-${status})`}
        />

        <line
          x1="50"
          y1="50"
          x2={pointerX}
          y2={pointerY}
          stroke={config.color}
          strokeWidth="2"
          strokeLinecap="round"
          filter={`url(#glow-${type}-${status})`}
        />

        <circle cx="50" cy="50" r="6" fill={config.color} filter={`url(#glow-${type}-${status})`} />
        <circle cx="50" cy="50" r="3" fill="#0B1221" />

        {[0, 25, 50, 75, 100].map((p, i) => {
          const angle = startAngle - (p / 100) * angleRange;
          const radian = (angle * Math.PI) / 180;
          const r1 = 42;
          const r2 = 38;
          return (
            <line
              key={i}
              x1={50 + r2 * Math.cos(radian)}
              y1={50 + r2 * Math.sin(radian)}
              x2={50 + r1 * Math.cos(radian)}
              y2={50 + r1 * Math.sin(radian)}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="1"
            />
          );
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
        <Icon className="w-5 h-5 mb-1" style={{ color: config.color }} />
        <span className="text-2xl font-bold font-mono" style={{ color: config.color }}>
          {value.toFixed(1)}
        </span>
        <span className="text-xs text-slate-400">{typeConfig.unit}</span>
      </div>
    </div>
  );
}

function LeakIndicator({ value, threshold, status }: { value: number; threshold: number; status: SensorStatus }) {
  const config = STATUS_CONFIG[status];
  const isActive = value > 0;
  const percentage = Math.min(100, (value / threshold) * 100);

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="relative">
        <div
          className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center border-2',
            config.bgColor,
            config.borderColor,
            isActive && status !== 'normal' && 'animate-pulse',
          )}
          style={{
            boxShadow: status !== 'normal' ? `0 0 30px ${config.color}60` : 'none',
          }}
        >
          {status === 'normal' ? (
            <CheckCircle className="w-10 h-10" style={{ color: config.color }} />
          ) : status === 'warning' ? (
            <AlertTriangle className="w-10 h-10" style={{ color: config.color }} />
          ) : (
            <XCircle className="w-10 h-10" style={{ color: config.color }} />
          )}
        </div>

        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: config.color, color: '#0B1221' }}>
          {value.toFixed(1)}
        </div>
      </div>

      <div className="mt-4 w-full">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400">浓度</span>
          <span className="font-mono" style={{ color: config.color }}>{value.toFixed(2)} ppm</span>
        </div>
        <div className="h-2 bg-surface-light rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percentage}%`,
              backgroundColor: config.color,
              boxShadow: `0 0 10px ${config.color}`,
            }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1 text-slate-500">
          <span>0</span>
          <span>阈值: {threshold} ppm</span>
        </div>
      </div>
    </div>
  );
}

function SensorCard({ sensor, onViewHistory }: { sensor: SensorData; onViewHistory: (sensor: SensorData) => void }) {
  const config = STATUS_CONFIG[sensor.status];
  const typeConfig = SENSOR_TYPE_CONFIG[sensor.type];
  const Icon = typeConfig.icon;

  return (
    <div
      className={cn(
        'glass-card-hover p-4 border-l-4 transition-all duration-300',
        config.bgColor,
        sensor.status === 'normal' ? 'border-l-accent-safe' :
        sensor.status === 'warning' ? 'border-l-accent-warning' :
        'border-l-accent-danger',
        sensor.status !== 'normal' && config.glowColor,
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('p-2 rounded-lg', config.bgColor)}>
            <Icon className="w-5 h-5" style={{ color: config.color }} />
          </div>
          <div>
            <h4 className="font-medium text-white text-sm">{typeConfig.label}传感器</h4>
            <p className="text-xs text-slate-400">{sensor.location}</p>
          </div>
        </div>
        <span
          className={cn(
            'badge text-xs',
            sensor.status === 'normal' ? 'bg-accent-safe/20 text-accent-safe' :
            sensor.status === 'warning' ? 'bg-accent-warning/20 text-accent-warning' :
            'bg-accent-danger/20 text-accent-danger animate-pulse',
          )}
        >
          {config.label}
        </span>
      </div>

      <div className="mb-3">
        {sensor.type === 'leak' ? (
          <LeakIndicator value={sensor.value} threshold={sensor.threshold} status={sensor.status} />
        ) : (
          <GaugeDisplay value={sensor.value} type={sensor.type} status={sensor.status} />
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-surface-border">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(sensor.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button
          onClick={() => onViewHistory(sensor)}
          className="flex items-center gap-1 text-primary-400 hover:text-primary-300 transition-colors"
        >
          <BarChart3 className="w-3 h-3" />
          历史数据
        </button>
      </div>
    </div>
  );
}

function HistoryChartModal({ sensor, onClose }: { sensor: SensorData; onClose: () => void }) {
  const [historyData, setHistoryData] = useState<SensorHistoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await api.get<SensorHistoryData>(`/inventory/sensors/${sensor.id}/history`, { hours: 24 });
        setHistoryData(data);
      } catch (error) {
        console.error('获取历史数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [sensor.id]);

  const typeConfig = SENSOR_TYPE_CONFIG[sensor.type];
  const config = STATUS_CONFIG[sensor.status];

  const option: EChartsOption = useMemo(() => {
    if (!historyData) return {};

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(26, 37, 64, 0.95)',
        borderColor: '#2A3A5C',
        borderWidth: 1,
        textStyle: { color: '#E2E8F0', fontSize: 13 },
        axisPointer: {
          type: 'cross',
          lineStyle: { color: '#4C77D5', type: 'dashed', width: 1 },
        },
        formatter: (params: any) => {
          const p = params[0];
          return `${p.axisValue}<br/>${typeConfig.label}: ${p.value} ${typeConfig.unit}`;
        },
      },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: historyData.timestamps.map((t) => t.split(' ')[1]),
        axisLine: { lineStyle: { color: '#2A3A5C' } },
        axisLabel: { color: '#94A3B8', fontSize: 11, rotate: 45 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: '#94A3B8', fontSize: 11 },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#2A3A5C', type: 'dashed' } },
        name: typeConfig.unit,
        nameTextStyle: { color: '#94A3B8' },
      },
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        {
          type: 'slider',
          start: 0,
          end: 100,
          height: 20,
          bottom: 5,
          borderColor: 'transparent',
          backgroundColor: '#131B2E',
          fillerColor: 'rgba(76, 119, 213, 0.2)',
          handleStyle: { color: '#4C77D5' },
          textStyle: { color: '#64748B', fontSize: 10 },
        },
      ],
      series: [
        {
          name: typeConfig.label,
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          showSymbol: false,
          emphasis: { focus: 'series', itemStyle: { shadowBlur: 10, shadowColor: config.color } },
          lineStyle: { width: 2, color: config.color },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: config.color + '40' },
                { offset: 1, color: config.color + '00' },
              ],
            },
          },
          data: historyData.values,
          markLine: {
            silent: true,
            lineStyle: { color: '#E63946', type: 'dashed' },
            data: [{ yAxis: sensor.threshold, label: { formatter: '阈值', color: '#E63946' } }],
          },
        },
      ],
    };
  }, [historyData, config.color, typeConfig, sensor.threshold]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', STATUS_CONFIG[sensor.status].bgColor)}>
              <typeConfig.icon className="w-5 h-5" style={{ color: STATUS_CONFIG[sensor.status].color }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{sensor.labName} - {typeConfig.label}传感器</h3>
              <p className="text-sm text-slate-400">{sensor.location} · 最近24小时趋势</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-light rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ReactECharts
              option={option}
              style={{ height: 400, width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function Monitoring() {
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedSensor, setSelectedSensor] = useState<SensorData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [sensorsData, labsData] = await Promise.all([
        api.get<SensorData[]>('/inventory/sensors', selectedLabId ? { labId: selectedLabId } : undefined),
        api.get<{ items: Laboratory[]; total: number }>('/inventory/labs', { pageSize: 100 }),
      ]);

      setSensors(sensorsData);
      setLabs(labsData.items);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedLabId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const stats: LabStats = useMemo(() => {
    return {
      totalSensors: sensors.length,
      onlineSensors: sensors.length,
      normalSensors: sensors.filter((s) => s.status === 'normal').length,
      warningSensors: sensors.filter((s) => s.status === 'warning').length,
      alarmSensors: sensors.filter((s) => s.status === 'alarm').length,
    };
  }, [sensors]);

  const onlineRate = stats.totalSensors > 0 ? ((stats.onlineSensors / stats.totalSensors) * 100).toFixed(1) : '0';

  const sensorsByType = useMemo(() => {
    const grouped: Record<SensorType, SensorData[]> = {
      temperature: [],
      humidity: [],
      leak: [],
    };
    sensors.forEach((s) => {
      grouped[s.type].push(s);
    });
    return grouped;
  }, [sensors]);

  const selectedLab = labs.find((l) => l.id === selectedLabId);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-slate-400">正在加载传感器数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="w-7 h-7 text-primary-400" />
            实时监测中心
          </h1>
          <p className="text-slate-400 mt-1">
            {selectedLab ? `${selectedLab.name} - ` : ''}
            共 {stats.totalSensors} 个传感器 · 上次更新: {lastUpdate.toLocaleTimeString('zh-CN')}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={isRefreshing}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200',
            'bg-primary-600 hover:bg-primary-500 text-white',
            'shadow-lg shadow-primary-600/30 hover:shadow-glow',
            isRefreshing && 'opacity-70 cursor-not-allowed',
          )}
        >
          <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          {isRefreshing ? '刷新中...' : '立即刷新'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card-hover p-5 bg-gradient-to-br from-primary-600/20 to-primary-800/10 border border-primary-600/30">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-slate-400">传感器总数</div>
            <div className="p-2.5 rounded-xl bg-primary-600/20 text-primary-300">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="stat-value text-primary-200">{stats.totalSensors}</div>
          <div className="text-sm text-slate-400 mt-1">个监测设备</div>
        </div>

        <div className="glass-card-hover p-5 bg-gradient-to-br from-accent-safe/20 to-emerald-900/10 border border-accent-safe/30">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-slate-400">在线率</div>
            <div className="p-2.5 rounded-xl bg-accent-safe/20 text-accent-safe">
              <Wifi className="w-5 h-5" />
            </div>
          </div>
          <div className="stat-value text-emerald-200">{onlineRate}%</div>
          <div className="text-sm text-slate-400 mt-1">{stats.onlineSensors} / {stats.totalSensors} 在线</div>
        </div>

        <div className="glass-card-hover p-5 bg-gradient-to-br from-accent-warning/20 to-orange-900/10 border border-accent-warning/30">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-slate-400">警告状态</div>
            <div className="p-2.5 rounded-xl bg-accent-warning/20 text-accent-warning">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="stat-value text-orange-200">{stats.warningSensors}</div>
          <div className="text-sm text-slate-400 mt-1">个传感器预警</div>
        </div>

        <div className="glass-card-hover p-5 bg-gradient-to-br from-accent-danger/20 to-red-900/10 border border-accent-danger/30">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-slate-400">报警状态</div>
            <div className="p-2.5 rounded-xl bg-accent-danger/20 text-accent-danger">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className={cn('stat-value text-red-200', stats.alarmSensors > 0 && 'animate-pulse')}>
            {stats.alarmSensors}
          </div>
          <div className="text-sm text-slate-400 mt-1">个传感器报警</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="glass-card p-5">
            <h3 className="section-title">
              <Building2 className="w-5 h-5 text-primary-400" />
              实验室列表
            </h3>

            <div className="mb-4">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="搜索实验室..."
                  className="input-field pl-10 text-sm"
                />
              </div>
            </div>

            <button
              onClick={() => setSelectedLabId(null)}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-lg mb-2 transition-all',
                selectedLabId === null
                  ? 'bg-primary-600/30 border border-primary-500/50 text-white'
                  : 'hover:bg-surface-light text-slate-300',
              )}
            >
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                全部实验室
              </span>
              <ChevronRight className={cn('w-4 h-4 transition-transform', selectedLabId === null && 'rotate-90')} />
            </button>

            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              {labs.map((lab) => (
                <button
                  key={lab.id}
                  onClick={() => setSelectedLabId(lab.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-lg transition-all text-left',
                    selectedLabId === lab.id
                      ? 'bg-primary-600/30 border border-primary-500/50'
                      : 'hover:bg-surface-light',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-white truncate">{lab.name}</div>
                    <div className="text-xs text-slate-400 truncate">{lab.unitName}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Wifi className="w-3 h-3" />
                        {lab.onlineSensors}/{lab.sensorCount}
                      </span>
                      <span
                        className={cn(
                          'badge text-[10px]',
                          lab.riskLevel === 'low' ? 'bg-accent-safe/20 text-accent-safe' :
                          lab.riskLevel === 'medium' ? 'bg-accent-warning/20 text-accent-warning' :
                          lab.riskLevel === 'high' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-accent-danger/20 text-accent-danger',
                        )}
                      >
                        {lab.riskScore}分
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={cn('w-4 h-4 text-slate-500 transition-transform flex-shrink-0 ml-2', selectedLabId === lab.id && 'rotate-90 text-primary-400')} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {(Object.keys(sensorsByType) as SensorType[]).map((type) => {
            const typeSensors = sensorsByType[type];
            if (typeSensors.length === 0) return null;

            const typeConfig = SENSOR_TYPE_CONFIG[type];
            const TypeIcon = typeConfig.icon;

            return (
              <div key={type}>
                <h3 className="section-title">
                  <TypeIcon className="w-5 h-5 text-primary-400" />
                  {typeConfig.label}监测
                  <span className="ml-2 text-sm font-normal text-slate-400">
                    ({typeSensors.length} 个传感器)
                  </span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {typeSensors.map((sensor) => (
                    <SensorCard
                      key={sensor.id}
                      sensor={sensor}
                      onViewHistory={setSelectedSensor}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {sensors.length === 0 && (
            <div className="glass-card p-12 text-center">
              <WifiOff className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-400">暂无传感器数据</h3>
              <p className="text-sm text-slate-500 mt-1">
                {selectedLab ? '该实验室暂无安装传感器' : '请选择一个实验室查看传感器数据'}
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedSensor && (
        <HistoryChartModal
          sensor={selectedSensor}
          onClose={() => setSelectedSensor(null)}
        />
      )}
    </div>
  );
}
