'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard, LineChart, AreaChart, BarChart, PieChart } from '@/components/charts';
import {
  Activity,
  Building2,
  CheckCircle2,
  Package,
  Users,
  Filter,
  Download,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterPanel } from '@/components/analytics/FilterPanel';

export default function ProgramManagerDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: 'last-12-months',
    country: 'all',
    commodity: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [filters]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboards/program-manager');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    // Implementation for report export
    console.log('Exporting report...');
  };

  const handleDrillDown = (chartData: any) => {
    console.log('Drilling down into:', chartData);
    // Navigate to detailed view
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
          <h1 className="text-3xl font-bold tracking-tight">Program Manager Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor program-wide performance and mill network health
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button
            variant="outline"
            onClick={handleExportReport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
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

      {/* Hero Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Fortified Output"
          value={`${(data.overview.totalFortifiedOutput / 1000).toFixed(0)}K kg`}
          change={data.overview.monthlyChange.output}
          icon={Activity}
          iconColor="blue"
          onClick={() => handleDrillDown('output')}
        />
        <MetricCard
          title="Active Certified Mills"
          value={data.overview.activeCertifiedMills}
          change={data.overview.monthlyChange.mills}
          icon={Building2}
          iconColor="green"
          onClick={() => handleDrillDown('mills')}
        />
        <MetricCard
          title="Avg Compliance Rate"
          value={`${data.overview.averageComplianceRate}%`}
          change={data.overview.monthlyChange.compliance}
          icon={CheckCircle2}
          iconColor="purple"
          onClick={() => handleDrillDown('compliance')}
        />
        <MetricCard
          title="Institutional Deliveries"
          value={data.overview.institutionalDeliveries}
          change={data.overview.monthlyChange.deliveries}
          icon={Package}
          iconColor="orange"
          onClick={() => handleDrillDown('deliveries')}
        />
        <MetricCard
          title="People Reached"
          value={`${(data.overview.peopleReached / 1000).toFixed(0)}K`}
          icon={Users}
          iconColor="red"
          onClick={() => handleDrillDown('impact')}
        />
      </div>

      {/* Production Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AreaChart
            title="Production Volume by Commodity"
            description="Monthly fortified food production across all mills"
            data={data.productionTrends}
            areas={[
              { dataKey: 'rice', fill: '#3b82f6', stroke: '#2563eb', name: 'Rice' },
              { dataKey: 'maize', fill: '#10b981', stroke: '#059669', name: 'Maize' },
              { dataKey: 'wheat', fill: '#f59e0b', stroke: '#d97706', name: 'Wheat' },
            ]}
            xAxisKey="name"
            stacked
            onDataPointClick={handleDrillDown}
          />
        </div>
        <PieChart
          title="Commodity Distribution"
          description="Production breakdown by crop type"
          data={data.commodityDistribution}
          onSliceClick={handleDrillDown}
        />
      </div>

      {/* Compliance and Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineChart
          title="Compliance & QC Trends"
          description="Program-wide compliance and quality metrics over time"
          data={data.complianceTrend}
          lines={[
            { dataKey: 'compliance', stroke: '#8b5cf6', name: 'Compliance Score' },
            { dataKey: 'qcPassRate', stroke: '#10b981', name: 'QC Pass Rate' },
          ]}
          xAxisKey="name"
          onDataPointClick={handleDrillDown}
        />
        <Card>
          <CardHeader>
            <CardTitle>Geographic Coverage</CardTitle>
            <CardDescription>Mills and output by country</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.geographicData.countries.map((country: any) => (
                <div key={country.country} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{country.country}</span>
                    <span className="text-sm text-muted-foreground">
                      {country.mills} mills
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${(country.output / 1000000) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium">
                      {(country.output / 1000).toFixed(0)}K kg
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {country.compliance}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mill Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Mills</CardTitle>
            <CardDescription>Highest compliance and production</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.millPerformance.topPerformers.map((mill: any, index: number) => (
                <div key={mill.id} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{mill.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Compliance: {mill.compliance}% | Output: {(mill.production / 1000).toFixed(0)}K kg
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{mill.rating}</div>
                    <div className="text-xs text-muted-foreground">Rating</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>At-Risk Mills</CardTitle>
            <CardDescription>Mills requiring support and intervention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.millPerformance.atRiskMills.map((mill: any) => (
                <div key={mill.id} className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{mill.name}</h4>
                    <span className="text-xs px-2 py-1 bg-orange-200 text-orange-800 rounded">
                      {mill.trend}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Compliance: <span className="font-medium text-orange-600">{mill.compliance}%</span>
                    </span>
                    <span className="text-muted-foreground">
                      Issues: <span className="font-medium">{mill.issues}</span>
                    </span>
                  </div>
                  <Button variant="outline" size="sm" className="mt-3 w-full">
                    View Action Plan
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Institutional Supply Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Institutional Supply Performance</CardTitle>
          <CardDescription>Procurement and delivery metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {(data.institutionalSupply.procurementVolume / 1000).toFixed(0)}K
              </div>
              <div className="text-sm text-muted-foreground mt-1">kg Procured</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {data.institutionalSupply.contractsAwarded}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Contracts Awarded</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {data.institutionalSupply.onTimeDeliveryRate}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">On-Time Delivery</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {data.institutionalSupply.qualityIssueRate}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">Quality Issues</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {data.institutionalSupply.buyerSatisfaction}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Buyer Rating</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
