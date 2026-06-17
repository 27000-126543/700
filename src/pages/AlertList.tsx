import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowUpRight,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  CheckSquare,
  Square,
  AlertCircle,
  Loader2,
  RefreshCw,
  Layers,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import StatCard from '@/components/common/StatCard';
import { useAppStore } from '@/store/appStore';
import type { Alert, AlertLevel, AlertStatus, AlertType, PaginatedResponse, ApprovalFlow } from '@shared/types';
import dayjs from 'dayjs';

const levelOptions: { value: AlertLevel | 'all'; label: string }[] = [
  { value: 'all', label: '全部等级' },
  { value: 1, label: '1级预警' },
  { value: 2, label: '2级预警' },
];

const statusOptions: { value: AlertStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'resolved', label: '已解决' },
  { value: 'escalated', label: '已升级' },
];

const typeOptions: { value: AlertType | 'all'; label: string }[] = [
  { value: 'all', label: '全部类型' },
  { value: 'low_stock', label: '库存不足' },
  { value: 'leak', label: '泄漏检测' },
  { value: 'temperature', label: '温度异常' },
  { value: 'humidity', label: '湿度异常' },
];

const statusConfig: Record<AlertStatus, { label: string; color: string; bg: string }> = {
  pending: { label: '待处理', color: 'text-accent-warning', bg: 'bg-accent-warning/10 border-accent-warning/30' },
  processing: { label: '处理中', color: 'text-accent-gold', bg: 'bg-accent-gold/10 border-accent-gold/30' },
  resolved: { label: '已解决', color: 'text-accent-safe', bg: 'bg-accent-safe/10 border-accent-safe/30' },
  escalated: { label: '已升级', color: 'text-accent-danger', bg: 'bg-accent-danger/10 border-accent-danger/30' },
};

const typeConfig: Record<AlertType, { label: string; icon: typeof AlertTriangle }> = {
  low_stock: { label: '库存不足', icon: Layers },
  leak: { label: '泄漏检测', icon: AlertCircle },
  temperature: { label: '温度异常', icon: AlertTriangle },
  humidity: { label: '湿度异常', icon: AlertTriangle },
};

interface AlertDetail extends Alert {
  approvalFlow?: ApprovalFlow;
}

