import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  MapPin,
  Clock,
  Plus,
  RefreshCw,
  Shield,
  Package,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Zap,
  AlertCircle,
  Lightbulb,
  BookOpen,
  ShoppingCart,
  Users,
  ChevronRight,
  FileBarChart,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import StatCard from '@/components/common/StatCard';
import RiskRoseChart from '@/components/charts/RiskRoseChart';
import BarChart from '@/components/charts/BarChart';
import type { SafetyReport, AdminLevel } from '@shared/types';

const scopeLabels: Record<AdminLevel, string> = {
  national: '全国',
  province: '省级',
  unit: '单位',
};

const scopeColors: Record<AdminLevel, string> = {
  national: 'text-accent-purple bg-accent-purple/10 border-accent-purple/30',
  province: 'text-primary-300 bg-primary-600/10 border-primary-600/30',
  unit: 'text-accent-warning bg-accent-warning/10 border-accent-warning/30',
};

export default function Diagnosis() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<SafetyReport | null>(null);
  const [loading, setLoading] = useState({
    list: true,
    detail: false,
    generate: false,
  });
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, list: true }));
      const data = await api.get<SafetyReport[]>('/reports');
      const sorted = [...data].sort(
        (a, b) => dayjs(b.generatedAt).valueOf() - dayjs(a.generatedAt).valueOf(),
      );
      setReports(sorted);
      setError(null);
    } catch (err) {
      console.error('获取报告列表失败:', err);
      setError('获取报告列表失败');
    } finally {
      setLoading((prev) => ({ ...prev, list: false }));
    }
  }, []);

  const fetchReportDetail = useCallback(async (id: string) => {
    try {
      setLoading((prev) => ({ ...prev, detail: true }));
      const data = await api.get<SafetyReport>(`/reports/${id}`);
      setSelectedReport(data);
      setView('detail');
      setError(null);
    } catch (err) {
      console.error('获取报告详情失败:', err);
      setError('获取报告详情失败');
    } finally {
      setLoading((prev) => ({ ...prev, detail: false }));
    }
  }, []);

  const handleGenerateReport = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, generate: true }));
      const data = await api.post<SafetyReport>('/reports/generate');
      setReports((prev) => [data, ...prev]);
      setSelectedReport(data);
      setView('detail');
      setError(null);
    } catch (err) {
      console.error('生成报告失败:', err);
      setError('生成报告失败');
    } finally {
      setLoading((prev) => ({ ...prev, generate: false }));
    }
  }, []);

  const handleBackToList = useCallback(() => {
    setView('list');
    setSelectedReport(null);
  }, []);

  const handleViewDetail = useCallback(
    (report: SafetyReport) => {
      if (report.data) {
        setSelectedReport(report);
        setView('detail');
      } else {
        fetchReportDetail(report.id);
      }
    },
    [fetchReportDetail],
  );

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const formatWeekRange = (start: string, end: string) => {
    return `${dayjs(start).format('YYYY/MM/DD')} - ${dayjs(end).format('YYYY/MM/DD')}`;
  };

  const reportData = selectedReport?.data;

  const turnoverYoYDisplay = useMemo(() => {
    if (!reportData) return null;
    const value = reportData.turnoverRateYoY;
    const isPositive = value >= 0;
    return (
      <div className="flex items-center gap-1.5">
        {isPositive ? (
          <TrendingUp className="w-5 h-5 text-accent-safe" />
        ) : (
          <TrendingDown className="w-5 h-5 text-accent-danger" />
        )}
        <span
          className={cn(
            'text-lg font-bold font-mono',
            isPositive ? 'text-accent-safe' : 'text-accent-danger',
          )}
        >
          {isPositive ? '+' : ''}
          {value}%
        </span>
        <span className="text-xs text-slate-500">同比</span>
      </div>
    );
  }, [reportData]);

  if (view === 'detail' && selectedReport && reportData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToList}
              className="btn-outline flex items-center gap-2 px-3 py-2"
            >
              <ArrowLeft className="w-4 h-4" />
              返回列表
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <FileBarChart className="w-7 h-7 text-primary-400" />
                安全诊断报告
              </h1>
              <p className="text-slate-400 mt-1 flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatWeekRange(selectedReport.weekStart, selectedReport.weekEnd)}
                </span>
                <span
                  className={cn(
                    'badge border',
                    scopeColors[selectedReport.scope],
                  )}
                >
                  {scopeLabels[selectedReport.scope]} · {selectedReport.scopeName}
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-4 h-4" />
                  生成于 {dayjs(selectedReport.generatedAt).format('YYYY-MM-DD HH:mm')}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={loading.generate}
            className={cn(
              'btn-primary flex items-center gap-2',
              loading.generate && 'opacity-50 cursor-not-allowed',
            )}
          >
            <Plus className={cn('w-4 h-4', loading.generate && 'animate-spin')} />
            {loading.generate ? '生成中...' : '生成新报告'}
          </button>
        </div>

        {error && (
          <div className="glass-card border-accent-danger/50 bg-accent-danger/10 p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-accent-danger" />
            <span className="text-accent-danger">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="总库存量"
            value={loading.detail ? '...' : reportData.totalInventory.toLocaleString()}
            subtitle="吨危化品"
            icon={<Package className="w-5 h-5" />}
            trend={reportData.inventoryYoY}
            trendLabel="同比"
            color="blue"
          />
          <div className="glass-card-hover p-5 bg-gradient-to-br from-purple-600/20 to-purple-900/10 border border-accent-purple/30">
            <div className="flex items-start justify-between mb-4">
              <div className="text-sm font-medium text-slate-400">库存周转率</div>
              <div className="p-2.5 rounded-xl bg-accent-purple/20 text-accent-purple">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="stat-value text-purple-200 mb-1">
              {reportData.turnoverRate.toFixed(2)}
            </div>
            <div className="text-sm text-slate-400">次/年</div>
            <div className="mt-3 pt-3 border-t border-surface-border">
              {turnoverYoYDisplay}
            </div>
          </div>
          <StatCard
            title="安全事件数"
            value={loading.detail ? '...' : reportData.totalEvents}
            subtitle="本周累计"
            icon={<AlertTriangle className="w-5 h-5" />}
            color="red"
          />
          <StatCard
            title="双锁执行率"
            value={loading.detail ? '...' : `${reportData.doubleLockRate}%`}
            subtitle="双人开锁验证"
            icon={<Shield className="w-5 h-5" />}
            color="green"
          />
          <StatCard
            title="及时处置率"
            value={loading.detail ? '...' : `${reportData.alertsTimelyRate}%`}
            subtitle={`${reportData.alertsResolvedInTime} 件按时处理`}
            icon={<CheckCircle2 className="w-5 h-5" />}
            color="gold"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-danger animate-pulse" />
              事件类型分布
            </h3>
            <RiskRoseChart
              data={
                Object.keys(reportData.eventsByType).length > 0
                  ? reportData.eventsByType
                  : { '暂无数据': 1 }
              }
              height={320}
            />
          </div>

          <div className="glass-card p-5">
            <BarChart
              data={reportData.doubleLockRanking}
              title="双锁执行率排名"
              height={360}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary-400" />
                采购优化建议
              </h3>
              <span className="text-xs text-slate-500">
                {reportData.recommendations.procurement.length} 条建议
              </span>
            </div>
            <div className="space-y-3">
              {reportData.recommendations.procurement.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-surface-light/50 border border-surface-border/50 hover:border-primary-600/30 transition-colors"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-600/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-300">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 leading-relaxed">{item}</p>
                  </div>
                  <Lightbulb className="w-4 h-4 text-accent-warning flex-shrink-0 mt-0.5" />
                </div>
              ))}
              {reportData.recommendations.procurement.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                  <CheckCircle2 className="w-10 h-10 mb-2 text-accent-safe opacity-50" />
                  <p className="text-sm">采购流程良好，暂无建议</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-accent-purple" />
                培训优化建议
              </h3>
              <span className="text-xs text-slate-500">
                {reportData.recommendations.training.length} 条建议
              </span>
            </div>
            <div className="space-y-3">
              {reportData.recommendations.training.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-surface-light/50 border border-surface-border/50 hover:border-accent-purple/30 transition-colors"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-purple/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-accent-purple">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 leading-relaxed">{item}</p>
                  </div>
                  <BookOpen className="w-4 h-4 text-accent-purple flex-shrink-0 mt-0.5" />
                </div>
              ))}
              {reportData.recommendations.training.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                  <CheckCircle2 className="w-10 h-10 mb-2 text-accent-safe opacity-50" />
                  <p className="text-sm">培训体系完善，暂无建议</p>
                </div>
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
            <FileText className="w-7 h-7 text-primary-400" />
            安全诊断报告
          </h1>
          <p className="text-slate-400 mt-1">查看和生成安全诊断分析报告</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchReports}
            disabled={loading.list}
            className={cn(
              'btn-outline flex items-center gap-2',
              loading.list && 'opacity-50 cursor-not-allowed',
            )}
          >
            <RefreshCw className={cn('w-4 h-4', loading.list && 'animate-spin')} />
            刷新
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={loading.generate}
            className={cn(
              'btn-primary flex items-center gap-2',
              loading.generate && 'opacity-50 cursor-not-allowed',
            )}
          >
            <Plus className={cn('w-4 h-4', loading.generate && 'animate-spin')} />
            {loading.generate ? '生成中...' : '生成报告'}
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-card border-accent-danger/50 bg-accent-danger/10 p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-accent-danger" />
          <span className="text-accent-danger">{error}</span>
        </div>
      )}

      {loading.list ? (
        <div className="glass-card h-[400px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">加载报告列表中...</p>
          </div>
        </div>
      ) : reports.length === 0 ? (
        <div className="glass-card h-[400px] flex flex-col items-center justify-center">
          <FileText className="w-16 h-16 text-slate-600 mb-4" />
          <p className="text-slate-400 mb-4">暂无诊断报告</p>
          <button onClick={handleGenerateReport} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            生成第一份报告
          </button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header w-12">#</th>
                  <th className="table-header">报告周期</th>
                  <th className="table-header">范围</th>
                  <th className="table-header">覆盖区域</th>
                  <th className="table-header">总库存量</th>
                  <th className="table-header">周转率</th>
                  <th className="table-header">事件数</th>
                  <th className="table-header">执行率</th>
                  <th className="table-header">生成时间</th>
                  <th className="table-header w-24 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report, index) => (
                  <tr
                    key={report.id}
                    className="hover:bg-surface-light/50 transition-colors group"
                  >
                    <td className="table-cell">
                      <span className="text-slate-500 font-mono text-xs">{index + 1}</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary-400" />
                        <span className="font-medium text-white">
                          {formatWeekRange(report.weekStart, report.weekEnd)}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={cn('badge border', scopeColors[report.scope])}>
                        {scopeLabels[report.scope]}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-300">{report.scopeName}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="font-mono text-slate-200">
                        {report.data?.totalInventory?.toLocaleString() || '-'}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">吨</span>
                    </td>
                    <td className="table-cell">
                      {report.data?.turnoverRate !== undefined ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-purple-300">
                            {report.data.turnoverRate.toFixed(2)}
                          </span>
                          {report.data.turnoverRateYoY !== undefined && (
                            <span
                              className={cn(
                                'text-xs font-mono',
                                report.data.turnoverRateYoY >= 0
                                  ? 'text-accent-safe'
                                  : 'text-accent-danger',
                              )}
                            >
                              {report.data.turnoverRateYoY >= 0 ? '+' : ''}
                              {report.data.turnoverRateYoY}%
                            </span>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="table-cell">
                      <span className="font-mono text-accent-danger">
                        {report.data?.totalEvents || '-'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-surface-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-accent-safe to-emerald-400 rounded-full"
                            style={{ width: `${report.data?.doubleLockRate || 0}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs text-slate-300">
                          {report.data?.doubleLockRate || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-mono text-xs">
                          {dayjs(report.generatedAt).format('YYYY-MM-DD HH:mm')}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell text-right">
                      <button
                        onClick={() => handleViewDetail(report)}
                        className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors"
                      >
                        查看
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary-600/20">
            <Zap className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{reports.length}</div>
            <div className="text-sm text-slate-400">累计报告数</div>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-accent-safe/20">
            <CheckCircle2 className="w-6 h-6 text-accent-safe" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {reports.filter((r) => r.data?.doubleLockRate && r.data.doubleLockRate >= 90).length}
            </div>
            <div className="text-sm text-slate-400">优秀报告 (≥90%)</div>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-accent-warning/20">
            <AlertTriangle className="w-6 h-6 text-accent-warning" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {reports.filter((r) => r.data?.doubleLockRate && r.data.doubleLockRate < 80).length}
            </div>
            <div className="text-sm text-slate-400">需关注报告 (&lt;80%)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
