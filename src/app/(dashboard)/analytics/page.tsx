'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Truck,
  AlertTriangle,
} from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsDashboardPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  const [procurementData, setProcurementData] = useState({
    totalRFPs: 45,
    totalBids: 187,
    totalOrders: 32,
    totalValue: 1250000000,
    rfpsByStatus: [
      { name: 'Open', value: 12, color: '#00C49F' },
      { name: 'Closed', value: 18, color: '#0088FE' },
      { name: 'Awarded', value: 15, color: '#FFBB28' },
    ],
    monthlyRFPs: [
      { month: 'Jan', count: 5, value: 45000000 },
      { month: 'Feb', count: 8, value: 78000000 },
      { month: 'Mar', count: 12, value: 112000000 },
      { month: 'Apr', count: 9, value: 95000000 },
      { month: 'May', count: 11, value: 105000000 },
    ],
  });

  const [logisticsData, setLogisticsData] = useState({
    totalTrips: 156,
    completedTrips: 142,
    activeTrips: 14,
    averageDeliveryTime: 2.3,
    onTimeDeliveries: 94.5,
    monthlyTrips: [
      { month: 'Jan', completed: 25, delayed: 2 },
      { month: 'Feb', completed: 28, delayed: 3 },
      { month: 'Mar', completed: 32, delayed: 1 },
      { month: 'Apr', completed: 30, delayed: 2 },
      { month: 'May', completed: 27, delayed: 1 },
    ],
  });

  const [iotData, setIotData] = useState({
    totalSensors: 48,
    activeSensors: 45,
    criticalAlerts: 3,
    warningAlerts: 12,
    equipmentHealth: [
      { name: 'Excellent', value: 25, color: '#00C49F' },
      { name: 'Good', value: 15, color: '#0088FE' },
      { name: 'Fair', value: 6, color: '#FFBB28' },
      { name: 'Poor', value: 2, color: '#FF8042' },
    ],
  });

  useEffect(() => {
    // In a real implementation, fetch actual analytics data
    setTimeout(() => setLoading(false), 1000);
  }, [timeRange]);

  const StatCard = ({
    title,
    value,
    change,
    icon: Icon,
    trend,
  }: {
    title: string;
    value: string | number;
    change: number;
    icon: any;
    trend: 'up' | 'down';
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          {trend === 'up' ? (
            <TrendingUp className="h-3 w-3 text-green-600" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-600" />
          )}
          <span className={trend === 'up' ? 'text-green-600' : 'text-red-600'}>
            {Math.abs(change)}%
          </span>{' '}
          from last period
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive business intelligence and insights</p>
        </div>

        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="procurement" className="space-y-6">
        <TabsList>
          <TabsTrigger value="procurement">Procurement</TabsTrigger>
          <TabsTrigger value="logistics">Logistics</TabsTrigger>
          <TabsTrigger value="iot">IoT & Sensors</TabsTrigger>
        </TabsList>

        {/* Procurement Analytics */}
        <TabsContent value="procurement" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Total RFPs"
              value={procurementData.totalRFPs}
              change={12.5}
              icon={Package}
              trend="up"
            />
            <StatCard
              title="Total Bids"
              value={procurementData.totalBids}
              change={8.3}
              icon={TrendingUp}
              trend="up"
            />
            <StatCard
              title="Active Orders"
              value={procurementData.totalOrders}
              change={-3.2}
              icon={Truck}
              trend="down"
            />
            <StatCard
              title="Total Value"
              value={`₦${(procurementData.totalValue / 1000000).toFixed(0)}M`}
              change={15.7}
              icon={DollarSign}
              trend="up"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>RFPs by Status</CardTitle>
                <CardDescription>Distribution of RFP statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={procurementData.rfpsByStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {procurementData.rfpsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly RFP Trends</CardTitle>
                <CardDescription>RFP count and value over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={procurementData.monthlyRFPs}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#0088FE" name="RFPs" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Procurement Value Trend</CardTitle>
              <CardDescription>Total procurement value by month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={procurementData.monthlyRFPs}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₦${Number(value).toLocaleString()}`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#00C49F"
                    strokeWidth={2}
                    name="Value (₦)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logistics Analytics */}
        <TabsContent value="logistics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Total Trips"
              value={logisticsData.totalTrips}
              change={5.2}
              icon={Truck}
              trend="up"
            />
            <StatCard
              title="Completed"
              value={logisticsData.completedTrips}
              change={4.8}
              icon={Package}
              trend="up"
            />
            <StatCard
              title="Active Now"
              value={logisticsData.activeTrips}
              change={12.5}
              icon={TrendingUp}
              trend="up"
            />
            <StatCard
              title="On-Time Rate"
              value={`${logisticsData.onTimeDeliveries}%`}
              change={2.3}
              icon={TrendingUp}
              trend="up"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Delivery Performance</CardTitle>
              <CardDescription>Completed vs delayed deliveries by month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={logisticsData.monthlyTrips}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" fill="#00C49F" name="On-Time" />
                  <Bar dataKey="delayed" fill="#FF8042" name="Delayed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IoT Analytics */}
        <TabsContent value="iot" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Total Sensors"
              value={iotData.totalSensors}
              change={0}
              icon={Package}
              trend="up"
            />
            <StatCard
              title="Active Sensors"
              value={iotData.activeSensors}
              change={2.2}
              icon={TrendingUp}
              trend="up"
            />
            <StatCard
              title="Critical Alerts"
              value={iotData.criticalAlerts}
              change={-25}
              icon={AlertTriangle}
              trend="down"
            />
            <StatCard
              title="Warning Alerts"
              value={iotData.warningAlerts}
              change={-15}
              icon={AlertTriangle}
              trend="down"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Equipment Health Distribution</CardTitle>
              <CardDescription>Overall health status of monitored equipment</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={iotData.equipmentHealth}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {iotData.equipmentHealth.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
