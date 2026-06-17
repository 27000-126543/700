import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Building2,
  FlaskConical,
  BarChart3,
  PieChart,
  Clock,
  Lock,
  Unlock,
  X,
  Loader2,
  MapPin,
  Phone,
  User,
  Layers,
  Activity,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import StatCard from '@/components/common/StatCard';
import RiskBadge from '@/components/common/RiskBadge';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type {
  ChemicalInventory,
  UsageRecord,
  Laboratory,
  PaginatedResponse,
  RiskLevel,
} from '@shared/types';

interface TurnoverItem {
  labId: string;
  labName: string;
  unitName: string;
  rate: number;
  totalStock: number;
  ranking: number;
}

interface CategoryItem {
  category: string;
  count: number;
  total_stock: number;
  low_stock_count: number;
}

interface LabDetail extends Laboratory {
  inventory: ChemicalInventory[];
  sensors: Array<{
    id: string;
    labId: string;
    labName: string;
    type: string;
    location: string;
    value: number;
    unit: string;
    threshold: number;
    status: string;
  }>;
  records: UsageRecord[];
}

type StockStatus = 'normal' | 'low' | 'excess';

const getStockStatus = (item: ChemicalInventory): StockStatus => {
  if (item.currentStock < item.safeLevel) return 'low';
  if (item.currentStock > item.maxCapacity * 0.9) return 'excess';
  return 'normal';
};

const getStockStatusLabel = (status: StockStatus): string => {
  const labels: Record<StockStatus, string> = {
    normal: '正常',
    low: '不足',
    excess: '超额',
  };
  return labels[status];
};

const getStockStatusColor = (status: StockStatus): string => {
  const colors: Record<StockStatus, string> = {
    normal: 'text-accent-safe bg-accent-safe/10 border-accent-safe/30',
    low: 'text-accent-danger bg-accent-danger/10 border-accent-danger/30',
    excess: 'text-accent-warning bg-accent-warning/10 border-accent-warning/30',
  };
  return colors[status];
};

const categoryColors: Record<string, string> = {
  酸类: '#E63946',
  碱类: '#F76C5E',
  有机溶剂: '#F4A261',
  氧化剂: '#E9C46A',
  还原剂: '#3CAEA3',
  盐类: '#2A9D8F',
  气体: '#264653',
  其他: '#6C757D',
};

const categoryOptions = [
  { value: 'all', label: '全部分类' },
  { value: '酸类', label: '酸类' },
  { value: '碱类', label: '碱类' },
  { value: '有机溶剂', label: '有机溶剂' },
  { value: '氧化剂', label: '氧化剂' },
  { value: '还原剂', label: '还原剂' },
  { value: '盐类', label: '盐类' },
  { value: '气体', label: '气体' },
  { value: '其他', label: '其他' },
];

