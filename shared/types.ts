export type AdminLevel = 'national' | 'province' | 'unit';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type AlertLevel = 1 | 2;

export type AlertStatus = 'pending' | 'processing' | 'resolved' | 'escalated';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type SensorType = 'temperature' | 'humidity' | 'leak';

export type SensorStatus = 'normal' | 'warning' | 'alarm';

export type AlertType = 'low_stock' | 'leak' | 'temperature' | 'humidity';

export type ProcurementStatus = 'pending' | 'approved' | 'rejected' | 'has_issues';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Laboratory {
  id: string;
  name: string;
  unitId: string;
  unitName: string;
  province: string;
  provinceCode: string;
  city: string;
  address: string;
  manager: string;
  phone: string;
  sensorCount: number;
  onlineSensors: number;
  riskScore: number;
  riskLevel: RiskLevel;
  lastUpdate: string;
}

export interface ChemicalInventory {
  id: string;
  labId: string;
  labName: string;
  chemicalName: string;
  casNo: string;
  category: string;
  hazardLevel: RiskLevel;
  currentStock: number;
  unit: string;
  safeLevel: number;
  maxCapacity: number;
  turnoverRate: number;
  lastRestock: string;
  supplierId: string;
  supplierName: string;
}

export interface SensorData {
  id: string;
  labId: string;
  labName: string;
  type: SensorType;
  location: string;
  value: number;
  unit: string;
  threshold: number;
  status: SensorStatus;
  timestamp: string;
}

export interface UsageRecord {
  id: string;
  labId: string;
  labName: string;
  chemicalId: string;
  chemicalName: string;
  amount: number;
  unit: string;
  user: string;
  doubleLockVerified: boolean;
  lockOperator1?: string;
  lockOperator2?: string;
  purpose: string;
  timestamp: string;
}

export interface Alert {
  id: string;
  labId: string;
  labName: string;
  unitName: string;
  province: string;
  level: AlertLevel;
  type: AlertType;
  title: string;
  description: string;
  relatedChemicalId?: string;
  relatedChemicalName?: string;
  relatedSensorId?: string;
  status: AlertStatus;
  createdAt: string;
  escalatedAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
  escalationDeadline: string;
  minutesRemaining?: number;
}

export interface ApprovalStep {
  step: 1 | 2 | 3;
  role: string;
  operatorId?: string;
  operatorName?: string;
  status: ApprovalStatus;
  comment?: string;
  operatedAt?: string;
}

export interface ApprovalFlow {
  id: string;
  alertId: string;
  alertInfo: Alert;
  currentStep: 1 | 2 | 3;
  status: ApprovalStatus;
  steps: ApprovalStep[];
  createdAt: string;
  completedAt?: string;
  sealedChemicalIds?: string[];
}

export interface ProcurementIssue {
  itemId: string;
  type: 'supplier' | 'quota' | 'capacity';
  severity: 'error' | 'warning';
  message: string;
}

export interface ProcurementItem {
  id: string;
  chemicalName: string;
  casNo: string;
  quantity: number;
  unit: string;
  supplierName: string;
  supplierId: string;
  unitPrice: number;
  totalPrice: number;
  expectedDate: string;
  supplierQualified?: boolean;
  quotaCheck?: 'pass' | 'warn' | 'fail';
  capacityCheck?: 'pass' | 'warn' | 'fail';
}

export interface ProcurementPlan {
  id: string;
  unitId: string;
  unitName: string;
  year: number;
  items: ProcurementItem[];
  uploadedBy: string;
  uploadedAt: string;
  status: ProcurementStatus;
  issues: ProcurementIssue[];
}

export interface ReportData {
  totalInventory: number;
  inventoryYoY: number;
  turnoverRate: number;
  turnoverRateYoY: number;
  totalEvents: number;
  eventsByType: Record<string, number>;
  avgRiskScore: number;
  doubleLockRate: number;
  doubleLockRanking: { unitName: string; rate: number }[];
  alertsResolvedInTime: number;
  alertsTimelyRate: number;
  recommendations: {
    procurement: string[];
    training: string[];
  };
}

export interface SafetyReport {
  id: string;
  scope: AdminLevel;
  scopeId: string;
  scopeName: string;
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  data: ReportData;
}

export interface DashboardOverview {
  totalInventory: number;
  inventoryTrend: number;
  onlineLabs: number;
  totalLabs: number;
  activeAlerts: number;
  alertsTrend: number;
  avgRiskScore: number;
  riskTrend: number;
  doubleLockRate: number;
  doubleLockTrend: number;
}

export interface HeatmapData {
  provinceCode: string;
  province: string;
  value: number;
  riskLevel: RiskLevel;
  labCount: number;
  alertCount: number;
}

export interface RiskRankingItem {
  unitId: string;
  unitName: string;
  province: string;
  score: number;
  level: RiskLevel;
  trend: number;
  alertCount: number;
}

export interface TrendData {
  dates: string[];
  inventory: number[];
  events: number[];
  usage: number[];
  alerts: number[];
}

export interface EventTimelineItem {
  id: string;
  time: string;
  province: string;
  unitName: string;
  labName: string;
  type: AlertType;
  level: AlertLevel;
  title: string;
  status: AlertStatus;
}

export interface UserInfo {
  id: string;
  username: string;
  fullName: string;
  role: AdminLevel;
  roleName: string;
  unitId?: string;
  unitName?: string;
  province?: string;
  avatar?: string;
  permissions: string[];
}

export interface Province {
  code: string;
  name: string;
}

export interface UnitInfo {
  id: string;
  name: string;
  provinceCode: string;
  province: string;
  address: string;
  contact: string;
}
