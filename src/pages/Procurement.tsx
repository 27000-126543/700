import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ShoppingCart,
  Upload,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertCircle,
  FileSpreadsheet,
  Calendar,
  Clock,
  RefreshCw,
  Eye,
  ChevronRight,
  X,
  FlaskConical,
  TrendingUp,
  Package,
  Building2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import type { ProcurementPlan, ProcurementItem, ProcurementIssue, ProcurementStatus } from '@shared/types';

const STATUS_CONFIG: Record<ProcurementStatus, { label: string; color: string; bg: string }> = {
  pending: { label: '待审核', color: 'text-accent-gold', bg: 'bg-accent-gold/10 border-accent-gold/30' },
  approved: { label: '已通过', color: 'text-accent-safe', bg: 'bg-accent-safe/10 border-accent-safe/30' },
  rejected: { label: '已驳回', color: 'text-accent-danger', bg: 'bg-accent-danger/10 border-accent-danger/30' },
  has_issues: { label: '存在问题', color: 'text-accent-warning', bg: 'bg-accent-warning/10 border-accent-warning/30' },
};

const CHECK_CONFIG = {
  pass: { icon: CheckCircle, color: 'text-accent-safe', label: '通过' },
  warn: { icon: AlertTriangle, color: 'text-accent-warning', label: '警告' },
  fail: { icon: XCircle, color: 'text-accent-danger', label: '不通过' },
};

