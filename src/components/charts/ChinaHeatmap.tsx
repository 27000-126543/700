import { useRef, useEffect, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import type { HeatmapData } from '@shared/types';
import { cn } from '@/lib/utils';

interface ChinaHeatmapProps {
  data: HeatmapData[];
  onProvinceClick?: (province: HeatmapData) => void;
  className?: string;
  height?: number | string;
}

const chinaGeoJSON = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: '北京', adcode: '110000' }, geometry: { type: 'Polygon', coordinates: [[[116.4, 39.9], [116.8, 39.9], [116.8, 40.2], [116.4, 40.2], [116.4, 39.9]]] } },
    { type: 'Feature', properties: { name: '天津', adcode: '120000' }, geometry: { type: 'Polygon', coordinates: [[[117.0, 38.8], [117.8, 38.8], [117.8, 39.3], [117.0, 39.3], [117.0, 38.8]]] } },
    { type: 'Feature', properties: { name: '河北', adcode: '130000' }, geometry: { type: 'Polygon', coordinates: [[[114.2, 36.0], [119.6, 36.0], [119.6, 42.6], [114.2, 42.6], [114.2, 36.0]]] } },
    { type: 'Feature', properties: { name: '山西', adcode: '140000' }, geometry: { type: 'Polygon', coordinates: [[[110.2, 34.5], [114.6, 34.5], [114.6, 40.8], [110.2, 40.8], [110.2, 34.5]]] } },
    { type: 'Feature', properties: { name: '内蒙古', adcode: '150000' }, geometry: { type: 'Polygon', coordinates: [[[97.2, 37.4], [126.0, 37.4], [126.0, 53.6], [97.2, 53.6], [97.2, 37.4]]] } },
    { type: 'Feature', properties: { name: '辽宁', adcode: '210000' }, geometry: { type: 'Polygon', coordinates: [[[119.0, 38.4], [125.8, 38.4], [125.8, 43.6], [119.0, 43.6], [119.0, 38.4]]] } },
    { type: 'Feature', properties: { name: '吉林', adcode: '220000' }, geometry: { type: 'Polygon', coordinates: [[[121.6, 41.0], [131.4, 41.0], [131.4, 46.3], [121.6, 46.3], [121.6, 41.0]]] } },
    { type: 'Feature', properties: { name: '黑龙江', adcode: '230000' }, geometry: { type: 'Polygon', coordinates: [[[121.5, 43.4], [135.1, 43.4], [135.1, 53.6], [121.5, 53.6], [121.5, 43.4]]] } },
    { type: 'Feature', properties: { name: '上海', adcode: '310000' }, geometry: { type: 'Polygon', coordinates: [[[120.9, 30.7], [122.0, 30.7], [122.0, 31.5], [120.9, 31.5], [120.9, 30.7]]] } },
    { type: 'Feature', properties: { name: '江苏', adcode: '320000' }, geometry: { type: 'Polygon', coordinates: [[[116.4, 30.8], [121.9, 30.8], [121.9, 35.1], [116.4, 35.1], [116.4, 30.8]]] } },
    { type: 'Feature', properties: { name: '浙江', adcode: '330000' }, geometry: { type: 'Polygon', coordinates: [[[118.0, 27.0], [123.2, 27.0], [123.2, 31.3], [118.0, 31.3], [118.0, 27.0]]] } },
    { type: 'Feature', properties: { name: '安徽', adcode: '340000' }, geometry: { type: 'Polygon', coordinates: [[[114.8, 29.4], [119.6, 29.4], [119.6, 34.7], [114.8, 34.7], [114.8, 29.4]]] } },
    { type: 'Feature', properties: { name: '福建', adcode: '350000' }, geometry: { type: 'Polygon', coordinates: [[[116.0, 23.5], [120.5, 23.5], [120.5, 28.3], [116.0, 28.3], [116.0, 23.5]]] } },
    { type: 'Feature', properties: { name: '江西', adcode: '360000' }, geometry: { type: 'Polygon', coordinates: [[[113.5, 24.5], [118.5, 24.5], [118.5, 30.1], [113.5, 30.1], [113.5, 24.5]]] } },
    { type: 'Feature', properties: { name: '山东', adcode: '370000' }, geometry: { type: 'Polygon', coordinates: [[[114.8, 34.2], [122.7, 34.2], [122.7, 38.4], [114.8, 38.4], [114.8, 34.2]]] } },
    { type: 'Feature', properties: { name: '河南', adcode: '410000' }, geometry: { type: 'Polygon', coordinates: [[[110.3, 31.4], [116.7, 31.4], [116.7, 36.4], [110.3, 36.4], [110.3, 31.4]]] } },
    { type: 'Feature', properties: { name: '湖北', adcode: '420000' }, geometry: { type: 'Polygon', coordinates: [[[108.3, 29.0], [116.1, 29.0], [116.1, 33.3], [108.3, 33.3], [108.3, 29.0]]] } },
    { type: 'Feature', properties: { name: '湖南', adcode: '430000' }, geometry: { type: 'Polygon', coordinates: [[[108.8, 24.6], [114.3, 24.6], [114.3, 30.1], [108.8, 30.1], [108.8, 24.6]]] } },
    { type: 'Feature', properties: { name: '广东', adcode: '440000' }, geometry: { type: 'Polygon', coordinates: [[[109.4, 20.1], [117.2, 20.1], [117.2, 25.5], [109.4, 25.5], [109.4, 20.1]]] } },
    { type: 'Feature', properties: { name: '广西', adcode: '450000' }, geometry: { type: 'Polygon', coordinates: [[[104.3, 20.5], [112.1, 20.5], [112.1, 26.4], [104.3, 26.4], [104.3, 20.5]]] } },
    { type: 'Feature', properties: { name: '海南', adcode: '460000' }, geometry: { type: 'Polygon', coordinates: [[[108.5, 18.1], [111.1, 18.1], [111.1, 20.2], [108.5, 20.2], [108.5, 18.1]]] } },
    { type: 'Feature', properties: { name: '重庆', adcode: '500000' }, geometry: { type: 'Polygon', coordinates: [[[105.2, 28.1], [110.2, 28.1], [110.2, 32.2], [105.2, 32.2], [105.2, 28.1]]] } },
    { type: 'Feature', properties: { name: '四川', adcode: '510000' }, geometry: { type: 'Polygon', coordinates: [[[97.3, 26.0], [108.6, 26.0], [108.6, 34.3], [97.3, 34.3], [97.3, 26.0]]] } },
    { type: 'Feature', properties: { name: '贵州', adcode: '520000' }, geometry: { type: 'Polygon', coordinates: [[[103.5, 24.6], [109.6, 24.6], [109.6, 29.2], [103.5, 29.2], [103.5, 24.6]]] } },
    { type: 'Feature', properties: { name: '云南', adcode: '530000' }, geometry: { type: 'Polygon', coordinates: [[[97.5, 21.1], [106.2, 21.1], [106.2, 29.2], [97.5, 29.2], [97.5, 21.1]]] } },
    { type: 'Feature', properties: { name: '西藏', adcode: '540000' }, geometry: { type: 'Polygon', coordinates: [[[78.4, 26.8], [99.1, 26.8], [99.1, 36.5], [78.4, 36.5], [78.4, 26.8]]] } },
    { type: 'Feature', properties: { name: '陕西', adcode: '610000' }, geometry: { type: 'Polygon', coordinates: [[[105.3, 31.7], [111.2, 31.7], [111.2, 39.6], [105.3, 39.6], [105.3, 31.7]]] } },
    { type: 'Feature', properties: { name: '甘肃', adcode: '620000' }, geometry: { type: 'Polygon', coordinates: [[[92.2, 32.5], [108.7, 32.5], [108.7, 42.8], [92.2, 42.8], [92.2, 32.5]]] } },
    { type: 'Feature', properties: { name: '青海', adcode: '630000' }, geometry: { type: 'Polygon', coordinates: [[[89.3, 31.5], [103.1, 31.5], [103.1, 39.2], [89.3, 39.2], [89.3, 31.5]]] } },
    { type: 'Feature', properties: { name: '宁夏', adcode: '640000' }, geometry: { type: 'Polygon', coordinates: [[[104.2, 35.2], [107.7, 35.2], [107.7, 39.4], [104.2, 39.4], [104.2, 35.2]]] } },
    { type: 'Feature', properties: { name: '新疆', adcode: '650000' }, geometry: { type: 'Polygon', coordinates: [[[73.5, 34.3], [96.4, 34.3], [96.4, 49.2], [73.5, 49.2], [73.5, 34.3]]] } },
    { type: 'Feature', properties: { name: '台湾', adcode: '710000' }, geometry: { type: 'Polygon', coordinates: [[[119.3, 21.8], [122.0, 21.8], [122.0, 25.4], [119.3, 25.4], [119.3, 21.8]]] } },
    { type: 'Feature', properties: { name: '香港', adcode: '810000' }, geometry: { type: 'Polygon', coordinates: [[[113.8, 22.1], [114.4, 22.1], [114.4, 22.6], [113.8, 22.6], [113.8, 22.1]]] } },
    { type: 'Feature', properties: { name: '澳门', adcode: '820000' }, geometry: { type: 'Polygon', coordinates: [[[113.5, 22.1], [113.6, 22.1], [113.6, 22.3], [113.5, 22.3], [113.5, 22.1]]] } },
  ],
};

