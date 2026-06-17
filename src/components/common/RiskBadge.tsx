import { AlertTriangle, Shield, AlertCircle, Flame } from 'lucide-react';
import type { RiskLevel } from '@shared/types';
import { cn } from '@/lib/utils';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

const levelConfig: Record<
  RiskLevel,
  { label: string; color: string; icon: typeof Shield; bg: string }
> = {
  low: {
    label: '低风险',
    color: 'text-accent-safe',
    icon: Shield,
    bg: 'bg-accent-safe/10 border-accent-safe/30',
  },
  medium: {
    label: '中风险',
    color: 'text-accent-gold',
    icon: AlertCircle,
    bg: 'bg-accent-gold/10 border-accent-gold/30',
  },
  high: {
    label: '高风险',
    color: 'text-accent-warning',
    icon: AlertTriangle,
    bg: 'bg-accent-warning/10 border-accent-warning/30',
  },
  critical: {
    label: '极高风险',
    color: 'text-accent-danger',
    icon: Flame,
    bg: 'bg-accent-danger/10 border-accent-danger/30',
  },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
  lg: 'px-3 py-1.5 text-sm gap-2',
};

export default function RiskBadge({
  level,
  score,
  showIcon = true,
  size = 'md',
  pulse = false,
}: RiskBadgeProps) {
  const config = levelConfig[level];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'badge border',
        config.bg,
        config.color,
        sizeClasses[size],
        pulse ? 'animate-pulse-slow' : '',
      )}
    >
      {showIcon && <Icon className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />}
      {config.label}
      {score !== undefined && (
        <span className="font-mono font-bold">{score.toFixed(1)}</span>
      )}
    </span>
  );
}