export default function AlertList() {
  const { setUnreadAlerts } = useAppStore();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState<AlertLevel | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<AlertStatus | 'all'>('all');
  const [selectedType, setSelectedType] = useState<AlertType | 'all'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailModal, setDetailModal] = useState<{ open: boolean; alert: AlertDetail | null }>({ open: false, alert: null });
  const [handleModal, setHandleModal] = useState<{ open: boolean; alert: Alert | null; isBatch: boolean }>({ open: false, alert: null, isBatch: false });
  const [handleNote, setHandleNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(dayjs());

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, pageSize };
      if (selectedLevel !== 'all') params.level = selectedLevel;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (selectedType !== 'all') params.type = selectedType;

      const data = await api.get<PaginatedResponse<Alert>>('/alerts', params);

      const filtered = searchKeyword
        ? data.items.filter(
            (item) =>
              item.title.includes(searchKeyword) ||
              item.labName.includes(searchKeyword) ||
              item.description.includes(searchKeyword),
          )
        : data.items;

      setAlerts(filtered);
      setTotal(data.total);
    } catch (err) {
      console.error('获取预警列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, selectedLevel, selectedStatus, selectedType, searchKeyword]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(dayjs());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const statistics = useMemo(() => {
    const stats = {
      pending: 0,
      processing: 0,
      resolved: 0,
      escalated: 0,
    };
    alerts.forEach((alert) => {
      stats[alert.status]++;
    });
    return stats;
  }, [alerts]);

  const calculateCountdown = (deadline: string) => {
    const deadlineTime = dayjs(deadline);
    const diff = deadlineTime.diff(now, 'minute');
    if (diff <= 0) return { text: '已超时', urgent: true, expired: true };
    if (diff <= 5) return { text: `${diff}分钟后升级`, urgent: true, expired: false };
    if (diff <= 10) return { text: `${diff}分钟后升级`, urgent: true, expired: false };
    return { text: `${diff}分钟后升级`, urgent: false, expired: false };
  };

  const handleViewDetail = async (alert: Alert) => {
    try {
      const data = await api.get<AlertDetail>(`/alerts/${alert.id}`);
      setDetailModal({ open: true, alert: data });
    } catch (err) {
      console.error('获取预警详情失败:', err);
    }
  };

  const handleOpenHandleModal = (alert: Alert, isBatch = false) => {
    setHandleModal({ open: true, alert, isBatch });
    setHandleNote('');
  };

  const handleSubmit = async () => {
    if (!handleNote.trim()) {
      alert('请填写处置备注');
      return;
    }

    setSubmitting(true);
    try {
      const targets = handleModal.isBatch ? Array.from(selectedIds) : [handleModal.alert?.id];

      for (const id of targets) {
        if (!id) continue;
        await api.post(`/alerts/${id}/resolve`, {
          operatorId: 'current-user',
          note: handleNote,
        });
      }

      setHandleModal({ open: false, alert: null, isBatch: false });
      setSelectedIds(new Set());
      setHandleNote('');
      fetchAlerts();
      
      try {
        const pendingData = await api.get<{ items: Alert[]; total: number }>('/alerts', {
          status: 'pending',
          pageSize: 1,
        });
        setUnreadAlerts(pendingData.total || 0);
      } catch (e) {
        console.error('刷新未读预警数失败:', e);
      }
    } catch (err) {
      console.error('处置失败:', err);
      alert('处置失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === alerts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(alerts.map((a) => a.id)));
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">预警管理</h1>
          <p className="text-sm text-slate-400 mt-1">管理和处置系统产生的安全预警</p>
        </div>
        <button
          onClick={fetchAlerts}
          className="btn-outline flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="待处理"
          value={statistics.pending}
          icon={<Clock className="w-5 h-5" />}
          color="orange"
          subtitle="需要及时处置的预警"
        />
        <StatCard
          title="处理中"
          value={statistics.processing}
          icon={<Loader2 className="w-5 h-5" />}
          color="gold"
          subtitle="正在处置的预警"
        />
        <StatCard
          title="已解决"
          value={statistics.resolved}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
          subtitle="已成功处置的预警"
        />
        <StatCard
          title="已升级"
          value={statistics.escalated}
          icon={<ArrowUpRight className="w-5 h-5" />}
          color="red"
          subtitle="已升级审批的预警"
        />
      </div>

      <div className="glass-card p-5">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索预警标题、实验室名称..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="input-field flex-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={selectedLevel}
              onChange={(e) => {
                setSelectedLevel(e.target.value as AlertLevel | 'all');
                setPage(1);
              }}
              className="input-field w-auto"
            >
              {levelOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as AlertStatus | 'all');
                setPage(1);
              }}
              className="input-field w-auto"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value as AlertType | 'all');
                setPage(1);
              }}
              className="input-field w-auto"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {selectedIds.size > 0 && (
            <button
              onClick={() => handleOpenHandleModal(alerts[0], true)}
              className="btn-primary flex items-center gap-2"
            >
              <CheckSquare className="w-4 h-4" />
              批量处置 ({selectedIds.size})
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header w-12">
                  <button onClick={handleSelectAll} className="text-slate-400 hover:text-white">
                    {selectedIds.size === alerts.length && alerts.length > 0 ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="table-header">预警等级</th>
                <th className="table-header">类型</th>
                <th className="table-header">标题</th>
                <th className="table-header">实验室</th>
                <th className="table-header">状态</th>
                <th className="table-header">创建时间</th>
                <th className="table-header">倒计时</th>
                <th className="table-header text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="table-cell text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-400" />
                    <p className="text-slate-400 mt-2">加载中...</p>
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="table-cell text-center py-12">
                    <AlertCircle className="w-12 h-12 mx-auto text-slate-500 mb-3" />
                    <p className="text-slate-400">暂无预警数据</p>
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => {
                  const countdown = calculateCountdown(alert.escalationDeadline);
                  const TypeIcon = typeConfig[alert.type].icon;
                  const statusCfg = statusConfig[alert.status];

                  return (
                    <tr
                      key={alert.id}
                      className={cn(
                        'transition-colors hover:bg-surface-light/50',
                        alert.status === 'pending' && countdown.urgent && 'bg-accent-danger/5',
                      )}
                    >
                      <td className="table-cell">
                        <button
                          onClick={() => handleSelect(alert.id)}
                          className="text-slate-400 hover:text-white"
                        >
                          {selectedIds.has(alert.id) ? (
                            <CheckSquare className="w-4 h-4 text-primary-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="table-cell">
                        <span
                          className={cn(
                            'badge border font-bold',
                            alert.level === 1
                              ? 'bg-accent-warning/10 border-accent-warning/30 text-accent-warning'
                              : 'bg-accent-danger/10 border-accent-danger/30 text-accent-danger animate-pulse-slow',
                          )}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {alert.level}级
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="inline-flex items-center gap-1.5 text-slate-300">
                          <TypeIcon className="w-4 h-4 text-primary-400" />
                          {typeConfig[alert.type].label}
                        </span>
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => handleViewDetail(alert)}
                          className="text-left hover:text-primary-300 transition-colors font-medium"
                        >
                          {alert.title}
                        </button>
                      </td>
                      <td className="table-cell text-slate-300">{alert.labName}</td>
                      <td className="table-cell">
                        <span className={cn('badge border', statusCfg.bg, statusCfg.color)}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="table-cell text-slate-400 font-mono text-xs">
                        {dayjs(alert.createdAt).format('YYYY-MM-DD HH:mm')}
                      </td>
                      <td className="table-cell">
                        {alert.status !== 'resolved' && (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 text-xs font-mono',
                              countdown.urgent ? 'text-accent-danger animate-pulse' : 'text-slate-400',
                            )}
                          >
                            <Clock className="w-3 h-3" />
                            {countdown.text}
                          </span>
                        )}
                        {alert.status === 'resolved' && (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetail(alert)}
                            className="p-1.5 text-slate-400 hover:text-primary-300 hover:bg-primary-500/10 rounded transition-colors"
                            title="查看详情"
                          >
                            <AlertCircle className="w-4 h-4" />
                          </button>
                          {alert.status !== 'resolved' && alert.status !== 'escalated' && (
                            <button
                              onClick={() => handleOpenHandleModal(alert)}
                              className="p-1.5 text-slate-400 hover:text-accent-safe hover:bg-accent-safe/10 rounded transition-colors"
                              title="处置"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
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
            共 <span className="text-white font-medium">{total}</span> 条记录，当前第{' '}
            <span className="text-white font-medium">{page}</span> 页
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-surface-border text-slate-400 hover:text-white hover:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    'w-9 h-9 rounded-lg text-sm font-medium transition-colors',
                    page === pageNum
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-surface-light',
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-surface-border text-slate-400 hover:text-white hover:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {detailModal.open && detailModal.alert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-surface-border">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'p-2.5 rounded-xl',
                    detailModal.alert.level === 1
                      ? 'bg-accent-warning/20 text-accent-warning'
                      : 'bg-accent-danger/20 text-accent-danger',
                  )}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{detailModal.alert.title}</h2>
                  <p className="text-sm text-slate-400">
                    {detailModal.alert.labName} · {dayjs(detailModal.alert.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModal({ open: false, alert: null })}
                className="p-2 text-slate-400 hover:text-white hover:bg-surface-light rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    'badge border font-bold',
                    detailModal.alert.level === 1
                      ? 'bg-accent-warning/10 border-accent-warning/30 text-accent-warning'
                      : 'bg-accent-danger/10 border-accent-danger/30 text-accent-danger',
                  )}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {detailModal.alert.level}级预警
                </span>
                <span
                  className={cn(
                    'badge border',
                    statusConfig[detailModal.alert.status].bg,
                    statusConfig[detailModal.alert.status].color,
                  )}
                >
                  {statusConfig[detailModal.alert.status].label}
                </span>
                <span className="badge border border-surface-border text-slate-300">
                  {typeConfig[detailModal.alert.type].label}
                </span>
                <span className="text-sm text-slate-400">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {calculateCountdown(detailModal.alert.escalationDeadline).text}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-light/50 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">所属单位</div>
                  <div className="text-white font-medium">{detailModal.alert.unitName}</div>
                </div>
                <div className="bg-surface-light/50 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">所在省份</div>
                  <div className="text-white font-medium">{detailModal.alert.province}</div>
                </div>
                {detailModal.alert.relatedChemicalName && (
                  <div className="bg-surface-light/50 rounded-lg p-4">
                    <div className="text-xs text-slate-400 mb-1">关联化学品</div>
                    <div className="text-white font-medium">{detailModal.alert.relatedChemicalName}</div>
                  </div>
                )}
                {detailModal.alert.relatedSensorId && (
                  <div className="bg-surface-light/50 rounded-lg p-4">
                    <div className="text-xs text-slate-400 mb-1">关联传感器</div>
                    <div className="text-white font-medium font-mono">{detailModal.alert.relatedSensorId}</div>
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm font-medium text-slate-300 mb-2">预警描述</div>
                <div className="bg-surface-light/50 rounded-lg p-4 text-slate-200">
                  {detailModal.alert.description}
                </div>
              </div>

              {detailModal.alert.resolutionNote && (
                <div>
                  <div className="text-sm font-medium text-slate-300 mb-2">处置备注</div>
                  <div className="bg-accent-safe/10 border border-accent-safe/30 rounded-lg p-4 text-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-accent-safe" />
                      <span className="text-sm text-accent-safe">
                        由 {detailModal.alert.resolvedBy || '系统'} 于 {dayjs(detailModal.alert.resolvedAt).format('YYYY-MM-DD HH:mm:ss')} 处置
                      </span>
                    </div>
                    {detailModal.alert.resolutionNote}
                  </div>
                </div>
              )}

              {detailModal.alert.approvalFlow && (
                <div>
                  <div className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary-400" />
                    审批流程状态
                  </div>
                  <div className="relative">
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-surface-border" />
                    <div className="space-y-4">
                      {detailModal.alert.approvalFlow.steps.map((step, index) => {
                        const isActive = step.status === 'pending' && index === detailModal.alert.approvalFlow!.currentStep - 1;
                        const isCompleted = step.status === 'approved';
                        const isRejected = step.status === 'rejected';

                        return (
                          <div key={step.step} className="relative flex gap-4">
                            <div
                              className={cn(
                                'relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2',
                                isCompleted
                                  ? 'bg-accent-safe border-accent-safe text-white'
                                  : isRejected
                                    ? 'bg-accent-danger border-accent-danger text-white'
                                    : isActive
                                      ? 'bg-primary-600 border-primary-400 text-white animate-pulse'
                                      : 'bg-surface-light border-surface-border text-slate-400',
                              )}
                            >
                              {isCompleted ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : isRejected ? (
                                <X className="w-5 h-5" />
                              ) : (
                                <span className="text-sm font-bold">{step.step}</span>
                              )}
                            </div>
                            <div className="flex-1 bg-surface-light/50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-white">{step.role}</span>
                                <span
                                  className={cn(
                                    'badge border text-xs',
                                    isCompleted
                                      ? 'bg-accent-safe/10 border-accent-safe/30 text-accent-safe'
                                      : isRejected
                                        ? 'bg-accent-danger/10 border-accent-danger/30 text-accent-danger'
                                        : isActive
                                          ? 'bg-primary-500/10 border-primary-500/30 text-primary-300'
                                          : 'bg-surface-border/50 border-surface-border text-slate-400',
                                  )}
                                >
                                  {isCompleted ? '已通过' : isRejected ? '已驳回' : isActive ? '待审批' : '待处理'}
                                </span>
                              </div>
                              {step.operatorName && (
                                <div className="text-sm text-slate-400 mb-1">
                                  处理人：{step.operatorName}
                                  {step.operatedAt && (
                                    <span className="ml-2 font-mono text-xs">
                                      {dayjs(step.operatedAt).format('YYYY-MM-DD HH:mm')}
                                    </span>
                                  )}
                                </div>
                              )}
                              {step.comment && (
                                <div className="text-sm text-slate-300 bg-surface/50 rounded p-2">
                                  {step.comment}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-surface-border">
              <button
                onClick={() => setDetailModal({ open: false, alert: null })}
                className="btn-outline"
              >
                关闭
              </button>
              {detailModal.alert.status !== 'resolved' && detailModal.alert.status !== 'escalated' && (
                <button
                  onClick={() => {
                    setDetailModal({ open: false, alert: null });
                    handleOpenHandleModal(detailModal.alert!);
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  立即处置
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {handleModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-surface-border">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-accent-safe" />
                {handleModal.isBatch ? '批量处置预警' : '处置预警'}
              </h2>
              <button
                onClick={() => setHandleModal({ open: false, alert: null, isBatch: false })}
                className="p-2 text-slate-400 hover:text-white hover:bg-surface-light rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {!handleModal.isBatch && handleModal.alert && (
                <div className="bg-surface-light/50 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">预警标题</div>
                  <div className="text-white font-medium">{handleModal.alert.title}</div>
                  <div className="text-sm text-slate-400 mt-2">{handleModal.alert.labName}</div>
                </div>
              )}

              {handleModal.isBatch && (
                <div className="bg-surface-light/50 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">已选择预警</div>
                  <div className="text-white font-medium">共 {selectedIds.size} 条预警</div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  处置备注 <span className="text-accent-danger">*</span>
                </label>
                <textarea
                  value={handleNote}
                  onChange={(e) => setHandleNote(e.target.value)}
                  placeholder="请详细描述处置措施和结果..."
                  rows={4}
                  className="input-field resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-surface-border">
              <button
                onClick={() => setHandleModal({ open: false, alert: null, isBatch: false })}
                className="btn-outline"
                disabled={submitting}
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="btn-primary flex items-center gap-2"
                disabled={submitting || !handleNote.trim()}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitting ? '提交中...' : '提交处置'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