const provinceNameMap: Record<string, string> = {
  '北京市': '北京',
  '天津市': '天津',
  '河北省': '河北',
  '山西省': '山西',
  '内蒙古自治区': '内蒙古',
  '辽宁省': '辽宁',
  '吉林省': '吉林',
  '黑龙江省': '黑龙江',
  '上海市': '上海',
  '江苏省': '江苏',
  '浙江省': '浙江',
  '安徽省': '安徽',
  '福建省': '福建',
  '江西省': '江西',
  '山东省': '山东',
  '河南省': '河南',
  '湖北省': '湖北',
  '湖南省': '湖南',
  '广东省': '广东',
  '广西壮族自治区': '广西',
  '海南省': '海南',
  '重庆市': '重庆',
  '四川省': '四川',
  '贵州省': '贵州',
  '云南省': '云南',
  '西藏自治区': '西藏',
  '陕西省': '陕西',
  '甘肃省': '甘肃',
  '青海省': '青海',
  '宁夏回族自治区': '宁夏',
  '新疆维吾尔自治区': '新疆',
  '台湾省': '台湾',
  '香港特别行政区': '香港',
  '澳门特别行政区': '澳门',
};

const riskLevelColors: Record<string, string> = {
  low: '#3CAEA3',
  medium: '#F4A261',
  high: '#F76C5E',
  critical: '#E63946',
};

