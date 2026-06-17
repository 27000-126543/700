import { useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { RiskLevel } from '@shared/types';

interface RiskRoseChartProps {
  data: Record<string, number>;
  riskLevel?: RiskLevel;
  onItemClick?: (type: string, value: number) => void;
  height?: number | string;
  className?: string;
}

const riskColors: Record<RiskLevel, string> = {
  low: '#3CAEA3',
  medium: '#F4A261',
  high: '#F76C5E',
  critical: '#E63946',
};

const getTypeRiskLevel = (type: string): RiskLevel => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('泄漏') || lowerType.includes('leak') || lowerType.includes('爆炸') || lowerType.includes('火灾')) {
    return 'critical';
  }
  if (lowerType.includes('超温') || lowerType.includes('温度') || lowerType.includes('temperature')) {
    return 'high';
  }
  if (lowerType.includes('超湿') || lowerType.includes('湿度') || lowerType.includes('humidity')) {
    return 'medium';
  }
  if (lowerType.includes('库存') || lowerType.includes('stock') || lowerType.includes('不足')) {
    return 'low';
  }
  return 'medium';
};

export default function RiskRoseChart({
  data,
  riskLevel,
  onItemClick,
  height = 320,
  className,
}: RiskRoseChartProps) {
  const total = useMemo(() => {
    return Object.values(data).reduce((sum, value) => sum + value, 0);
  }, [data]);

  const chartData = useMemo(() => {
    return Object.entries(data).map(([name, value]) => {
      const level = riskLevel || getTypeRiskLevel(name);
      return {
        value,
        name,
        itemStyle: {
          color: riskColors[level],
          shadowBlur: 15,
          shadowColor: riskColors[level] + '80',
        },
      };
    });
  }, [data, riskLevel]);

  const option = useMemo<EChartsOption>(() => {
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
          const percent = total > 0 ? ((params.value / total) * 100).toFixed(1) : '0';
          return `
            <div style="padding: 8px;">
              <div style="font-weight: 600; margin-bottom: 6px; font-size: 14px;">${params.name}</div>
              <div style="display: flex; justify-content: space-between; gap: 24px;">
                <span style="color: #94a3b8;">事件数量</span>
                <span style="font-weight: 600; font-family: monospace;">${params.value}</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 24px; margin-top: 4px;">
                <span style="color: #94a3b8;">占比</span>
                <span style="font-weight: 600; font-family: monospace; color: ${params.color};">${percent}%</span>
              </div>
            </div>
          `;
        },
      },
      legend: {
        bottom: 0,
        left: 'center',
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 16,
        textStyle: {
          color: '#94a3b8',
          fontSize: 12,
        },
        formatter: (name: string) => {
          const item = chartData.find((d) => d.name === name);
          if (!item) return name;
          const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
          return `${name}  ${percent}%`;
        },
      },
      series: [
        {
          name: '事件类型',
          type: 'pie',
          radius: ['30%', '75%'],
          center: ['50%', '42%'],
          roseType: 'area',
          itemStyle: {
            borderRadius: 6,
            borderColor: '#0B1221',
            borderWidth: 2,
          },
          label: {
            show: true,
            color: '#e2e8f0',
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'monospace',
            formatter: (params: any) => {
              return `{name|${params.name}}\n{value|${params.value}}`;
            },
            rich: {
              name: {
                fontSize: 12,
                color: '#94a3b8',
                lineHeight: 18,
              },
              value: {
                fontSize: 14,
                fontWeight: 600,
                color: '#e2e8f0',
              },
            },
          },
          labelLine: {
            lineStyle: {
              color: 'rgba(42, 58, 92, 0.8)',
              width: 1,
            },
            length: 12,
            length2: 8,
            smooth: true,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 25,
              shadowOffsetX: 0,
              shadowColor: 'rgba(39, 93, 204, 0.5)',
            },
            scale: true,
            scaleSize: 8,
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 600,
            },
          },
          data: chartData,
          animationType: 'scale',
          animationDuration: 1000,
          animationEasing: 'cubicOut',
        },
      ],
    };
  }, [chartData, total]);

  const handleChartClick = useCallback(
    (params: any) => {
      if (onItemClick && params.name !== undefined) {
        onItemClick(params.name, params.value);
      }
    },
    [onItemClick]
  );

  const onEvents = useMemo(() => {
    return {
      click: handleChartClick,
    };
  }, [handleChartClick]);

  return (
    <div className={className} style={{ height }}>
      <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
        onEvents={onEvents}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
