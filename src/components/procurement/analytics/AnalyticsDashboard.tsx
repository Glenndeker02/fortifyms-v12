'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard, BarChart, LineChart } from '@/components/charts';
import { TrendingUp, Package, DollarSign, Users } from 'lucide-react';

export default function AnalyticsDashboard() {
  const volumeData = [
    { month: 'Jan', volume: 45000, value: 120000 },
    { month: 'Feb', volume: 52000, value: 135000 },
    { month: 'Mar', volume: 48000, value: 128000 },
    { month: 'Apr', volume: 61000, value: 155000 },
    { month: 'May', volume: 55000, value: 142000 },
    { month: 'Jun', volume: 67000, value: 168000 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Volume"
          value="328K kg"
          change={12.5}
          icon={Package}
          iconColor="blue"
        />
        <MetricCard
          title="Total Value"
          value="$848K"
          change={8.3}
          icon={DollarSign}
          iconColor="green"
        />
        <MetricCard
          title="Active Mills"
          value="47"
          change={4.4}
          icon={TrendingUp}
          iconColor="purple"
        />
        <MetricCard
          title="Buyers"
          value="156"
          change={15.2}
          icon={Users}
          iconColor="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChart
          title="Monthly Procurement Volume"
          description="Volume and value trends"
          data={volumeData}
          bars={[
            { dataKey: 'volume', fill: '#3b82f6', name: 'Volume (kg)' },
            { dataKey: 'value', fill: '#10b981', name: 'Value ($)' },
          ]}
          xAxisKey="month"
        />
        <LineChart
          title="Procurement Trends"
          description="6-month trend analysis"
          data={volumeData}
          lines={[
            { dataKey: 'volume', stroke: '#3b82f6', name: 'Volume' },
            { dataKey: 'value', stroke: '#10b981', name: 'Value' },
          ]}
          xAxisKey="month"
        />
      </div>
    </div>
  );
}
