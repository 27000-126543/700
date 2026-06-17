import { useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface BarChartProps {
  data: { unitName: string; rate: number }[];
  title?: string;
  height?: number | string;
  className?: string;
  onItemClick?: (unitName: string, rate: number) => void;
}

export default function BarChart({
  data,
  title,
  height = 350,
  className,
  onItemClick,
}: BarChartProps) {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.rate - a.rate);
  }, [data]);

  const option = useMemo<EChartsOption>(() => {
    return {
      backgroundColor: 'transparent',
      grid: {
        left: '3%',
        right: '8%',
        bottom: '3%',
        top: title ? '15%' : '8%',
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        backgroundColor: 'rgba(26, 37, 64, 0.95)',
        borderColor: 'rgba(42, 58, 92, 0.8)',
        borderWidth: 1,
        textStyle: {
          color: '#e2e8f0',
          fontSize: 13,
        },
        formatter: (params: any) => {
          const param = params[0];
          return `
            <div style="padding: 8px;">
              <div style="font-weight: 600; margin-bottom: 6px; font-size: 14px;">${param.name}</div>
              <div style="display: flex; justify-content: space-between; gap: 24px;">
                <span style="color: #94a3b8;">执行率</span>
                <span style="font-weight: 600; font-family: monospace; color: ${param.color};">${param.value}%</span>
              </div>
            </div>
          `;
        },
      },
      xAxis: {
        type: 'value',
        max: 100,
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          fontFamily: 'monospace',
          formatter: '{value}%',
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(42, 58, 92, 0.3)',
            type: 'dashed',
          },
        },
      },
      yAxis: {
        type: 'category',
        data: sortedData.map((item) => item.unitName),
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          width: 100,
          overflow: 'truncate',
          margin: 8,
        },
      },
      series: [
        {
          type: 'bar',
          data: sortedData.map((item, index) => {
            const color =
              item.rate >= 95
                ? '#3CAEA3'
                : item.rate >= 85
                  ? '#F4A261'
                  : '#F76C5E';
            return {
              value: item.rate,
              itemStyle: {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 1,
                  y2: 0,
                  colorStops: [
                    { offset: 0, color: color + 'CC' },
                    { offset: 1, color: color },
                  ],
                },
                borderRadius: [0, 4, 4, 0],
                shadowBlur: 10,
                shadowColor: color + '40',
              },
              emphasis: {
                itemStyle: {
                  shadowBlur: 20,
                  shadowColor: color + '80',
                },
              },
            };
          }),
          barWidth: 14,
          label: {
            show: true,
            position: 'right',
            color: '#e2e8f0',
            fontSize: 11,
            fontFamily: 'monospace',
            fontWeight: 600,
            formatter: '{c}%',
            distance: 8,
          },
          animationDelay: (idx: number) => idx * 100,
          animationDuration: 1000,
          animationEasing: 'cubicOut',
        },
      ],
      animationDuration: 1000,
      animationEasing: 'cubicOut',
    };
  }, [sortedData, title]);

  const handleChartClick = useCallback(
    (params: any) => {
      if (onItemClick && params.name !== undefined) {
        const item = sortedData.find((d) => d.unitName === params.name);
        if (item) {
          onItemClick(item.unitName, item.rate);
        }
      }
    },
    [onItemClick, sortedData],
  );

  const onEvents = useMemo(() => {
    return {
      click: handleChartClick,
    };
  }, [handleChartClick]);

  return (
    <div className={className} style={{ height }}>
      {title && (
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
          {title}
        </h3>
      )}
      <ReactECharts
        option={option}
        style={{ height: title ? 'calc(100% - 32px)' : '100%', width: '100%' }}
        onEvents={onEvents}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
