'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  DollarSign,
  Calendar,
  Truck,
  FileText,
  Building2,
} from 'lucide-react';

export default function PurchaseOrderDetailPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, []);

  const fetchOrderDetails = async () => {
    try {
      const response = await fetch(`/api/purchase-orders/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setOrder(data.data.order);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load order details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading order details...</div>
      </div>
    );
  }

  const productSpecs = order.productSpecs ? JSON.parse(order.productSpecs) : {};

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{order.poNumber}</h1>
          <Badge>{order.status.replace('_', ' ')}</Badge>
        </div>
        <p className="text-muted-foreground">Purchase Order Details</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commodity</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productSpecs.commodity || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">{order.quantity} MT</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{order.totalAmount?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ₦{order.unitPrice?.toLocaleString()}/MT
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {order.expectedDeliveryDate
                ? new Date(order.expectedDeliveryDate).toLocaleDateString()
                : 'TBD'}
            </div>
            {order.actualDeliveryDate && (
              <p className="text-xs text-muted-foreground">
                Delivered: {new Date(order.actualDeliveryDate).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{order.status.replace('_', ' ')}</div>
            <p className="text-xs text-muted-foreground">
              Created: {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Order Details</TabsTrigger>
          <TabsTrigger value="parties">Parties</TabsTrigger>
          <TabsTrigger value="delivery">Delivery & Payment</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Product Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label>Commodity</Label>
                  <p className="font-medium">{productSpecs.commodity || 'N/A'}</p>
                </div>
                <div>
                  <Label>Total Volume</Label>
                  <p className="font-medium">{productSpecs.totalVolume || order.quantity} MT</p>
                </div>
                <div>
                  <Label>Unit Packaging</Label>
                  <p className="font-medium">{productSpecs.unitPackaging || 'N/A'}</p>
                </div>
                <div>
                  <Label>Unit Price</Label>
                  <p className="font-medium">₦{order.unitPrice?.toLocaleString()}</p>
                </div>
              </div>

              {productSpecs.qualitySpecs && (
                <div className="pt-4">
                  <Label>Quality Specifications</Label>
                  <pre className="mt-2 p-4 bg-muted rounded text-sm">
                    {JSON.stringify(
                      typeof productSpecs.qualitySpecs === 'string'
                        ? JSON.parse(productSpecs.qualitySpecs)
                        : productSpecs.qualitySpecs,
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parties">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Buyer
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.buyer ? (
                  <div className="space-y-2">
                    <div>
                      <Label>Organization</Label>
                      <p className="font-medium">{order.buyer.organizationName}</p>
                    </div>
                    <div>
                      <Label>Type</Label>
                      <p className="font-medium">{order.buyer.organizationType?.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <Label>Contact</Label>
                      <p className="font-medium">{order.buyer.contactPerson}</p>
                      <p className="text-sm text-muted-foreground">{order.buyer.contactEmail}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No buyer information</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Mill
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.mill ? (
                  <div className="space-y-2">
                    <div>
                      <Label>Mill Name</Label>
                      <p className="font-medium">{order.mill.name}</p>
                    </div>
                    <div>
                      <Label>Mill Code</Label>
                      <p className="font-medium">{order.mill.code}</p>
                    </div>
                    <div>
                      <Label>Location</Label>
                      <p className="font-medium">{order.mill.city}, {order.mill.state}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No mill information</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="delivery">
          <Card>
            <CardHeader>
              <CardTitle>Delivery & Payment Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label>Delivery Schedule</Label>
                  <p className="font-medium">{order.deliverySchedule || 'N/A'}</p>
                </div>
                <div>
                  <Label>Payment Terms</Label>
                  <p className="font-medium">{order.paymentTerms?.replace('_', ' ') || 'N/A'}</p>
                </div>
                <div>
                  <Label>Expected Delivery</Label>
                  <p className="font-medium">
                    {order.expectedDeliveryDate
                      ? new Date(order.expectedDeliveryDate).toLocaleDateString()
                      : 'TBD'}
                  </p>
                </div>
                {order.actualDeliveryDate && (
                  <div>
                    <Label>Actual Delivery</Label>
                    <p className="font-medium">
                      {new Date(order.actualDeliveryDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {order.qualityStandards && (
                <div>
                  <Label>Quality Standards</Label>
                  <p className="whitespace-pre-wrap">{order.qualityStandards}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm text-muted-foreground block mb-1">{children}</label>;
}
