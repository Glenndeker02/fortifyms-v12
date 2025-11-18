import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { BaseChart } from './BaseChart';

export interface LineChartData {
  name: string;
  [key: string]: string | number;
}

export interface LineChartProps {
  title: string;
  description?: string;
  data: LineChartData[];
  lines: {
    dataKey: string;
    stroke: string;
    name?: string;
  }[];
  xAxisKey: string;
  onExport?: () => void;
  onFullscreen?: () => void;
  onDataPointClick?: (data: any) => void;
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
              className="w-3 h-3 rounded-full"
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

export function LineChart({
  title,
  description,
  data,
  lines,
  xAxisKey,
  onExport,
  onFullscreen,
  onDataPointClick,
  className,
}: LineChartProps) {
  return (
    <BaseChart
      title={title}
      description={description}
      onExport={onExport}
      onFullscreen={onFullscreen}
      className={className}
    >
      <ResponsiveContainer width="100%" height={300}>
        <RechartsLineChart
          data={data}
          onClick={onDataPointClick}
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
            iconType="line"
          />
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.stroke}
              name={line.name || line.dataKey}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </BaseChart>
  );
}
