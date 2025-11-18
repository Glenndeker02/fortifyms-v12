import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  TooltipProps,
} from 'recharts';
import { BaseChart } from './BaseChart';

export interface PieChartData {
  name: string;
  value: number;
  color: string;
}

export interface PieChartProps {
  title: string;
  description?: string;
  data: PieChartData[];
  onExport?: () => void;
  onFullscreen?: () => void;
  onSliceClick?: (data: PieChartData, index: number) => void;
  className?: string;
  innerRadius?: number;
  outerRadius?: number;
}

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white p-4 border rounded-lg shadow-lg">
        <p className="font-semibold mb-1">{data.name}</p>
        <p className="text-sm">
          Value: <span className="font-semibold">{data.value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export function PieChart({
  title,
  description,
  data,
  onExport,
  onFullscreen,
  onSliceClick,
  className,
  innerRadius = 0,
  outerRadius = 80,
}: PieChartProps) {
  return (
    <BaseChart
      title={title}
      description={description}
      onExport={onExport}
      onFullscreen={onFullscreen}
      className={className}
    >
      <ResponsiveContainer width="100%" height={300}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) =>
              `${name}: ${(percent * 100).toFixed(0)}%`
            }
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey="value"
            onClick={(data, index) => onSliceClick?.(data, index)}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{ fontSize: '12px' }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </BaseChart>
  );
}
