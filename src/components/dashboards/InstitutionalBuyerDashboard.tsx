'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard, LineChart, PieChart, BarChart } from '@/components/charts';
import {
  DollarSign,
  Package,
  TrendingDown,
  Clock,
  Filter,
  Download,
  Plus,
  Star,
  Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterPanel } from '@/components/analytics/FilterPanel';
import { Badge } from '@/components/ui/badge';

export default function InstitutionalBuyerDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: 'last-12-months',
    commodity: 'all',
    supplier: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [filters]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboards/institutional-buyer');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    console.log('Exporting report...');
  };

  const handleDrillDown = (chartData: any) => {
    console.log('Drilling down into:', chartData);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      awarded: { label: 'Awarded', variant: 'default' },
      'in-transit': { label: 'In Transit', variant: 'secondary' },
      bidding: { label: 'Bidding', variant: 'outline' },
      'on-track': { label: 'On Track', variant: 'default' },
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buyer Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage procurements and track supplier performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button
            onClick={handleExportReport}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New RFP
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Procurements"
          value={data.overview.activeProcurements}
          icon={Package}
          iconColor="blue"
          onClick={() => handleDrillDown('procurements')}
        />
        <MetricCard
          title="YTD Spending"
          value={`$${(data.overview.totalSpendYTD / 1000).toFixed(0)}K`}
          change={data.overview.monthlyChange.spend}
          icon={DollarSign}
          iconColor="green"
          onClick={() => handleDrillDown('spending')}
        />
        <MetricCard
          title="Cost Per Kg"
          value={`$${data.overview.costPerKg}`}
          change={data.overview.monthlyChange.costPerKg}
          icon={TrendingDown}
          iconColor="purple"
          onClick={() => handleDrillDown('costs')}
        />
        <MetricCard
          title="On-Time Delivery"
          value={`${data.overview.onTimeDeliveryRate}%`}
          change={data.overview.monthlyChange.deliveries}
          icon={Clock}
          iconColor="orange"
          onClick={() => handleDrillDown('delivery')}
        />
      </div>

      {/* My Procurements */}
      <Card>
        <CardHeader>
          <CardTitle>My Procurements</CardTitle>
          <CardDescription>Active and recent procurement requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.myProcurements.map((procurement: any) => (
              <div key={procurement.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium">{procurement.id}</h4>
                    <p className="text-sm text-muted-foreground">{procurement.commodity}</p>
                  </div>
                  {getStatusBadge(procurement.status)}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                  <div>
                    <span className="text-muted-foreground">Quantity:</span>
                    <span className="ml-2 font-medium">{procurement.quantity} kg</span>
                  </div>
                  {procurement.supplier && (
                    <div>
                      <span className="text-muted-foreground">Supplier:</span>
                      <span className="ml-2 font-medium">{procurement.supplier}</span>
                    </div>
                  )}
                  {procurement.deliveryDate && (
                    <div>
                      <span className="text-muted-foreground">Delivery:</span>
                      <span className="ml-2 font-medium">{procurement.deliveryDate}</span>
                    </div>
                  )}
                  {procurement.qualityScore && (
                    <div>
                      <span className="text-muted-foreground">Quality:</span>
                      <span className="ml-2 font-medium">{procurement.qualityScore}%</span>
                    </div>
                  )}
                  {procurement.bidsReceived && (
                    <div>
                      <span className="text-muted-foreground">Bids:</span>
                      <span className="ml-2 font-medium">{procurement.bidsReceived}</span>
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="mt-3">
                  View Details →
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Spending and Commodity Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LineChart
            title="Spending & Volume Trends"
            description="Monthly procurement spending and quantity over time"
            data={data.spendingTrends}
            lines={[
              { dataKey: 'spend', stroke: '#3b82f6', name: 'Spending ($)' },
              { dataKey: 'quantity', stroke: '#10b981', name: 'Quantity (kg)' },
            ]}
            xAxisKey="name"
            onDataPointClick={handleDrillDown}
          />
        </div>
        <PieChart
          title="Commodity Breakdown"
          description="Procurement by commodity type"
          data={data.commodityBreakdown}
          onSliceClick={handleDrillDown}
        />
      </div>

      {/* Supplier Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Performance</CardTitle>
          <CardDescription>Track quality and reliability of your suppliers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.supplierPerformance.map((supplier: any) => (
              <div key={supplier.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{supplier.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {supplier.ordersCompleted} orders completed
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{supplier.rating}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{supplier.onTimeRate}%</div>
                    <div className="text-xs text-muted-foreground">On-Time Rate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{supplier.qualityScore}%</div>
                    <div className="text-xs text-muted-foreground">Quality Score</div>
                  </div>
                  <div className="flex items-center justify-end">
                    <Button variant="outline" size="sm">View Profile</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Upcoming Deliveries
          </CardTitle>
          <CardDescription>Track shipments and expected arrivals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.upcomingDeliveries.map((delivery: any) => (
              <div key={delivery.id} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{delivery.orderId}</h4>
                  <p className="text-sm text-muted-foreground">
                    {delivery.commodity} - {delivery.quantity} kg from {delivery.supplier}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-medium">{delivery.expectedDate}</div>
                  <div className="text-sm">{getStatusBadge(delivery.status)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quality Metrics Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Metrics</CardTitle>
          <CardDescription>Overall quality performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {data.qualityMetrics.averageQualityScore}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">Avg Quality Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {data.qualityMetrics.batchesReceived}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Batches Received</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {data.qualityMetrics.issuesReported}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Issues Reported</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {data.qualityMetrics.issuesResolved}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Issues Resolved</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
