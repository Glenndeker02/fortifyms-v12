import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
  Cell,
} from 'recharts';
import { BaseChart } from './BaseChart';

export interface BarChartData {
  name: string;
  [key: string]: string | number;
}

export interface BarChartProps {
  title: string;
  description?: string;
  data: BarChartData[];
  bars: {
    dataKey: string;
    fill: string;
    name?: string;
  }[];
  xAxisKey: string;
  stacked?: boolean;
  onExport?: () => void;
  onFullscreen?: () => void;
  onBarClick?: (data: any, index: number) => void;
  className?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border rounded-lg shadow-lg">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm">
              {entry.name}: <span className="font-semibold">{entry.value}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function BarChart({
  title,
  description,
  data,
  bars,
  xAxisKey,
  stacked = false,
  onExport,
  onFullscreen,
  onBarClick,
  className,
}: BarChartProps) {
  return (
    <BaseChart
      title={title}
      description={description}
      onExport={onExport}
      onFullscreen={onFullscreen}
      className={className}
    >
      <ResponsiveContainer width="100%" height={300}>
        <RechartsBarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey={xAxisKey}
            stroke="#666"
            style={{ fontSize: '12px' }}
          />
          <YAxis stroke="#666" style={{ fontSize: '12px' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
          />
          {bars.map((bar) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              fill={bar.fill}
              name={bar.name || bar.dataKey}
              stackId={stacked ? 'stack' : undefined}
              onClick={onBarClick}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </BaseChart>
  );
}
