import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import type { RiskLevel } from '@shared/types';
import { cn } from '@/lib/utils';

interface GaugeChartProps {
  value: number;
  className?: string;
  showLabel?: boolean;
  size?: number;
}

interface LevelConfig {
  level: RiskLevel;
  label: string;
  color: string;
}

const getRiskLevel = (value: number): LevelConfig => {
  if (value < 30) {
    return { level: 'low', label: '低风险', color: '#3CAEA3' };
  } else if (value < 60) {
    return { level: 'medium', label: '中风险', color: '#F4A261' };
  } else if (value < 85) {
    return { level: 'high', label: '高风险', color: '#F76C5E' };
  } else {
    return { level: 'critical', label: '极高风险', color: '#E63946' };
  }
};

export default function GaugeChart({
  value,
  className,
  showLabel = true,
  size = 220,
}: GaugeChartProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const levelConfig = getRiskLevel(clampedValue);

  const option = useMemo(() => {
    return {
      series: [
        {
          type: 'gauge',
          startAngle: 210,
          endAngle: -30,
          center: ['50%', '60%'],
          radius: '85%',
          min: 0,
          max: 100,
          splitNumber: 10,
          axisLine: {
            lineStyle: {
              width: 16,
              color: [
                [0.3, 'rgba(60, 174, 163, 0.15)'],
                [0.6, 'rgba(244, 162, 97, 0.15)'],
                [0.85, 'rgba(247, 108, 94, 0.15)'],
                [1, 'rgba(230, 57, 70, 0.15)'],
              ],
            },
          },
          pointer: {
            itemStyle: {
              color: levelConfig.color,
              shadowColor: levelConfig.color,
              shadowBlur: 15,
            },
            width: 4,
            length: '65%',
          },
          axisTick: {
            distance: -28,
            length: 8,
            lineStyle: {
              color: 'rgba(255, 255, 255, 0.3)',
              width: 1,
            },
          },
          splitLine: {
            distance: -32,
            length: 14,
            lineStyle: {
              color: 'rgba(255, 255, 255, 0.5)',
              width: 2,
            },
          },
          axisLabel: {
            distance: -45,
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
          },
          anchor: {
            show: true,
            size: 16,
            itemStyle: {
              color: levelConfig.color,
              borderColor: 'rgba(255, 255, 255, 0.2)',
              borderWidth: 3,
              shadowColor: levelConfig.color,
              shadowBlur: 20,
            },
          },
          title: {
            show: false,
          },
          detail: {
            valueAnimation: true,
            fontSize: 36,
            fontWeight: 'bold',
            color: levelConfig.color,
            offsetCenter: [0, '-5%'],
            fontFamily: 'JetBrains Mono, monospace',
            formatter: `{value}\n`,
          },
          progress: {
            show: true,
            width: 16,
            itemStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [
                  { offset: 0, color: levelConfig.color },
                  { offset: 1, color: levelConfig.color + 'CC' },
                ],
              },
              shadowColor: levelConfig.color,
              shadowBlur: 12,
            },
          },
          data: [
            {
              value: clampedValue,
            },
          ],
        },
      ],
      animationDuration: 2000,
      animationEasing: 'cubicOut',
    };
  }, [clampedValue, levelConfig.color]);

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${levelConfig.color}08 0%, transparent 60%)`,
            filter: 'blur(20px)',
          }}
        />
      </div>
      <ReactECharts
        option={option}
        style={{ width: size, height: size }}
        opts={{ renderer: 'svg' }}
      />
      {showLabel && (
        <div className="absolute bottom-4 flex flex-col items-center">
          <span
            className="text-lg font-bold"
            style={{ color: levelConfig.color }}
          >
            {clampedValue.toFixed(1)}
          </span>
          <span
            className="text-xs font-medium text-slate-400 mt-0.5"
          >
            {levelConfig.label}
          </span>
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
          style={{ backgroundColor: levelConfig.color, opacity: 0.6 }}
        />
        <div
          className="absolute top-6 left-6 w-1.5 h-1.5 rounded-full animate-pulse-slow"
          style={{ backgroundColor: levelConfig.color }}
        />
        <div
          className="absolute top-6 right-6 w-1.5 h-1.5 rounded-full animate-pulse-slow"
          style={{ backgroundColor: levelConfig.color, animationDelay: '1s' }}
        />
      </div>
    </div>
  );
}
