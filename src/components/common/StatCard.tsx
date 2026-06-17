import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: number;
  trendLabel?: string;
  color?: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'gold' | 'gray';
  className?: string;
  onClick?: () => void;
}

const colorSchemes = {
  blue: {
    bg: 'from-primary-600/20 to-primary-800/10',
    border: 'border-primary-600/30',
    icon: 'bg-primary-600/20 text-primary-300',
    value: 'text-primary-200',
  },
  green: {
    bg: 'from-accent-safe/20 to-emerald-900/10',
    border: 'border-accent-safe/30',
    icon: 'bg-accent-safe/20 text-accent-safe',
    value: 'text-emerald-200',
  },
  red: {
    bg: 'from-accent-danger/20 to-red-900/10',
    border: 'border-accent-danger/30',
    icon: 'bg-accent-danger/20 text-accent-danger',
    value: 'text-red-200',
  },
  orange: {
    bg: 'from-accent-warning/20 to-orange-900/10',
    border: 'border-accent-warning/30',
    icon: 'bg-accent-warning/20 text-accent-warning',
    value: 'text-orange-200',
  },
  purple: {
    bg: 'from-accent-purple/20 to-purple-900/10',
    border: 'border-accent-purple/30',
    icon: 'bg-accent-purple/20 text-accent-purple',
    value: 'text-purple-200',
  },
  gold: {
    bg: 'from-accent-gold/20 to-amber-900/10',
    border: 'border-accent-gold/30',
    icon: 'bg-accent-gold/20 text-accent-gold',
    value: 'text-amber-200',
  },
  gray: {
    bg: 'from-slate-600/20 to-slate-800/10',
    border: 'border-slate-600/30',
    icon: 'bg-slate-600/20 text-slate-400',
    value: 'text-slate-300',
  },
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  color = 'blue',
  className,
  onClick,
}: StatCardProps) {
  const scheme = colorSchemes[color];

  return (
    <div
      className={cn(
        'glass-card-hover p-5 bg-gradient-to-br',
        scheme.bg,
        scheme.border,
        onClick ? 'cursor-pointer' : '',
        className,
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="text-sm font-medium text-slate-400">{title}</div>
        {icon && <div className={cn('p-2.5 rounded-xl', scheme.icon)}>{icon}</div>}
      </div>

      <div className={cn('stat-value mb-1', scheme.value)}>{value}</div>

      {subtitle && <div className="text-sm text-slate-400">{subtitle}</div>}

      {trend !== undefined && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-surface-border">
          {trend > 0 ? (
            <TrendingUp className="w-4 h-4 text-accent-danger" />
          ) : trend < 0 ? (
            <TrendingDown className="w-4 h-4 text-accent-safe" />
          ) : (
            <Minus className="w-4 h-4 text-slate-500" />
          )}
          <span
            className={cn(
              'text-sm font-medium',
              trend > 0
                ? 'text-accent-danger'
                : trend < 0
                  ? 'text-accent-safe'
                  : 'text-slate-500',
            )}
          >
            {trend > 0 ? '+' : ''}
            {trend}%
          </span>
          {trendLabel && <span className="text-xs text-slate-500">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}
