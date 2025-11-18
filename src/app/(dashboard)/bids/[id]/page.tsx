'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, X } from 'lucide-react';
import Link from 'next/link';

export default function BidDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [bid, setBid] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBidDetails();
  }, []);

  const fetchBidDetails = async () => {
    try {
      const response = await fetch(`/api/bids/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setBid(data.data.bid);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load bid details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch(`/api/bids/${params.id}/submit`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Bid submitted successfully' });
        fetchBidDetails();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleWithdraw = async () => {
    const reason = prompt('Please provide a reason for withdrawal:');
    if (!reason || reason.length < 10) {
      toast({
        title: 'Error',
        description: 'Withdrawal reason must be at least 10 characters',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`/api/bids/${params.id}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Bid withdrawn successfully' });
        fetchBidDetails();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading || !bid) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading bid details...</div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      DRAFT: 'secondary',
      SUBMITTED: 'default',
      SHORTLISTED: 'default',
      AWARDED: 'default',
      NOT_SELECTED: 'outline',
      WITHDRAWN: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Bid for {bid.rfp?.referenceNumber}</h1>
            {getStatusBadge(bid.status)}
          </div>
          <p className="text-muted-foreground mt-1">{bid.rfp?.title}</p>
        </div>
        <div className="flex gap-2">
          {bid.status === 'DRAFT' && (
            <Button onClick={handleSubmit}>
              <Send className="mr-2 h-4 w-4" />
              Submit Bid
            </Button>
          )}
          {['DRAFT', 'SUBMITTED', 'SHORTLISTED'].includes(bid.status) && (
            <Button variant="destructive" onClick={handleWithdraw}>
              <X className="mr-2 h-4 w-4" />
              Withdraw
            </Button>
          )}
        </div>
      </div>

      {/* Pricing Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Bid Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Unit Price</p>
              <p className="text-2xl font-bold">₦{bid.unitPrice?.toLocaleString()}/MT</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Bid Amount</p>
              <p className="text-2xl font-bold">₦{bid.totalBidAmount?.toLocaleString()}</p>
            </div>
            {bid.evaluationScore && (
              <div>
                <p className="text-sm text-muted-foreground">Evaluation Score</p>
                <p className="text-2xl font-bold">{bid.evaluationScore.toFixed(1)}/100</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bid Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Bid Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label>Price Validity</Label>
              <p className="font-medium">{bid.priceValidity} days</p>
            </div>
            <div>
              <Label>Delivery Method</Label>
              <p className="font-medium">{bid.deliveryMethod?.replace('_', ' ')}</p>
            </div>
            <div>
              <Label>Lead Time</Label>
              <p className="font-medium">{bid.leadTime} days</p>
            </div>
            <div>
              <Label>Payment Terms</Label>
              <p className="font-medium">{bid.paymentTerms?.replace('_', ' ')}</p>
            </div>
            <div>
              <Label>Production Capacity</Label>
              <p className="font-medium">{bid.productionCapacity || 'N/A'} MT/month</p>
            </div>
            <div>
              <Label>Sample Available</Label>
              <p className="font-medium">{bid.sampleAvailable ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {bid.qualityCertificates && (
            <div>
              <Label>Quality Certificates</Label>
              <p className="font-medium">{bid.qualityCertificates}</p>
            </div>
          )}

          {bid.deliverySchedule && (
            <div>
              <Label>Delivery Schedule</Label>
              <p className="whitespace-pre-wrap">{bid.deliverySchedule}</p>
            </div>
          )}

          {bid.technicalProposal && (
            <div>
              <Label>Technical Proposal</Label>
              <p className="whitespace-pre-wrap">{bid.technicalProposal}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* RFP Information */}
      <Card>
        <CardHeader>
          <CardTitle>RFP Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Commodity</Label>
              <p className="font-medium">{bid.rfp?.commodity}</p>
            </div>
            <div>
              <Label>Total Volume</Label>
              <p className="font-medium">{bid.rfp?.totalVolume} MT</p>
            </div>
            <div>
              <Label>Bid Deadline</Label>
              <p className="font-medium">
                {bid.rfp?.bidDeadline && new Date(bid.rfp.bidDeadline).toLocaleString()}
              </p>
            </div>
            <div>
              <Label>Buyer</Label>
              <p className="font-medium">{bid.rfp?.buyer?.organizationName || 'N/A'}</p>
            </div>
          </div>

          <div className="mt-4">
            <Link href={`/rfps/${bid.rfpId}`}>
              <Button variant="outline">View Full RFP</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm text-muted-foreground">{children}</label>;
}