export default function Procurement() {
  const [plans, setPlans] = useState<ProcurementPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ProcurementPlan | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadResult, setUploadResult] = useState<ProcurementPlan | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [issueFilter, setIssueFilter] = useState<'all' | 'error' | 'warning'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const data = await api.get<ProcurementPlan[]>('/procurement');
      setPlans(data);
    } catch (error) {
      console.error('获取采购计划列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validExtensions = ['.xlsx', '.xls'];
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(extension)) {
      alert('请上传Excel文件（.xlsx或.xls格式）');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过10MB');
      return;
    }
    
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    try {
      setUploading(true);
      const result = await api.upload<ProcurementPlan>('/procurement/upload', selectedFile);
      setUploadResult(result);
      await fetchPlans();
    } catch (error) {
      console.error('上传失败:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await api.download('/procurement/template', '采购计划模板.xlsx');
    } catch (error) {
      console.error('下载模板失败:', error);
    }
  };

  const handleViewDetail = (plan: ProcurementPlan) => {
    setSelectedPlan(plan);
    setShowDetailModal(true);
    setIssueFilter('all');
  };

  const handleUploadClick = () => {
    setShowUploadModal(true);
    setSelectedFile(null);
    setUploadResult(null);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadResult(null);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const errorCount = useMemo(() => {
    if (!selectedPlan) return 0;
    return selectedPlan.issues.filter((i) => i.severity === 'error').length;
  }, [selectedPlan]);

  const warningCount = useMemo(() => {
    if (!selectedPlan) return 0;
    return selectedPlan.issues.filter((i) => i.severity === 'warning').length;
  }, [selectedPlan]);

  const uploadErrorCount = useMemo(() => {
    if (!uploadResult) return 0;
    return uploadResult.issues.filter((i) => i.severity === 'error').length;
  }, [uploadResult]);

  const uploadWarningCount = useMemo(() => {
    if (!uploadResult) return 0;
    return uploadResult.issues.filter((i) => i.severity === 'warning').length;
  }, [uploadResult]);

  const filteredIssues = useMemo(() => {
    if (!selectedPlan) return [];
    if (issueFilter === 'all') return selectedPlan.issues;
    return selectedPlan.issues.filter((i) => i.severity === issueFilter);
  }, [selectedPlan, issueFilter]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getIssueTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      supplier: '供应商资质',
      quota: '配额检查',
      capacity: '容量检查',
    };
    return labels[type] || type;
  };

  const totalAmount = useMemo(() => {
    if (!selectedPlan) return 0;
    return selectedPlan.items.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [selectedPlan]);

  const uploadTotalAmount = useMemo(() => {
    if (!uploadResult) return 0;
    return uploadResult.items.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [uploadResult]);

  const renderCheckResult = (item: ProcurementItem) => {
    const isOverCapacity = item.capacityCheck === 'fail';

    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          {item.supplierQualified !== undefined ? (
            item.supplierQualified ? (
              <CheckCircle className="w-4 h-4 text-accent-safe" />
            ) : (
              <XCircle className="w-4 h-4 text-accent-danger" />
            )
          ) : (
            <span className="text-slate-500">-</span>
          )}
          <span className="text-xs text-slate-400">供应商</span>
        </div>
        <div className="flex items-center gap-1.5">
          {item.quotaCheck ? (
            <>
              {(() => {
                const Config = CHECK_CONFIG[item.quotaCheck];
                return <Config.icon className={cn('w-4 h-4', Config.color)} />;
              })()}
              <span className="text-xs text-slate-400">配额</span>
            </>
          ) : (
            <span className="text-slate-500">-</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {item.capacityCheck ? (
            <>
              {(() => {
                const Config = CHECK_CONFIG[item.capacityCheck];
                return (
                  <Config.icon
                    className={cn(
                      'w-4 h-4',
                      isOverCapacity ? 'text-accent-danger animate-pulse' : Config.color,
                    )}
                  />
                );
              })()}
              <span
                className={cn(
                  'text-xs',
                  isOverCapacity ? 'text-accent-danger font-medium' : 'text-slate-400',
                )}
              >
                容量
              </span>
            </>
          ) : (
            <span className="text-slate-500">-</span>
          )}
        </div>
      </div>
    );
  };

  const renderItemsTable = (items: ProcurementItem[], showCapacityWarning = false) => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="table-header">化学品名称</th>
            <th className="table-header">CAS号</th>
            <th className="table-header">供应商</th>
            <th className="table-header">采购量</th>
            <th className="table-header">单价</th>
            <th className="table-header">总价</th>
            <th className="table-header">预计到货</th>
            <th className="table-header">校验结果</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isOverCapacity = item.capacityCheck === 'fail';
            return (
              <tr
                key={item.id}
                className={cn(
                  'transition-colors',
                  isOverCapacity && showCapacityWarning
                    ? 'bg-accent-danger/10 hover:bg-accent-danger/15'
                    : 'hover:bg-surface-light/30',
                )}
              >
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <FlaskConical
                      className={cn(
                        'w-4 h-4',
                        isOverCapacity && showCapacityWarning
                          ? 'text-accent-danger'
                          : 'text-accent-gold',
                      )}
                    />
                    <span
                      className={cn(
                        'font-medium',
                        isOverCapacity && showCapacityWarning ? 'text-accent-danger' : 'text-white',
                      )}
                    >
                      {item.chemicalName}
                    </span>
                    {isOverCapacity && showCapacityWarning && (
                      <span className="badge bg-accent-danger/20 text-accent-danger border border-accent-danger/30 text-xs animate-pulse">
                        超容20%+
                      </span>
                    )}
                  </div>
                </td>
                <td className="table-cell font-mono text-sm text-slate-400">{item.casNo}</td>
                <td className="table-cell">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>{item.supplierName}</span>
                  </div>
                </td>
                <td className="table-cell font-mono">
                  {item.quantity.toLocaleString()} {item.unit}
                </td>
                <td className="table-cell font-mono">¥{item.unitPrice.toLocaleString()}</td>
                <td
                  className={cn(
                    'table-cell font-mono font-semibold',
                    isOverCapacity && showCapacityWarning ? 'text-accent-danger' : 'text-primary-300',
                  )}
                >
                  ¥{item.totalPrice.toLocaleString()}
                </td>
                <td className="table-cell text-slate-400">
                  {dayjs(item.expectedDate).format('YYYY-MM-DD')}
                </td>
                <td className="table-cell">{renderCheckResult(item)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderIssuesList = (issues: ProcurementIssue[], title: string) => {
    if (issues.length === 0) return null;

    const errors = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity === 'warning');

    return (
      <div className="space-y-4">
        <h3 className="section-title">
          <AlertCircle className="w-5 h-5 text-accent-warning" />
          {title}
        </h3>

        {errors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-accent-danger" />
              <span className="text-sm font-medium text-accent-danger">错误 ({errors.length})</span>
            </div>
            <div className="space-y-1.5">
              {errors.map((issue, idx) => (
                <div
                  key={`error-${idx}`}
                  className="flex items-start gap-3 p-3 rounded-lg bg-accent-danger/10 border border-accent-danger/30"
                >
                  <XCircle className="w-4 h-4 text-accent-danger flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-accent-danger/20 text-accent-danger">
                        {getIssueTypeLabel(issue.type)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200">{issue.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-accent-warning" />
              <span className="text-sm font-medium text-accent-warning">
                警告 ({warnings.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {warnings.map((issue, idx) => (
                <div
                  key={`warning-${idx}`}
                  className="flex items-start gap-3 p-3 rounded-lg bg-accent-warning/10 border border-accent-warning/30"
                >
                  <AlertTriangle className="w-4 h-4 text-accent-warning flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-accent-warning/20 text-accent-warning">
                        {getIssueTypeLabel(issue.type)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200">{issue.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {issues.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-accent-safe opacity-50" />
            <p className="text-sm">校验通过，无问题</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShoppingCart className="w-7 h-7 text-primary-400" />
            采购计划管理
          </h1>
          <p className="text-slate-400 mt-1">管理危化品采购计划，上传Excel并自动校验</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleDownloadTemplate} className="btn-outline flex items-center gap-2">
            <Download className="w-4 h-4" />
            下载模板
          </button>
          <button onClick={handleUploadClick} className="btn-primary flex items-center gap-2">
            <Upload className="w-4 h-4" />
            上传采购计划
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-600/20 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{plans.length}</div>
              <div className="text-sm text-slate-400">计划总数</div>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent-safe/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-accent-safe" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {plans.filter((p) => p.status === 'approved').length}
              </div>
              <div className="text-sm text-slate-400">已通过</div>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent-warning/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-accent-warning" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {plans.filter((p) => p.status === 'has_issues' || p.status === 'pending').length}
              </div>
              <div className="text-sm text-slate-400">待处理</div>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent-danger/20 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-accent-danger" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {plans.filter((p) => p.status === 'rejected').length}
              </div>
              <div className="text-sm text-slate-400">已驳回</div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-400" />
            采购计划列表
          </h3>
          <button
            onClick={fetchPlans}
            disabled={loading}
            className={cn(
              'btn-outline px-3 py-1.5 text-sm flex items-center gap-1.5',
              loading && 'opacity-50 cursor-not-allowed',
            )}
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            刷新
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
            加载中...
          </div>
        ) : plans.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-500" />
            暂无采购计划
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">年份</th>
                  <th className="table-header">所属单位</th>
                  <th className="table-header">状态</th>
                  <th className="table-header">问题数量</th>
                  <th className="table-header">上传人</th>
                  <th className="table-header">上传时间</th>
                  <th className="table-header">操作</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr
                    key={plan.id}
                    className="hover:bg-surface-light/30 transition-colors cursor-pointer"
                    onClick={() => handleViewDetail(plan)}
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary-400" />
                        <span className="font-semibold text-white text-lg">{plan.year}年</span>
                        <span className="text-xs text-slate-500">
                          {plan.items.length} 种化学品
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        <span>{plan.unitName}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span
                        className={cn(
                          'badge border',
                          STATUS_CONFIG[plan.status].bg,
                          STATUS_CONFIG[plan.status].color,
                        )}
                      >
                        {STATUS_CONFIG[plan.status].label}
                      </span>
                    </td>
                    <td className="table-cell">
                      {plan.issues.length > 0 ? (
                        <div className="flex items-center gap-2">
                          {plan.issues.some((i) => i.severity === 'error') && (
                            <span className="flex items-center gap-1 text-accent-danger">
                              <XCircle className="w-3.5 h-3.5" />
                              {plan.issues.filter((i) => i.severity === 'error').length}
                            </span>
                          )}
                          {plan.issues.some((i) => i.severity === 'warning') && (
                            <span className="flex items-center gap-1 text-accent-warning">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {plan.issues.filter((i) => i.severity === 'warning').length}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-accent-safe flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          无问题
                        </span>
                      )}
                    </td>
                    <td className="table-cell text-slate-300">{plan.uploadedBy}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        {dayjs(plan.uploadedAt).format('YYYY-MM-DD HH:mm')}
                      </div>
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetail(plan);
                        }}
                        className="btn-outline px-3 py-1.5 text-sm flex items-center gap-1.5"
                      >
                        <Eye className="w-4 h-4" />
                        详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-surface-border">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <Upload className="w-6 h-6 text-primary-400" />
                {uploadResult ? '校验结果' : '上传采购计划'}
              </h2>
              <button
                onClick={closeUploadModal}
                className="p-2 rounded-lg hover:bg-surface-light text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!uploadResult ? (
                <>
                  <div
                    className={cn(
                      'relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 cursor-pointer',
                      dragActive
                        ? 'border-primary-400 bg-primary-600/20'
                        : selectedFile
                          ? 'border-primary-500/50 bg-surface-light/50'
                          : 'border-surface-border hover:border-primary-500/50 hover:bg-surface-light/30',
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={triggerFileInput}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {selectedFile ? (
                      <div className="space-y-3">
                        <div className="w-20 h-20 mx-auto rounded-2xl bg-primary-600/20 flex items-center justify-center">
                          <FileSpreadsheet className="w-10 h-10 text-primary-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-lg">{selectedFile.name}</p>
                          <p className="text-sm text-slate-400 mt-1">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                        <p className="text-xs text-primary-400">点击重新选择文件</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-20 h-20 mx-auto rounded-2xl bg-surface-light flex items-center justify-center">
                          <Upload className="w-10 h-10 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-lg">
                            拖拽Excel文件到此处，或点击选择
                          </p>
                          <p className="text-sm text-slate-400 mt-1">
                            支持 .xlsx 格式，最大 10MB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="glass-card p-5">
                    <h3 className="section-title mb-4">
                      <Download className="w-5 h-5 text-primary-400" />
                      模板下载
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                      请先下载模板，按照模板格式填写采购计划后再上传。
                    </p>
                    <button
                      onClick={handleDownloadTemplate}
                      className="btn-outline flex items-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      下载Excel模板
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="glass-card p-5">
                    <h3 className="section-title mb-4">
                      <CheckCircle className="w-5 h-5 text-primary-400" />
                      校验概览
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-surface-light/50 border border-surface-border">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-primary-600/20 flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary-400" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-white">
                              {uploadResult.items.length}
                            </div>
                            <div className="text-xs text-slate-400">采购条目</div>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-surface-light/50 border border-surface-border">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-accent-danger/20 flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-accent-danger" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-white">
                              {uploadErrorCount}
                            </div>
                            <div className="text-xs text-slate-400">错误</div>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-surface-light/50 border border-surface-border">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-accent-warning/20 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-accent-warning" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-white">
                              {uploadWarningCount}
                            </div>
                            <div className="text-xs text-slate-400">警告</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-4 rounded-xl bg-surface-light/30 border border-surface-border">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">采购总金额</span>
                        <span className="text-2xl font-bold text-primary-300 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" />
                          ¥{uploadTotalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {renderIssuesList(uploadResult.issues, '校验问题列表')}

                  <div className="glass-card p-5">
                    <h3 className="section-title mb-4">
                      <FileSpreadsheet className="w-5 h-5 text-accent-gold" />
                      采购明细
                    </h3>
                    {renderItemsTable(uploadResult.items, true)}
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-surface-border flex items-center justify-between bg-surface-light/30">
              {!uploadResult ? (
                <>
                  <div className="text-sm text-slate-400">
                    {selectedFile ? (
                      <span className="text-accent-safe">已选择文件: {selectedFile.name}</span>
                    ) : (
                      '请选择或拖拽Excel文件'
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={closeUploadModal} className="btn-outline">
                      取消
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={!selectedFile || uploading}
                      className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          上传中...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          开始校验
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-end gap-3 w-full">
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setUploadResult(null);
                    }}
                    className="btn-outline flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    继续上传
                  </button>
                  <button onClick={closeUploadModal} className="btn-primary">
                    完成
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-surface-border">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <ShoppingCart className="w-6 h-6 text-primary-400" />
                  {selectedPlan.year}年采购计划详情
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {selectedPlan.unitName} · {selectedPlan.items.length} 种化学品
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 rounded-lg hover:bg-surface-light text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-surface-light/50 border border-surface-border">
                  <div className="text-xs text-slate-400 mb-1">状态</div>
                  <span
                    className={cn(
                      'badge border',
                      STATUS_CONFIG[selectedPlan.status].bg,
                      STATUS_CONFIG[selectedPlan.status].color,
                    )}
                  >
                    {STATUS_CONFIG[selectedPlan.status].label}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-surface-light/50 border border-surface-border">
                  <div className="text-xs text-slate-400 mb-1">采购条目</div>
                  <div className="text-xl font-bold text-white">
                    {selectedPlan.items.length} 项
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-surface-light/50 border border-surface-border">
                  <div className="text-xs text-slate-400 mb-1">问题数量</div>
                  <div className="text-xl font-bold flex items-center gap-2">
                    {errorCount > 0 && (
                      <span className="text-accent-danger">{errorCount} 错误</span>
                    )}
                    {warningCount > 0 && (
                      <span className="text-accent-warning">{warningCount} 警告</span>
                    )}
                    {errorCount === 0 && warningCount === 0 && (
                      <span className="text-accent-safe">无问题</span>
                    )}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-surface-light/50 border border-surface-border">
                  <div className="text-xs text-slate-400 mb-1">采购总金额</div>
                  <div className="text-xl font-bold text-primary-300">
                    ¥{totalAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-title mb-0">
                    <AlertCircle className="w-5 h-5 text-accent-warning" />
                    校验问题列表
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIssueFilter('all')}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-lg transition-colors',
                        issueFilter === 'all'
                          ? 'bg-primary-600 text-white'
                          : 'bg-surface-light text-slate-400 hover:text-white',
                      )}
                    >
                      全部 ({selectedPlan.issues.length})
                    </button>
                    <button
                      onClick={() => setIssueFilter('error')}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-lg transition-colors',
                        issueFilter === 'error'
                          ? 'bg-accent-danger text-white'
                          : 'bg-surface-light text-slate-400 hover:text-white',
                      )}
                    >
                      <XCircle className="w-3.5 h-3.5 inline mr-1" />
                      错误 ({errorCount})
                    </button>
                    <button
                      onClick={() => setIssueFilter('warning')}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-lg transition-colors',
                        issueFilter === 'warning'
                          ? 'bg-accent-warning text-white'
                          : 'bg-surface-light text-slate-400 hover:text-white',
                      )}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                      警告 ({warningCount})
                    </button>
                  </div>
                </div>

                {filteredIssues.length > 0 ? (
                  <div className="space-y-2">
                    {filteredIssues.map((issue, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'flex items-start gap-3 p-4 rounded-lg border',
                          issue.severity === 'error'
                            ? 'bg-accent-danger/10 border-accent-danger/30'
                            : 'bg-accent-warning/10 border-accent-warning/30',
                        )}
                      >
                        {issue.severity === 'error' ? (
                          <XCircle className="w-5 h-5 text-accent-danger flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-accent-warning flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className={cn(
                                'text-xs px-2 py-0.5 rounded',
                                issue.severity === 'error'
                                  ? 'bg-accent-danger/20 text-accent-danger'
                                  : 'bg-accent-warning/20 text-accent-warning',
                              )}
                            >
                              {getIssueTypeLabel(issue.type)}
                            </span>
                            <span
                              className={cn(
                                'text-xs px-2 py-0.5 rounded',
                                issue.severity === 'error'
                                  ? 'bg-accent-danger/30 text-accent-danger'
                                  : 'bg-accent-warning/30 text-accent-warning',
                              )}
                            >
                              {issue.severity === 'error' ? '错误' : '警告'}
                            </span>
                            {issue.itemId && (
                              <span className="text-xs text-slate-400 font-mono">
                                条目ID: {issue.itemId}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-200">{issue.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-accent-safe opacity-50" />
                    <p className="text-sm">
                      {issueFilter === 'all'
                        ? '校验通过，无问题'
                        : issueFilter === 'error'
                          ? '无错误问题'
                          : '无警告问题'}
                    </p>
                  </div>
                )}
              </div>

              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-title mb-0">
                    <FileSpreadsheet className="w-5 h-5 text-accent-gold" />
                    采购明细
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-accent-safe" />
                      <span>通过</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-accent-warning" />
                      <span>警告</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-accent-danger" />
                      <span>不通过</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-accent-danger animate-pulse" />
                      <span>超容20%+</span>
                    </div>
                  </div>
                </div>
                {renderItemsTable(selectedPlan.items, true)}
              </div>

              <div className="glass-card p-5">
                <h3 className="section-title mb-4">
                  <Clock className="w-5 h-5 text-primary-400" />
                  基本信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">所属单位</div>
                    <div className="text-white">{selectedPlan.unitName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">上传人</div>
                    <div className="text-white">{selectedPlan.uploadedBy}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">上传时间</div>
                    <div className="text-white">
                      {dayjs(selectedPlan.uploadedAt).format('YYYY-MM-DD HH:mm:ss')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-surface-border flex items-center justify-between bg-surface-light/30">
              <div className="text-sm text-slate-400">
                计划ID: <span className="font-mono">{selectedPlan.id}</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowDetailModal(false)} className="btn-outline">
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
