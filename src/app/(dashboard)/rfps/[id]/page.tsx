'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  Package,
  FileText,
  DollarSign,
  TrendingUp,
  Award,
  Eye,
  X,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

interface RFPDetails {
  rfp: any;
  bids: any[];
}

export default function RFPDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<RFPDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRFPDetails();
  }, []);

  const fetchRFPDetails = async () => {
    try {
      const response = await fetch(`/api/rfps/${params.id}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load RFP details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      const response = await fetch(`/api/rfps/${params.id}/publish`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'RFP published successfully' });
        fetchRFPDetails();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleClose = async () => {
    try {
      const response = await fetch(`/api/rfps/${params.id}/close`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'RFP closed successfully' });
        fetchRFPDetails();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading || !data) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading RFP details...</div>
      </div>
    );
  }

  const { rfp, bids } = data;
  const qualitySpecs = rfp.qualitySpecs ? JSON.parse(rfp.qualitySpecs) : {};
  const evaluationCriteria = rfp.evaluationCriteria
    ? JSON.parse(rfp.evaluationCriteria)
    : {};

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      DRAFT: 'secondary',
      OPEN: 'default',
      CLOSED: 'outline',
      AWARDED: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{rfp.title}</h1>
            {getStatusBadge(rfp.status)}
          </div>
          <p className="text-muted-foreground">{rfp.referenceNumber}</p>
        </div>

        <div className="flex gap-2">
          {rfp.status === 'DRAFT' && (
            <Button onClick={handlePublish}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Publish RFP
            </Button>
          )}
          {rfp.status === 'OPEN' && (
            <Button onClick={handleClose} variant="outline">
              <X className="mr-2 h-4 w-4" />
              Close Bidding
            </Button>
          )}
          {rfp.status === 'CLOSED' && bids.length > 0 && (
            <Link href={`/rfps/${params.id}/evaluate`}>
              <Button>
                <TrendingUp className="mr-2 h-4 w-4" />
                Evaluate Bids
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commodity</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rfp.commodity}</div>
            <p className="text-xs text-muted-foreground">{rfp.totalVolume} MT</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rfp.budgetRange || 'TBD'}</div>
            <p className="text-xs text-muted-foreground">Estimated range</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bids Received</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bids.length}</div>
            <p className="text-xs text-muted-foreground">
              {bids.filter((b) => b.status === 'SUBMITTED').length} submitted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deadline</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {new Date(rfp.bidDeadline).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(rfp.bidDeadline).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="specifications">Specifications</TabsTrigger>
          <TabsTrigger value="bids">Bids ({bids.length})</TabsTrigger>
          <TabsTrigger value="evaluation">Evaluation Criteria</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>RFP Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-muted-foreground">Organization</Label>
                  <p className="font-medium">{rfp.buyer?.organizationName || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Volume</Label>
                  <p className="font-medium">{rfp.totalVolume} MT</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Unit Packaging</Label>
                  <p className="font-medium">{rfp.unitPackaging || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Delivery Deadline</Label>
                  <p className="font-medium">
                    {new Date(rfp.deliveryDeadline).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Delivery Schedule</Label>
                  <p className="font-medium">{rfp.deliverySchedule?.replace('_', ' ') || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Terms</Label>
                  <p className="font-medium">
                    {rfp.preferredPaymentTerms?.replace('_', ' ') || 'N/A'}
                  </p>
                </div>
              </div>

              {rfp.description && (
                <div className="pt-4">
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-2 whitespace-pre-wrap">{rfp.description}</p>
                </div>
              )}

              <div className="pt-4">
                <Label className="text-muted-foreground">Delivery Location</Label>
                <p className="mt-2">{rfp.deliveryLocation}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specifications">
          <Card>
            <CardHeader>
              <CardTitle>Quality Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(qualitySpecs).length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(qualitySpecs).map(([key, value]) => (
                    <div key={key}>
                      <Label className="text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                      <p className="font-medium">{String(value)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No quality specifications defined</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bids">
          {bids.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No bids received yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {bids.map((bid) => (
                <Card key={bid.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{bid.mill?.name || 'Mill'}</h4>
                          <Badge>{bid.status}</Badge>
                          {bid.evaluationScore && (
                            <Badge variant="outline">Score: {bid.evaluationScore.toFixed(1)}</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Unit Price:</span>
                            <p className="font-medium">₦{bid.unitPrice?.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total Amount:</span>
                            <p className="font-medium">₦{bid.totalBidAmount?.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Lead Time:</span>
                            <p className="font-medium">{bid.leadTime} days</p>
                          </div>
                        </div>
                      </div>
                      <Link href={`/bids/${bid.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="evaluation">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Criteria</CardTitle>
              <CardDescription>Weighted scoring for bid evaluation</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(evaluationCriteria).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(evaluationCriteria).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex items-center justify-between p-3 border rounded">
                      <span className="font-medium capitalize">{key}</span>
                      <div className="flex items-center gap-4">
                        <div className="w-64 bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${value.weight}%` }}
                          />
                        </div>
                        <span className="font-bold w-12 text-right">{value.weight}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No evaluation criteria defined</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={`text-sm font-medium ${className || ''}`}>{children}</label>;
}
