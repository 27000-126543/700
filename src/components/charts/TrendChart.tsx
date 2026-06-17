import { useEffect, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { TrendData } from '../../../../shared/types';
import { cn } from '@/lib/utils';

interface TrendChartProps {
  data: TrendData;
  height?: number | string;
  className?: string;
}

const COLORS = {
  inventory: '#4C77D5',
  events: '#9B5DE5',
  usage: '#3CAEA3',
  alerts: '#E63946',
};

const SERIES_CONFIG = [
  { key: 'inventory', name: '库存总量', color: COLORS.inventory, icon: 'rect' },
  { key: 'events', name: '安全事件', color: COLORS.events, icon: 'roundRect' },
  { key: 'usage', name: '使用量', color: COLORS.usage, icon: 'triangle' },
  { key: 'alerts', name: '预警数量', color: COLORS.alerts, icon: 'diamond' },
] as const;

export default function TrendChart({ data, height = 400, className }: TrendChartProps) {
  const chartRef = useRef<ReactECharts>(null);
  const [selectedSeries, setSelectedSeries] = useState<Record<string, boolean>>({
    inventory: true,
    events: true,
    usage: true,
    alerts: true,
  });

  useEffect(() => {
    const handleResize = () => {
      chartRef.current?.getEchartsInstance().resize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSeries = (key: string) => {
    setSelectedSeries((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    color: SERIES_CONFIG.map((s) => s.color),
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(26, 37, 64, 0.95)',
      borderColor: '#2A3A5C',
      borderWidth: 1,
      textStyle: {
        color: '#E2E8F0',
        fontSize: 13,
      },
      axisPointer: {
        type: 'cross',
        lineStyle: {
          color: '#4C77D5',
          type: 'dashed',
          width: 1,
        },
        crossStyle: {
          color: '#4C77D5',
        },
        label: {
          backgroundColor: '#1A2540',
          color: '#E2E8F0',
          borderColor: '#2A3A5C',
          borderWidth: 1,
        },
      },
    },
    legend: {
      show: false,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.dates,
      axisLine: {
        lineStyle: {
          color: '#2A3A5C',
        },
      },
      axisLabel: {
        color: '#94A3B8',
        fontSize: 12,
        rotate: 45,
        interval: Math.floor(data.dates.length / 8),
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false,
      },
      axisLabel: {
        color: '#94A3B8',
        fontSize: 12,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        lineStyle: {
          color: '#2A3A5C',
          type: 'dashed',
        },
      },
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
      },
      {
        type: 'slider',
        start: 0,
        end: 100,
        height: 20,
        bottom: 10,
        borderColor: 'transparent',
        backgroundColor: '#131B2E',
        fillerColor: 'rgba(76, 119, 213, 0.2)',
        handleIcon:
          'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
        handleSize: '100%',
        handleStyle: {
          color: '#4C77D5',
          shadowBlur: 3,
          shadowColor: 'rgba(76, 119, 213, 0.5)',
          shadowOffsetX: 0,
          shadowOffsetY: 2,
        },
        textStyle: {
          color: '#64748B',
          fontSize: 11,
        },
        dataBackground: {
          areaStyle: {
            color: '#2A3A5C',
          },
          lineStyle: {
            color: '#2A3A5C',
          },
        },
        selectedDataBackground: {
          areaStyle: {
            color: 'rgba(76, 119, 213, 0.15)',
          },
          lineStyle: {
            color: '#4C77D5',
          },
        },
      },
    ],
    series: SERIES_CONFIG.map((config) => ({
      name: config.name,
      type: 'line',
      smooth: true,
      symbol: config.icon,
      symbolSize: 8,
      showSymbol: false,
      emphasis: {
        focus: 'series',
        lineStyle: {
          width: 3,
        },
        itemStyle: {
          shadowBlur: 10,
          shadowColor: config.color,
        },
      },
      lineStyle: {
        width: 2,
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            {
              offset: 0,
              color: config.color + '30',
            },
            {
              offset: 1,
              color: config.color + '00',
            },
          ],
        },
      },
      data: selectedSeries[config.key] ? data[config.key as keyof TrendData] : [],
    })),
  };

  return (
    <div className={cn('glass-card p-5', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">多指标趋势分析</h3>
        <div className="flex flex-wrap gap-3">
          {SERIES_CONFIG.map((config) => (
            <button
              key={config.key}
              onClick={() => toggleSeries(config.key)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200',
                selectedSeries[config.key]
                  ? 'bg-surface-light border border-surface-border text-white'
                  : 'bg-transparent border border-transparent text-slate-500 hover:text-slate-400',
              )}
            >
              <span
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: selectedSeries[config.key] ? config.color : '#475569',
                }}
              />
              <span>{config.name}</span>
            </button>
          ))}
        </div>
      </div>
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