export default function ChinaHeatmap({
  data,
  onProvinceClick,
  className,
  height = 500,
}: ChinaHeatmapProps) {
  const chartRef = useRef<ReactECharts>(null);

  useEffect(() => {
    echarts.registerMap('china', chinaGeoJSON as unknown as Parameters<typeof echarts.registerMap>[1]);
  }, []);

  const chartData = useMemo(() => {
    return data.map((item) => ({
      name: provinceNameMap[item.province] || item.province,
      value: item.value,
      itemStyle: {
        areaColor: riskLevelColors[item.riskLevel] || '#457B9D',
      },
      ...item,
    }));
  }, [data]);

  const maxValue = useMemo(() => {
    if (data.length === 0) return 100;
    return Math.max(...data.map((d) => d.value));
  }, [data]);

  const handleClick = useCallback(
    (params: { name: string }) => {
      if (!onProvinceClick) return;
      const provinceData = data.find(
        (d) => provinceNameMap[d.province] === params.name || d.province === params.name,
      );
      if (provinceData) {
        onProvinceClick(provinceData);
      }
    },
    [data, onProvinceClick],
  );

  const option = useMemo((): echarts.EChartsOption => {
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(26, 37, 64, 0.95)',
        borderColor: 'rgba(42, 58, 92, 0.8)',
        borderWidth: 1,
        textStyle: {
          color: '#E2E8F0',
          fontSize: 13,
        },
        padding: [12, 16],
        formatter: (params: unknown) => {
          const p = params as { name: string };
          const provinceData = data.find(
            (d) => provinceNameMap[d.province] === p.name || d.province === p.name,
          );
          if (!provinceData) return p.name;
          const riskLabels: Record<string, string> = {
            low: '低风险',
            medium: '中风险',
            high: '高风险',
            critical: '极高风险',
          };
          return `
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #fff;">${p.name}</div>
            <div style="display: flex; justify-content: space-between; gap: 20px; margin: 4px 0;">
              <span style="color: #94A3B8;">风险指数:</span>
              <span style="color: ${riskLevelColors[provinceData.riskLevel] || '#fff'}; font-weight: 600;">${provinceData.value.toFixed(1)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 20px; margin: 4px 0;">
              <span style="color: #94A3B8;">风险等级:</span>
              <span style="color: ${riskLevelColors[provinceData.riskLevel] || '#fff'}; font-weight: 600;">${riskLabels[provinceData.riskLevel] || provinceData.riskLevel}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 20px; margin: 4px 0;">
              <span style="color: #94A3B8;">实验室数量:</span>
              <span style="color: #fff; font-weight: 500;">${provinceData.labCount} 个</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 20px; margin: 4px 0;">
              <span style="color: #94A3B8;">预警数量:</span>
              <span style="color: #E63946; font-weight: 600;">${provinceData.alertCount} 条</span>
            </div>
          `;
        },
      },
      visualMap: {
        type: 'continuous',
        min: 0,
        max: maxValue,
        left: 20,
        bottom: 20,
        calculable: true,
        inRange: {
          color: ['#1E4FB8', '#275DCC', '#457B9D', '#3CAEA3', '#F4A261', '#F76C5E', '#E63946'],
        },
        textStyle: {
          color: '#94A3B8',
          fontSize: 12,
        },
        text: ['高风险', '低风险'],
        itemHeight: 140,
        itemWidth: 16,
        backgroundColor: 'rgba(26, 37, 64, 0.6)',
        borderColor: 'rgba(42, 58, 92, 0.5)',
        borderWidth: 1,
        padding: [12, 12],
      } as echarts.VisualMapComponentOption,
      geo: {
        map: 'china',
        roam: true,
        zoom: 1.2,
        center: [104, 35],
        label: {
          show: true,
          color: '#94A3B8',
          fontSize: 11,
        },
        itemStyle: {
          areaColor: '#131B2E',
          borderColor: '#2A3A5C',
          borderWidth: 1,
        },
        emphasis: {
          label: {
            show: true,
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
          },
          itemStyle: {
            areaColor: '#1E4FB8',
            borderColor: '#275DCC',
            borderWidth: 2,
            shadowColor: 'rgba(39, 93, 204, 0.5)',
            shadowBlur: 20,
          },
        },
        select: {
          label: {
            show: true,
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
          },
          itemStyle: {
            areaColor: '#153E9A',
            borderColor: '#4C77D5',
            borderWidth: 2,
            shadowColor: 'rgba(39, 93, 204, 0.6)',
            shadowBlur: 25,
          },
        },
      },
      series: [
        {
          name: '风险热力',
          type: 'map',
          map: 'china',
          geoIndex: 0,
          data: chartData,
        },
        {
          name: '散点标记',
          type: 'scatter',
          coordinateSystem: 'geo',
          symbolSize: (val: unknown) => {
            const v = val as [number, number, number];
            return Math.max(6, Math.min(18, v[2] / maxValue * 18));
          },
          itemStyle: {
            color: '#E63946',
            shadowBlur: 10,
            shadowColor: '#E63946',
          },
          data: data
            .filter((d) => d.alertCount > 0)
            .map((d) => {
              const feature = chinaGeoJSON.features.find(
                (f) => f.properties.name === (provinceNameMap[d.province] || d.province),
              );
              if (!feature) return null;
              const coords = feature.geometry.coordinates[0];
              const avgLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
              const avgLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
              return {
                name: d.province,
                value: [avgLng, avgLat, d.value] as [number, number, number],
                itemStyle: {
                  color: riskLevelColors[d.riskLevel] || '#E63946',
                  shadowBlur: 15,
                  shadowColor: riskLevelColors[d.riskLevel] || '#E63946',
                },
              };
            })
            .filter(Boolean),
        } as echarts.SeriesOption,
      ],
    };
  }, [chartData, data, maxValue]);

  const onEvents = useMemo(() => {
    return {
      click: handleClick,
    };
  }, [handleClick]);

  return (
    <div
      className={cn(
        'glass-card relative overflow-hidden',
        className,
      )}
      style={{ height }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-transparent to-surface-card/50 pointer-events-none" />
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
          全国风险热力分布
        </h3>
        <span className="text-xs text-slate-500">
          共 {data.length} 个省级行政区
        </span>
      </div>
      <ReactECharts
        ref={chartRef}
        option={option}
        onEvents={onEvents}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
