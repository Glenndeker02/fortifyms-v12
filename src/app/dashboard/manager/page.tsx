'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Package,
  CheckCircle2,
  DollarSign,
  ShoppingCart,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface ManagerAnalytics {
  kpiCards: {
    productionVolume: { value: number; change: number; unit: string };
    qcPassRate: { value: number; unit: string };
    complianceScore: { value: number; status: string };
    activeOrders: { value: number };
    revenue: { value: number; unit: string };
  };
  alerts: {
    high: Array<{ type: string; count: number; message: string }>;
    medium: Array<{ type: string; count: number; message: string }>;
    actions: Array<{ type: string; count: number; message: string }>;
  };
  production: {
    dailyChart: Array<{ date: Date; quantity: number }>;
    recentBatches: Array<{
      id: string;
      batchNumber: string;
      quantityProduced: number;
      status: string;
    }>;
  };
  compliance: {
    trend: Array<{ auditDate: string; score: number }>;
  };
}

export default function ManagerDashboard() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<ManagerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/mill-manager')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAnalytics(data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mill Manager Dashboard</h1>
        <p className="text-muted-foreground">Complete overview of operations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Production</CardTitle>
            <Package className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.kpiCards.productionVolume.value}</div>
            <p className="text-xs flex items-center gap-1">
              {analytics.kpiCards.productionVolume.change > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              {Math.abs(analytics.kpiCards.productionVolume.change)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QC Pass Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.kpiCards.qcPassRate.value}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance</CardTitle>
            <CheckCircle2 className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.kpiCards.complianceScore.value}</div>
            <Badge>{analytics.kpiCards.complianceScore.status}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <ShoppingCart className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.kpiCards.activeOrders.value}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.kpiCards.revenue.value}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(analytics.alerts.high.length > 0 || analytics.alerts.medium.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Alerts & Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.alerts.high.map((alert, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-red-50 rounded">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">{alert.message}</span>
                  <Badge className="ml-auto">{alert.count}</Badge>
                </div>
              ))}
              {analytics.alerts.medium.map((alert, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">{alert.message}</span>
                  <Badge className="ml-auto">{alert.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Production Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Production (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.production.dailyChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantity" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Compliance Trend */}
      {analytics.compliance.trend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Compliance Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.compliance.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="auditDate" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
