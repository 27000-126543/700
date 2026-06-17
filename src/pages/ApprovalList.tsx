import { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheck,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  X,
  Eye,
  ThumbsUp,
  ThumbsDown,
  FlaskConical,
  User,
  Building,
  Building2,
  AlertCircle,
  Package,
  Timer,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';
import RiskBadge from '@/components/common/RiskBadge';
import type { ApprovalFlow, ApprovalStatus, AdminLevel, ChemicalInventory } from '@shared/types';

const STEP_CONFIG = {
  1: { label: '实验员确认', icon: User, role: 'unit' as AdminLevel },
  2: { label: '单位负责人复核', icon: Building, role: 'unit' as AdminLevel },
  3: { label: '上级主管部门批准', icon: Building2, role: 'province' as AdminLevel },
};

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; color: string; bg: string }> = {
  pending: { label: '待审批', color: 'text-accent-gold', bg: 'bg-accent-gold/10 border-accent-gold/30' },
  approved: { label: '已通过', color: 'text-accent-safe', bg: 'bg-accent-safe/10 border-accent-safe/30' },
  rejected: { label: '已驳回', color: 'text-accent-danger', bg: 'bg-accent-danger/10 border-accent-danger/30' },
};

function formatTimeRemaining(deadline: string): { text: string; urgent: boolean } {
  const now = Date.now();
  const deadlineTime = new Date(deadline).getTime();
  const diff = deadlineTime - now;

  if (diff <= 0) return { text: '已超时', urgent: true };

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours < 1) return { text: `${minutes}分钟`, urgent: true };
  if (hours < 24) return { text: `${hours}小时${minutes}分钟`, urgent: hours < 6 };
  return { text: `${Math.floor(hours / 24)}天${hours % 24}小时`, urgent: false };
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ApprovalList() {
  const { user, getAdminLevel } = useAppStore();
  const [approvals, setApprovals] = useState<ApprovalFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalFlow | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>('all');
  const [stepFilter, setStepFilter] = useState<number | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [sealedChemicals, setSealedChemicals] = useState<ChemicalInventory[]>([]);
  const [chemicalsLoading, setChemicalsLoading] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const data = await api.get<ApprovalFlow[]>('/api/approvals');
      setApprovals(data);
    } catch (error) {
      console.error('获取审批列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSealedChemicals = async (chemicalIds: string[]) => {
    if (!chemicalIds.length) return;
    try {
      setChemicalsLoading(true);
      const data = await api.get<ChemicalInventory[]>('/api/chemicals', { ids: chemicalIds });
      setSealedChemicals(data);
    } catch (error) {
      console.error('获取封存化学品失败:', error);
    } finally {
      setChemicalsLoading(false);
    }
  };

  const filteredApprovals = useMemo(() => {
    return approvals.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (stepFilter !== 'all' && item.currentStep !== stepFilter) return false;
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        return (
          item.alertInfo.title.toLowerCase().includes(searchLower) ||
          item.alertInfo.labName.toLowerCase().includes(searchLower) ||
          item.alertInfo.unitName.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [approvals, statusFilter, stepFilter, searchText]);

  const canOperate = (approval: ApprovalFlow): boolean => {
    if (!user || approval.status !== 'pending') return false;
    const userLevel = getAdminLevel();
    const currentStepConfig = STEP_CONFIG[approval.currentStep];
    
    if (userLevel === 'national') return true;
    if (userLevel === 'province' && currentStepConfig.role === 'province') return true;
    if (userLevel === 'unit' && currentStepConfig.role === 'unit') return true;
    
    return false;
  };

  const handleViewDetail = async (approval: ApprovalFlow) => {
    setSelectedApproval(approval);
    setShowDetailModal(true);
    if (approval.sealedChemicalIds?.length) {
      await fetchSealedChemicals(approval.sealedChemicalIds);
    } else {
      setSealedChemicals([]);
    }
  };

  const handleApprove = async (approval: ApprovalFlow) => {
    try {
      setActionLoading(true);
      await api.put(`/api/approvals/${approval.id}/approve`, {
        action: 'approve',
        step: approval.currentStep,
      });
      await fetchApprovals();
      setShowDetailModal(false);
    } catch (error) {
      console.error('审批通过失败:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval || !rejectReason.trim()) return;
    try {
      setActionLoading(true);
      await api.put(`/api/approvals/${selectedApproval.id}/approve`, {
        action: 'reject',
        step: selectedApproval.currentStep,
        comment: rejectReason.trim(),
      });
      await fetchApprovals();
      setShowRejectModal(false);
      setShowDetailModal(false);
      setRejectReason('');
    } catch (error) {
      console.error('审批驳回失败:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (approval: ApprovalFlow) => {
    setSelectedApproval(approval);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const stats = useMemo(() => {
    return {
      total: approvals.length,
      pending: approvals.filter((a) => a.status === 'pending').length,
      approved: approvals.filter((a) => a.status === 'approved').length,
      rejected: approvals.filter((a) => a.status === 'rejected').length,
    };
  }, [approvals]);

  const isAllApproved = (approval: ApprovalFlow): boolean => {
    return approval.steps.every((s) => s.status === 'approved');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ClipboardCheck className="w-7 h-7 text-primary-400" />
            应急审批流程
          </h1>
          <p className="text-slate-400 mt-1">管理化学品应急封存的三级审批流程</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-600/20 flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-sm text-slate-400">全部审批</div>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent-gold/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-accent-gold" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.pending}</div>
              <div className="text-sm text-slate-400">待处理</div>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent-safe/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-accent-safe" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.approved}</div>
              <div className="text-sm text-slate-400">已通过</div>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent-danger/20 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-accent-danger" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.rejected}</div>
              <div className="text-sm text-slate-400">已驳回</div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索预警标题、实验室、单位名称..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ApprovalStatus | 'all')}
                className="input-field w-36"
              >
                <option value="all">全部状态</option>
                <option value="pending">待审批</option>
                <option value="approved">已通过</option>
                <option value="rejected">已驳回</option>
              </select>
            </div>
            <select
              value={stepFilter}
              onChange={(e) => setStepFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="input-field w-44"
            >
              <option value="all">全部步骤</option>
              <option value={1}>实验员确认</option>
              <option value={2}>单位负责人复核</option>
              <option value={3}>上级主管部门批准</option>
            </select>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
            加载中...
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-slate-500" />
            暂无审批数据
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">预警信息</th>
                  <th className="table-header">风险等级</th>
                  <th className="table-header">当前步骤</th>
                  <th className="table-header">状态</th>
                  <th className="table-header">剩余时间</th>
                  <th className="table-header">申请时间</th>
                  <th className="table-header">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredApprovals.map((approval) => {
                  const timeInfo = formatTimeRemaining(approval.alertInfo.escalationDeadline);
                  const allApproved = isAllApproved(approval);
                  return (
                    <tr key={approval.id} className="hover:bg-surface-light/30 transition-colors">
                      <td className="table-cell">
                        <div>
                          <div className="font-medium text-white flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-accent-warning" />
                            {approval.alertInfo.title}
                          </div>
                          <div className="text-sm text-slate-400 mt-1">
                            {approval.alertInfo.unitName} - {approval.alertInfo.labName}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <RiskBadge level={approval.alertInfo.level === 1 ? 'high' : 'critical'} />
                      </td>
                      <td className="table-cell">
                        {allApproved ? (
                          <span className="text-accent-safe font-medium flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            全部通过
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                              approval.status === 'pending' 
                                ? 'bg-primary-600 text-white' 
                                : approval.status === 'approved'
                                  ? 'bg-accent-safe/20 text-accent-safe'
                                  : 'bg-accent-danger/20 text-accent-danger'
                            )}>
                              {approval.currentStep}
                            </div>
                            <div>
                              <div className="text-slate-200">
                                {STEP_CONFIG[approval.currentStep].label}
                              </div>
                              <div className="text-xs text-slate-400">
                                共3级审批
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="table-cell">
                        {allApproved ? (
                          <span className="badge border bg-accent-safe/10 border-accent-safe/30 text-accent-safe">
                            <CheckCircle className="w-3 h-3" />
                            应急封存已启动
                          </span>
                        ) : (
                          <span className={cn('badge border', STATUS_CONFIG[approval.status].bg, STATUS_CONFIG[approval.status].color)}>
                            {STATUS_CONFIG[approval.status].label}
                          </span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className={cn(
                          'flex items-center gap-2',
                          timeInfo.urgent ? 'text-accent-danger' : 'text-slate-300'
                        )}>
                          <Timer className={cn('w-4 h-4', timeInfo.urgent && 'animate-pulse')} />
                          <span className={timeInfo.urgent ? 'font-medium' : ''}>
                            {timeInfo.text}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell text-slate-400">
                        {formatDateTime(approval.createdAt)}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetail(approval)}
                            className="btn-outline px-3 py-1.5 text-sm flex items-center gap-1.5"
                          >
                            <Eye className="w-4 h-4" />
                            详情
                          </button>
                          {canOperate(approval) && !allApproved && (
                            <>
                              <button
                                onClick={() => handleApprove(approval)}
                                disabled={actionLoading}
                                className="btn-primary px-3 py-1.5 text-sm flex items-center gap-1.5"
                              >
                                <ThumbsUp className="w-4 h-4" />
                                通过
                              </button>
                              <button
                                onClick={() => openRejectModal(approval)}
                                disabled={actionLoading}
                                className="btn-danger px-3 py-1.5 text-sm flex items-center gap-1.5"
                              >
                                <ThumbsDown className="w-4 h-4" />
                                驳回
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDetailModal && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-surface-border">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <ClipboardCheck className="w-6 h-6 text-primary-400" />
                审批详情
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 rounded-lg hover:bg-surface-light text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="glass-card p-5">
                <h3 className="section-title mb-4">
                  <AlertTriangle className="w-5 h-5 text-accent-warning" />
                  预警信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">预警标题</div>
                    <div className="text-white font-medium">{selectedApproval.alertInfo.title}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">风险等级</div>
                    <RiskBadge level={selectedApproval.alertInfo.level === 1 ? 'high' : 'critical'} />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">所属单位</div>
                    <div className="text-white">{selectedApproval.alertInfo.unitName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">实验室</div>
                    <div className="text-white">{selectedApproval.alertInfo.labName}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-slate-400 mb-1">预警描述</div>
                    <div className="text-slate-200 bg-surface-light/50 rounded-lg p-3">
                      {selectedApproval.alertInfo.description}
                    </div>
                  </div>
                  {selectedApproval.alertInfo.relatedChemicalName && (
                    <div>
                      <div className="text-sm text-slate-400 mb-1">涉及化学品</div>
                      <div className="text-white flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-accent-gold" />
                        {selectedApproval.alertInfo.relatedChemicalName}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-slate-400 mb-1">预警时间</div>
                    <div className="text-white">{formatDateTime(selectedApproval.alertInfo.createdAt)}</div>
                  </div>
                </div>
              </div>

              <div className="glass-card p-5">
                <h3 className="section-title mb-4">
                  <Clock className="w-5 h-5 text-primary-400" />
                  审批流程时间线
                </h3>
                <div className="relative">
                  {selectedApproval.steps.map((step, index) => {
                    const StepIcon = STEP_CONFIG[step.step].icon;
                    const isActive = selectedApproval.currentStep === step.step && selectedApproval.status === 'pending';
                    const isCompleted = step.status === 'approved';
                    const isRejected = step.status === 'rejected';
                    const allDone = isAllApproved(selectedApproval);

                    return (
                      <div key={step.step} className="relative pl-12 pb-6 last:pb-0">
                        {index < selectedApproval.steps.length - 1 && (
                          <div className={cn(
                            'absolute left-[19px] top-10 w-0.5 h-full',
                            isCompleted || allDone ? 'bg-accent-safe' : 'bg-surface-border'
                          )} />
                        )}
                        <div className={cn(
                          'absolute left-0 w-10 h-10 rounded-full flex items-center justify-center border-2',
                          isActive ? 'bg-primary-600 border-primary-400 animate-pulse' :
                          isCompleted ? 'bg-accent-safe/20 border-accent-safe' :
                          isRejected ? 'bg-accent-danger/20 border-accent-danger' :
                          'bg-surface-light border-surface-border'
                        )}>
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-accent-safe" />
                          ) : isRejected ? (
                            <XCircle className="w-5 h-5 text-accent-danger" />
                          ) : (
                            <StepIcon className={cn('w-5 h-5', isActive ? 'text-white' : 'text-slate-400')} />
                          )}
                        </div>
                        <div className={cn(
                          'glass-card p-4',
                          isActive && 'border-primary-500/50 shadow-glow'
                        )}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">
                                第{step.step}步: {STEP_CONFIG[step.step].label}
                              </span>
                              {isActive && (
                                <span className="badge bg-primary-600/20 text-primary-300 border border-primary-500/30">
                                  当前步骤
                                </span>
                              )}
                              {allDone && index === selectedApproval.steps.length - 1 && (
                                <span className="badge bg-accent-safe/20 text-accent-safe border border-accent-safe/30">
                                  应急封存已启动
                                </span>
                              )}
                            </div>
                            <span className={cn('badge border', STATUS_CONFIG[step.status].bg, STATUS_CONFIG[step.status].color)}>
                              {STATUS_CONFIG[step.status].label}
                            </span>
                          </div>
                          {step.operatorName && (
                            <div className="text-sm text-slate-400 mb-1">
                              操作人: {step.operatorName}
                            </div>
                          )}
                          {step.operatedAt && (
                            <div className="text-sm text-slate-400">
                              操作时间: {formatDateTime(step.operatedAt)}
                            </div>
                          )}
                          {step.comment && (
                            <div className="mt-2 p-3 bg-surface-light rounded-lg text-sm text-slate-300">
                              <div className="text-slate-400 mb-1">审批意见:</div>
                              {step.comment}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {sealedChemicals.length > 0 && (
                <div className="glass-card p-5">
                  <h3 className="section-title mb-4">
                    <Package className="w-5 h-5 text-accent-gold" />
                    化学品封存清单
                  </h3>
                  {chemicalsLoading ? (
                    <div className="text-center py-6 text-slate-400">
                      <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
                      加载中...
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th className="table-header">化学品名称</th>
                            <th className="table-header">CAS号</th>
                            <th className="table-header">类别</th>
                            <th className="table-header">风险等级</th>
                            <th className="table-header">封存数量</th>
                            <th className="table-header">单位</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sealedChemicals.map((chemical) => (
                            <tr key={chemical.id} className="hover:bg-surface-light/30">
                              <td className="table-cell">
                                <div className="flex items-center gap-2">
                                  <FlaskConical className="w-4 h-4 text-accent-gold" />
                                  {chemical.chemicalName}
                                </div>
                              </td>
                              <td className="table-cell font-mono text-sm">{chemical.casNo}</td>
                              <td className="table-cell">{chemical.category}</td>
                              <td className="table-cell">
                                <RiskBadge level={chemical.hazardLevel} size="sm" />
                              </td>
                              <td className="table-cell font-mono">{chemical.currentStock}</td>
                              <td className="table-cell">{chemical.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-surface-border flex items-center justify-between bg-surface-light/30">
              <div className="text-slate-400 text-sm">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                申请时间: {formatDateTime(selectedApproval.createdAt)}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="btn-outline"
                >
                  关闭
                </button>
                {canOperate(selectedApproval) && !isAllApproved(selectedApproval) && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedApproval)}
                      disabled={actionLoading}
                      className="btn-primary flex items-center gap-2"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      审批通过
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        openRejectModal(selectedApproval);
                      }}
                      disabled={actionLoading}
                      className="btn-danger flex items-center gap-2"
                    >
                      <ThumbsDown className="w-4 h-4" />
                      驳回申请
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-surface-border">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <ThumbsDown className="w-6 h-6 text-accent-danger" />
                驳回申请
              </h2>
              <button
                onClick={() => setShowRejectModal(false)}
                className="p-2 rounded-lg hover:bg-surface-light text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 p-4 bg-accent-danger/10 border border-accent-danger/30 rounded-lg">
                <div className="text-sm text-accent-danger font-medium mb-1">驳回对象</div>
                <div className="text-white">{selectedApproval.alertInfo.title}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  驳回原因 <span className="text-accent-danger">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="请填写驳回原因..."
                  rows={4}
                  className="input-field resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-surface-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="btn-outline"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="btn-danger flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <ThumbsDown className="w-4 h-4" />
                )}
                确认驳回
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