export default function Inventory() {
  const [loading, setLoading] = useState({
    inventory: true,
    turnover: true,
    categories: true,
    usageRecords: true,
    labs: true,
  });

  const [inventory, setInventory] = useState<ChemicalInventory[]>([]);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedLab, setSelectedLab] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  const [turnoverData, setTurnoverData] = useState<TurnoverItem[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryItem[]>([]);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsPageSize] = useState(10);

  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [labsTotal, setLabsTotal] = useState(0);
  const [labsPage, setLabsPage] = useState(1);
  const [labsPageSize] = useState(8);

  const [labDetailModal, setLabDetailModal] = useState<{
    open: boolean;
    lab: LabDetail | null;
    loading: boolean;
  }>({ open: false, lab: null, loading: false });

  const fetchInventory = useCallback(async () => {
    setLoading((prev) => ({ ...prev, inventory: true }));
    try {
      const params: Record<string, unknown> = { page, pageSize };
      if (selectedLab !== 'all') params.labId = selectedLab;
      if (selectedCategory !== 'all') params.category = selectedCategory;

      const data = await api.get<PaginatedResponse<ChemicalInventory>>('/inventory', params);

      const filtered = searchKeyword
        ? data.items.filter(
            (item) =>
              item.chemicalName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
              item.casNo.includes(searchKeyword),
          )
        : data.items;

      setInventory(filtered);
      setInventoryTotal(data.total);
    } catch (err) {
      console.error('获取库存列表失败:', err);
    } finally {
      setLoading((prev) => ({ ...prev, inventory: false }));
    }
  }, [page, pageSize, selectedLab, selectedCategory, searchKeyword]);

  const fetchTurnover = useCallback(async () => {
    setLoading((prev) => ({ ...prev, turnover: true }));
    try {
      const data = await api.get<TurnoverItem[]>('/inventory/turnover');
      setTurnoverData(data.slice(0, 10));
    } catch (err) {
      console.error('获取周转率数据失败:', err);
    } finally {
      setLoading((prev) => ({ ...prev, turnover: false }));
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    setLoading((prev) => ({ ...prev, categories: true }));
    try {
      const data = await api.get<CategoryItem[]>('/inventory/categories');
      setCategoryData(data);
    } catch (err) {
      console.error('获取分类统计失败:', err);
    } finally {
      setLoading((prev) => ({ ...prev, categories: false }));
    }
  }, []);

  const fetchUsageRecords = useCallback(async () => {
    setLoading((prev) => ({ ...prev, usageRecords: true }));
    try {
      const params: Record<string, unknown> = { page: recordsPage, pageSize: recordsPageSize };
      if (selectedLab !== 'all') params.labId = selectedLab;

      const data = await api.get<PaginatedResponse<UsageRecord>>('/inventory/usage-records', params);
      setUsageRecords(data.items);
      setRecordsTotal(data.total);
    } catch (err) {
      console.error('获取使用记录失败:', err);
    } finally {
      setLoading((prev) => ({ ...prev, usageRecords: false }));
    }
  }, [recordsPage, recordsPageSize, selectedLab]);

  const fetchLabs = useCallback(async () => {
    setLoading((prev) => ({ ...prev, labs: true }));
    try {
      const params: Record<string, unknown> = { page: labsPage, pageSize: labsPageSize };
      const data = await api.get<PaginatedResponse<Laboratory>>('/inventory/labs', params);
      setLabs(data.items);
      setLabsTotal(data.total);
    } catch (err) {
      console.error('获取实验室列表失败:', err);
    } finally {
      setLoading((prev) => ({ ...prev, labs: false }));
    }
  }, [labsPage, labsPageSize]);

  const fetchLabDetail = async (labId: string) => {
    setLabDetailModal((prev) => ({ ...prev, loading: true }));
    try {
      const data = await api.get<LabDetail>(`/inventory/labs/${labId}`);
      setLabDetailModal({ open: true, lab: data, loading: false });
    } catch (err) {
      console.error('获取实验室详情失败:', err);
      setLabDetailModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const refreshAll = useCallback(() => {
    fetchInventory();
    fetchTurnover();
    fetchCategories();
    fetchUsageRecords();
    fetchLabs();
  }, [fetchInventory, fetchTurnover, fetchCategories, fetchUsageRecords, fetchLabs]);

  useEffect(() => {
    fetchInventory();
    fetchTurnover();
    fetchCategories();
    fetchUsageRecords();
    fetchLabs();
  }, [fetchInventory, fetchTurnover, fetchCategories, fetchUsageRecords, fetchLabs]);

  const uniqueLabs = useMemo(() => {
    const labSet = new Map<string, string>();
    inventory.forEach((item) => {
      labSet.set(item.labId, item.labName);
    });
    return Array.from(labSet.entries()).map(([id, name]) => ({ id, name }));
  }, [inventory]);

  const statistics = useMemo(() => {
    let lowStockCount = 0;
    let excessStockCount = 0;
    let totalValue = 0;

    inventory.forEach((item) => {
      const status = getStockStatus(item);
      if (status === 'low') lowStockCount++;
      if (status === 'excess') excessStockCount++;
      totalValue += item.currentStock;
    });

    return {
      total: inventoryTotal,
      lowStock: lowStockCount,
      excessStock: excessStockCount,
      totalValue: Math.round(totalValue * 100) / 100,
      categories: categoryData.length,
      doubleLockRate: usageRecords.length > 0
        ? Math.round((usageRecords.filter((r) => r.doubleLockVerified).length / usageRecords.length) * 100)
        : 0,
    };
  }, [inventory, inventoryTotal, categoryData, usageRecords]);

  const pieChartOption = useMemo<EChartsOption>(() => {
    const data = categoryData.map((item) => ({
      value: item.total_stock,
      name: item.category,
      itemStyle: {
        color: categoryColors[item.category] || '#6C757D',
        shadowBlur: 15,
        shadowColor: (categoryColors[item.category] || '#6C757D') + '60',
      },
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(26, 37, 64, 0.95)',
        borderColor: 'rgba(42, 58, 92, 0.8)',
        borderWidth: 1,
        textStyle: {
          color: '#e2e8f0',
          fontSize: 13,
        },
        formatter: (params: any) => {
          const total = data.reduce((sum, d) => sum + d.value, 0);
          const percent = total > 0 ? ((params.value / total) * 100).toFixed(1) : '0';
          const category = categoryData.find((c) => c.category === params.name);
          return `
            <div style="padding: 8px;">
              <div style="font-weight: 600; margin-bottom: 6px; font-size: 14px;">${params.name}</div>
              <div style="display: flex; justify-content: space-between; gap: 24px;">
                <span style="color: #94a3b8;">库存量</span>
                <span style="font-weight: 600; font-family: monospace;">${params.value.toFixed(1)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 24px; margin-top: 4px;">
                <span style="color: #94a3b8;">品种数</span>
                <span style="font-weight: 600; font-family: monospace;">${category?.count || 0}</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 24px; margin-top: 4px;">
                <span style="color: #94a3b8;">占比</span>
                <span style="font-weight: 600; font-family: monospace; color: ${params.color};">${percent}%</span>
              </div>
              ${category && category.low_stock_count > 0 ? `
                <div style="display: flex; justify-content: space-between; gap: 24px; margin-top: 4px;">
                  <span style="color: #94a3b8;">库存不足</span>
                  <span style="font-weight: 600; font-family: monospace; color: #E63946;">${category.low_stock_count} 种</span>
                </div>
              ` : ''}
            </div>
          `;
        },
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 12,
        textStyle: {
          color: '#94a3b8',
          fontSize: 12,
        },
        formatter: (name: string) => {
          const item = categoryData.find((c) => c.category === name);
          const total = data.reduce((sum, d) => sum + d.value, 0);
          const percent = total > 0 ? (((item?.total_stock || 0) / total) * 100).toFixed(1) : '0';
          return `${name}  ${percent}%`;
        },
      },
      series: [
        {
          name: '分类统计',
          type: 'pie',
          radius: ['45%', '75%'],
          center: ['35%', '50%'],
          itemStyle: {
            borderRadius: 8,
            borderColor: '#0B1221',
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 25,
              shadowOffsetX: 0,
              shadowColor: 'rgba(39, 93, 204, 0.5)',
            },
            scale: true,
            scaleSize: 10,
          },
          data,
          animationType: 'scale',
          animationDuration: 1000,
          animationEasing: 'cubicOut',
        },
      ],
    };
  }, [categoryData]);

  const totalInventoryPages = Math.ceil(inventoryTotal / pageSize);
  const totalRecordsPages = Math.ceil(recordsTotal / recordsPageSize);
  const totalLabsPages = Math.ceil(labsTotal / labsPageSize);

  const getHazardColor = (level: RiskLevel): string => {
    const colors: Record<RiskLevel, string> = {
      low: 'text-accent-safe bg-accent-safe/10 border-accent-safe/30',
      medium: 'text-accent-warning bg-accent-warning/10 border-accent-warning/30',
      high: 'text-accent-gold bg-accent-gold/10 border-accent-gold/30',
      critical: 'text-accent-danger bg-accent-danger/10 border-accent-danger/30',
    };
    return colors[level];
  };

  const getHazardLabel = (level: RiskLevel): string => {
    const labels: Record<RiskLevel, string> = {
      low: '低危',
      medium: '中危',
      high: '高危',
      critical: '极危',
    };
    return labels[level];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Package className="w-7 h-7 text-primary-400" />
            库存管理
          </h1>
          <p className="text-slate-400 mt-1">化学品库存监控、流转追踪与使用台账</p>
        </div>
        <button
          onClick={refreshAll}
          className="btn-outline flex items-center gap-2"
        >
          <RefreshCw className={cn('w-4 h-4', Object.values(loading).some(Boolean) && 'animate-spin')} />
          刷新数据
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="库存总量"
          value={loading.inventory ? '...' : statistics.total}
          subtitle="化学品品种数"
          icon={<Layers className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="库存不足"
          value={loading.inventory ? '...' : statistics.lowStock}
          subtitle="低于安全水位"
          icon={<AlertTriangle className="w-5 h-5" />}
          color="red"
          trend={statistics.lowStock > 0 ? statistics.lowStock : undefined}
          trendLabel="需关注"
        />
        <StatCard
          title="双锁验证率"
          value={loading.usageRecords ? '...' : `${statistics.doubleLockRate}%`}
          subtitle="使用记录合规率"
          icon={<Lock className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="化学品分类"
          value={loading.categories ? '...' : statistics.categories}
          subtitle="不同类别"
          icon={<FlaskConical className="w-5 h-5" />}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary-400" />
              化学品库存列表
            </h3>
            <span className="text-xs text-slate-500">共 {inventoryTotal} 条记录</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜索化学品名称、CAS号..."
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setPage(1);
                }}
                className="input-field flex-1"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedLab}
                onChange={(e) => {
                  setSelectedLab(e.target.value);
                  setPage(1);
                }}
                className="input-field w-auto"
              >
                <option value="all">全部实验室</option>
                {uniqueLabs.map((lab) => (
                  <option key={lab.id} value={lab.id}>
                    {lab.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="input-field w-auto"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">化学品</th>
                  <th className="table-header">CAS号</th>
                  <th className="table-header">分类</th>
                  <th className="table-header">实验室</th>
                  <th className="table-header">当前库存</th>
                  <th className="table-header">安全水位</th>
                  <th className="table-header">状态</th>
                  <th className="table-header">危化等级</th>
                </tr>
              </thead>
              <tbody>
                {loading.inventory ? (
                  <tr>
                    <td colSpan={8} className="table-cell text-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-400" />
                      <p className="text-slate-400 mt-2">加载中...</p>
                    </td>
                  </tr>
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="table-cell text-center py-12">
                      <Package className="w-12 h-12 mx-auto text-slate-500 mb-3" />
                      <p className="text-slate-400">暂无库存数据</p>
                    </td>
                  </tr>
                ) : (
                  inventory.map((item) => {
                    const status = getStockStatus(item);
                    const stockPercent = Math.min(100, (item.currentStock / item.maxCapacity) * 100);

                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          'transition-colors hover:bg-surface-light/50',
                          status === 'low' && 'bg-accent-danger/5',
                        )}
                      >
                        <td className="table-cell">
                          <div className="font-medium text-white">{item.chemicalName}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            供应商: {item.supplierName}
                          </div>
                        </td>
                        <td className="table-cell font-mono text-xs text-slate-400">
                          {item.casNo}
                        </td>
                        <td className="table-cell">
                          <span className="badge border border-surface-border text-slate-300">
                            {item.category}
                          </span>
                        </td>
                        <td className="table-cell text-slate-300">{item.labName}</td>
                        <td className={cn('table-cell font-mono font-semibold', status === 'low' && 'text-accent-danger')}>
                          {item.currentStock.toFixed(2)} {item.unit}
                          <div className="mt-1 w-20 h-1.5 bg-surface-border rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                status === 'low'
                                  ? 'bg-accent-danger'
                                  : status === 'excess'
                                    ? 'bg-accent-warning'
                                    : 'bg-accent-safe',
                              )}
                              style={{ width: `${stockPercent}%` }}
                            />
                          </div>
                        </td>
                        <td className="table-cell font-mono text-xs text-slate-400">
                          {item.safeLevel.toFixed(2)} {item.unit}
                        </td>
                        <td className="table-cell">
                          <span className={cn('badge border', getStockStatusColor(status))}>
                            {status === 'low' && <AlertTriangle className="w-3 h-3" />}
                            {getStockStatusLabel(status)}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className={cn('badge border', getHazardColor(item.hazardLevel))}>
                            {getHazardLabel(item.hazardLevel)}
                          </span>
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
              共 <span className="text-white font-medium">{inventoryTotal}</span> 条，当前第{' '}
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
              {Array.from({ length: Math.min(5, totalInventoryPages) }, (_, i) => {
                let pageNum;
                if (totalInventoryPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalInventoryPages - 2) {
                  pageNum = totalInventoryPages - 4 + i;
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
                onClick={() => setPage((p) => Math.min(totalInventoryPages, p + 1))}
                disabled={page >= totalInventoryPages}
                className="p-2 rounded-lg border border-surface-border text-slate-400 hover:text-white hover:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent-safe" />
              周转率排名
            </h3>
            <span className="text-xs text-slate-500">TOP {turnoverData.length}</span>
          </div>

          {loading.turnover ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
              {turnoverData.map((item) => (
                <div
                  key={item.labId}
                  className="flex items-center gap-3 p-3 rounded-lg bg-surface-light/50 border border-transparent hover:border-primary-600/30 transition-all cursor-pointer"
                  onClick={() => fetchLabDetail(item.labId)}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                      item.ranking === 1
                        ? 'bg-gradient-to-br from-accent-gold to-amber-600 text-white'
                        : item.ranking === 2
                          ? 'bg-gradient-to-br from-slate-400 to-slate-500 text-white'
                          : item.ranking === 3
                            ? 'bg-gradient-to-br from-amber-700 to-amber-800 text-white'
                            : 'bg-surface-card text-slate-400',
                    )}
                  >
                    {item.ranking}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{item.labName}</div>
                    <div className="text-xs text-slate-500 truncate">{item.unitName}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-accent-safe">
                      {item.rate.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.totalStock} 库存
                    </div>
                  </div>
                </div>
              ))}

              {turnoverData.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                  <TrendingUp className="w-12 h-12 mb-2 opacity-30" />
                  <p className="text-sm">暂无周转率数据</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-accent-purple" />
              分类统计
            </h3>
          </div>
          {loading.categories ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
            </div>
          ) : (
            <ReactECharts
              option={pieChartOption}
              style={{ height: 300, width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          )}
        </div>

        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-400" />
              使用台账记录
            </h3>
            <span className="text-xs text-slate-500">共 {recordsTotal} 条记录</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">时间</th>
                  <th className="table-header">化学品</th>
                  <th className="table-header">实验室</th>
                  <th className="table-header">使用量</th>
                  <th className="table-header">使用人</th>
                  <th className="table-header">用途</th>
                  <th className="table-header">双锁验证</th>
                </tr>
              </thead>
              <tbody>
                {loading.usageRecords ? (
                  <tr>
                    <td colSpan={7} className="table-cell text-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-400" />
                      <p className="text-slate-400 mt-2">加载中...</p>
                    </td>
                  </tr>
                ) : usageRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="table-cell text-center py-12">
                      <Clock className="w-12 h-12 mx-auto text-slate-500 mb-3" />
                      <p className="text-slate-400">暂无使用记录</p>
                    </td>
                  </tr>
                ) : (
                  usageRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="transition-colors hover:bg-surface-light/50"
                    >
                      <td className="table-cell font-mono text-xs text-slate-400">
                        {dayjs(record.timestamp).format('YYYY-MM-DD HH:mm')}
                      </td>
                      <td className="table-cell font-medium text-white">
                        {record.chemicalName}
                      </td>
                      <td className="table-cell text-slate-300">{record.labName}</td>
                      <td className="table-cell font-mono text-slate-200">
                        {record.amount.toFixed(2)} {record.unit}
                      </td>
                      <td className="table-cell text-slate-300">{record.user}</td>
                      <td className="table-cell text-slate-400 text-sm">{record.purpose}</td>
                      <td className="table-cell">
                        {record.doubleLockVerified ? (
                          <span className="badge border text-accent-safe bg-accent-safe/10 border-accent-safe/30">
                            <Lock className="w-3 h-3" />
                            已验证
                          </span>
                        ) : (
                          <span className="badge border text-accent-danger bg-accent-danger/10 border-accent-danger/30">
                            <Unlock className="w-3 h-3" />
                            未验证
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-surface-border">
            <div className="text-sm text-slate-400">
              共 <span className="text-white font-medium">{recordsTotal}</span> 条
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRecordsPage((p) => Math.max(1, p - 1))}
                disabled={recordsPage <= 1}
                className="p-2 rounded-lg border border-surface-border text-slate-400 hover:text-white hover:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-400">
                第 <span className="text-white">{recordsPage}</span> / {totalRecordsPages} 页
              </span>
              <button
                onClick={() => setRecordsPage((p) => Math.min(totalRecordsPages, p + 1))}
                disabled={recordsPage >= totalRecordsPages}
                className="p-2 rounded-lg border border-surface-border text-slate-400 hover:text-white hover:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary-400" />
            实验室列表
          </h3>
          <span className="text-xs text-slate-500">共 {labsTotal} 个实验室</span>
        </div>

        {loading.labs ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {labs.map((lab) => (
                <div
                  key={lab.id}
                  onClick={() => fetchLabDetail(lab.id)}
                  className="glass-card-hover p-4 cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary-600/20">
                        <Building2 className="w-4 h-4 text-primary-400" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-medium text-white truncate group-hover:text-primary-300 transition-colors">
                          {lab.name}
                        </h4>
                        <p className="text-xs text-slate-500 truncate">{lab.unitName}</p>
                      </div>
                    </div>
                    <RiskBadge level={lab.riskLevel} size="sm" showIcon={false} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{lab.province}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <User className="w-3 h-3" />
                      <span>{lab.manager}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Phone className="w-3 h-3" />
                      <span className="font-mono">{lab.phone}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div className="text-sm font-mono font-bold text-white">
                          {lab.onlineSensors}/{lab.sensorCount}
                        </div>
                        <div className="text-xs text-slate-500">传感器</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-mono font-bold text-white">
                          {lab.riskScore}
                        </div>
                        <div className="text-xs text-slate-500">风险分</div>
                      </div>
                    </div>
                    <Activity className="w-4 h-4 text-slate-600 group-hover:text-primary-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 pt-4 mt-4 border-t border-surface-border">
              <button
                onClick={() => setLabsPage((p) => Math.max(1, p - 1))}
                disabled={labsPage <= 1}
                className="p-2 rounded-lg border border-surface-border text-slate-400 hover:text-white hover:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-400">
                第 <span className="text-white">{labsPage}</span> / {totalLabsPages} 页
              </span>
              <button
                onClick={() => setLabsPage((p) => Math.min(totalLabsPages, p + 1))}
                disabled={labsPage >= totalLabsPages}
                className="p-2 rounded-lg border border-surface-border text-slate-400 hover:text-white hover:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {labDetailModal.open && labDetailModal.lab && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-surface-border">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary-600/20">
                  <Building2 className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{labDetailModal.lab.name}</h2>
                  <p className="text-sm text-slate-400">
                    {labDetailModal.lab.unitName} · {labDetailModal.lab.province}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLabDetailModal({ open: false, lab: null, loading: false })}
                className="p-2 text-slate-400 hover:text-white hover:bg-surface-light rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="风险评分"
                  value={labDetailModal.lab.riskScore}
                  icon={<Activity className="w-5 h-5" />}
                  color={
                    labDetailModal.lab.riskLevel === 'critical'
                      ? 'red'
                      : labDetailModal.lab.riskLevel === 'high'
                        ? 'orange'
                        : labDetailModal.lab.riskLevel === 'medium'
                          ? 'gold'
                          : 'green'
                  }
                />
                <StatCard
                  title="在线传感器"
                  value={`${labDetailModal.lab.onlineSensors}/${labDetailModal.lab.sensorCount}`}
                  subtitle="设备在线状态"
                  icon={<BarChart3 className="w-5 h-5" />}
                  color="blue"
                />
                <StatCard
                  title="库存品种"
                  value={labDetailModal.lab.inventory.length}
                  subtitle="化学品总数"
                  icon={<FlaskConical className="w-5 h-5" />}
                  color="purple"
                />
                <StatCard
                  title="使用记录"
                  value={labDetailModal.lab.records.length}
                  subtitle="近30天"
                  icon={<Clock className="w-5 h-5" />}
                  color="green"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-light/50 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">负责人</div>
                  <div className="text-white font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-primary-400" />
                    {labDetailModal.lab.manager}
                  </div>
                </div>
                <div className="bg-surface-light/50 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">联系电话</div>
                  <div className="text-white font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary-400" />
                    {labDetailModal.lab.phone}
                  </div>
                </div>
                <div className="bg-surface-light/50 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">地址</div>
                  <div className="text-white font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary-400" />
                    {labDetailModal.lab.address || `${labDetailModal.lab.province} ${labDetailModal.lab.city}`}
                  </div>
                </div>
                <div className="bg-surface-light/50 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">风险等级</div>
                  <div className="flex items-center gap-2">
                    <RiskBadge level={labDetailModal.lab.riskLevel} size="md" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary-400" />
                  库存化学品 ({labDetailModal.lab.inventory.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">化学品</th>
                        <th className="table-header">CAS号</th>
                        <th className="table-header">分类</th>
                        <th className="table-header">库存</th>
                        <th className="table-header">状态</th>
                        <th className="table-header">危化等级</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labDetailModal.lab.inventory.slice(0, 8).map((item) => {
                        const status = getStockStatus(item);
                        return (
                          <tr key={item.id} className={cn(status === 'low' && 'bg-accent-danger/5')}>
                            <td className="table-cell font-medium text-white">{item.chemicalName}</td>
                            <td className="table-cell font-mono text-xs text-slate-400">{item.casNo}</td>
                            <td className="table-cell">
                              <span className="badge border border-surface-border text-slate-300 text-xs">
                                {item.category}
                              </span>
                            </td>
                            <td className={cn('table-cell font-mono', status === 'low' && 'text-accent-danger')}>
                              {item.currentStock.toFixed(2)} {item.unit}
                            </td>
                            <td className="table-cell">
                              <span className={cn('badge border text-xs', getStockStatusColor(status))}>
                                {getStockStatusLabel(status)}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className={cn('badge border text-xs', getHazardColor(item.hazardLevel))}>
                                {getHazardLabel(item.hazardLevel)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary-400" />
                  最近使用记录 ({labDetailModal.lab.records.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">时间</th>
                        <th className="table-header">化学品</th>
                        <th className="table-header">使用量</th>
                        <th className="table-header">使用人</th>
                        <th className="table-header">双锁验证</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labDetailModal.lab.records.slice(0, 8).map((record) => (
                        <tr key={record.id}>
                          <td className="table-cell font-mono text-xs text-slate-400">
                            {dayjs(record.timestamp).format('YYYY-MM-DD HH:mm')}
                          </td>
                          <td className="table-cell font-medium text-white">{record.chemicalName}</td>
                          <td className="table-cell font-mono text-slate-200">
                            {record.amount.toFixed(2)} {record.unit}
                          </td>
                          <td className="table-cell text-slate-300">{record.user}</td>
                          <td className="table-cell">
                            {record.doubleLockVerified ? (
                              <span className="badge border text-xs text-accent-safe bg-accent-safe/10 border-accent-safe/30">
                                <CheckCircle className="w-3 h-3" />
                                已验证
                              </span>
                            ) : (
                              <span className="badge border text-xs text-accent-danger bg-accent-danger/10 border-accent-danger/30">
                                <XCircle className="w-3 h-3" />
                                未验证
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-surface-border">
              <button
                onClick={() => setLabDetailModal({ open: false, lab: null, loading: false })}
                className="btn-outline"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
