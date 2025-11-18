'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  ShoppingCart,
  Truck,
  TrendingUp,
  Plus,
  Eye,
  Clock,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  activeRFPs: number;
  pendingBids: number;
  activeOrders: number;
  totalSpent: number;
}

interface RFP {
  id: string;
  referenceNumber: string;
  title: string;
  commodity: string;
  totalVolume: number;
  bidDeadline: string;
  status: string;
  bidsReceived: number;
}

interface Order {
  id: string;
  poNumber: string;
  commodity: string;
  quantity: number;
  totalAmount: number;
  status: string;
  expectedDeliveryDate: string;
}

export default function BuyerDashboardPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    activeRFPs: 0,
    pendingBids: 0,
    activeOrders: 0,
    totalSpent: 0,
  });
  const [rfps, setRfps] = useState<RFP[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch RFPs
      const rfpsResponse = await fetch('/api/rfps?limit=5');
      const rfpsData = await rfpsResponse.json();

      // Fetch Orders
      const ordersResponse = await fetch('/api/purchase-orders?limit=5');
      const ordersData = await ordersResponse.json();

      if (rfpsData.success) {
        setRfps(rfpsData.data.rfps);
        // Calculate stats from actual data
        const activeRFPs = rfpsData.data.rfps.filter(
          (rfp: RFP) => rfp.status === 'OPEN' || rfp.status === 'CLOSED'
        ).length;
        setStats((prev) => ({ ...prev, activeRFPs }));
      }

      if (ordersData.success) {
        setOrders(ordersData.data.orders);
        const activeOrders = ordersData.data.orders.filter(
          (order: Order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED'
        ).length;
        const totalSpent = ordersData.data.orders.reduce(
          (sum: number, order: Order) => sum + order.totalAmount,
          0
        );
        setStats((prev) => ({ ...prev, activeOrders, totalSpent }));
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      DRAFT: 'secondary',
      OPEN: 'default',
      CLOSED: 'outline',
      AWARDED: 'default',
      CONFIRMED: 'default',
      IN_PRODUCTION: 'default',
      IN_TRANSIT: 'default',
      DELIVERED: 'outline',
    };

    return <Badge variant={variants[status] || 'default'}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Buyer Dashboard</h1>
          <p className="text-muted-foreground">Manage your procurement activities</p>
        </div>
        <Link href="/rfps/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create RFP
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active RFPs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRFPs}</div>
            <p className="text-xs text-muted-foreground">Currently open for bidding</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Bids</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingBids}</div>
            <p className="text-xs text-muted-foreground">Awaiting evaluation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeOrders}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{stats.totalSpent.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">This fiscal year</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rfps" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rfps">Recent RFPs</TabsTrigger>
          <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="rfps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent RFPs</CardTitle>
              <CardDescription>Your latest procurement requests</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : rfps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No RFPs yet. Create your first RFP to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {rfps.map((rfp) => (
                    <div
                      key={rfp.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{rfp.title}</h4>
                          {getStatusBadge(rfp.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {rfp.referenceNumber} • {rfp.commodity} • {rfp.totalVolume} MT
                        </p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Deadline: {new Date(rfp.bidDeadline).toLocaleDateString()}</span>
                          <span>{rfp.bidsReceived} bids received</span>
                        </div>
                      </div>
                      <Link href={`/rfps/${rfp.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>Track your orders and deliveries</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No purchase orders yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{order.poNumber}</h4>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.commodity} • {order.quantity} MT • ₦
                          {order.totalAmount.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expected: {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Link href={`/purchase-orders/${order.id}`}>
                        <Button variant="outline" size="sm">
                          <Truck className="mr-2 h-4 w-4" />
                          Track
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
