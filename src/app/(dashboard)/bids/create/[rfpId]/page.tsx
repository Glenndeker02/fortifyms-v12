'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CreateBidPage({ params }: { params: { rfpId: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rfp, setRfp] = useState<any>(null);

  const [formData, setFormData] = useState({
    unitPrice: '',
    priceValidity: '',
    deliveryMethod: 'MILL_PICKUP',
    leadTime: '',
    paymentTerms: 'NET_30',
    qualityCertificates: '',
    productionCapacity: '',
    technicalProposal: '',
    deliverySchedule: '',
    sampleAvailable: 'true',
  });

  useEffect(() => {
    fetchRFP();
  }, []);

  const fetchRFP = async () => {
    try {
      const response = await fetch(`/api/rfps/${params.rfpId}`);
      const data = await response.json();

      if (data.success) {
        setRfp(data.data.rfp);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load RFP details',
        variant: 'destructive',
      });
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const calculateTotalBid = () => {
    if (!formData.unitPrice || !rfp) return 0;
    return parseFloat(formData.unitPrice) * rfp.totalVolume;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rfpId: params.rfpId,
          unitPrice: parseFloat(formData.unitPrice),
          totalBidAmount: calculateTotalBid(),
          priceValidity: parseInt(formData.priceValidity),
          deliveryMethod: formData.deliveryMethod,
          leadTime: parseInt(formData.leadTime),
          paymentTerms: formData.paymentTerms,
          qualityCertificates: formData.qualityCertificates,
          productionCapacity: formData.productionCapacity
            ? parseFloat(formData.productionCapacity)
            : undefined,
          technicalProposal: formData.technicalProposal,
          deliverySchedule: formData.deliverySchedule,
          sampleAvailable: formData.sampleAvailable === 'true',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create bid');
      }

      toast({
        title: 'Success',
        description: 'Bid created successfully. You can submit it after review.',
      });

      router.push(`/bids/${data.data.bid.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!rfp) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading RFP details...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* RFP Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Submit Bid for RFP</CardTitle>
          <CardDescription>{rfp.title}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Reference:</span>
              <p className="font-medium">{rfp.referenceNumber}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Commodity:</span>
              <p className="font-medium">{rfp.commodity}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Volume:</span>
              <p className="font-medium">{rfp.totalVolume} MT</p>
            </div>
          </div>

          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Bid deadline: {new Date(rfp.bidDeadline).toLocaleString()}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Bid Form */}
      <Card>
        <CardHeader>
          <CardTitle>Bid Details</CardTitle>
          <CardDescription>Complete all required fields to submit your bid</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Unit Price (₦/MT) *</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    required
                    value={formData.unitPrice}
                    onChange={(e) => handleChange('unitPrice', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priceValidity">Price Validity (days) *</Label>
                  <Input
                    id="priceValidity"
                    type="number"
                    required
                    value={formData.priceValidity}
                    onChange={(e) => handleChange('priceValidity', e.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Bid Amount</p>
                <p className="text-2xl font-bold">₦{calculateTotalBid().toLocaleString()}</p>
              </div>
            </div>

            {/* Delivery */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Delivery Terms</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deliveryMethod">Delivery Method *</Label>
                  <Select value={formData.deliveryMethod} onValueChange={(v) => handleChange('deliveryMethod', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MILL_PICKUP">Mill Pickup</SelectItem>
                      <SelectItem value="BUYER_LOCATION">Deliver to Buyer</SelectItem>
                      <SelectItem value="DESIGNATED_WAREHOUSE">Designated Warehouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leadTime">Lead Time (days) *</Label>
                  <Input
                    id="leadTime"
                    type="number"
                    required
                    value={formData.leadTime}
                    onChange={(e) => handleChange('leadTime', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliverySchedule">Delivery Schedule</Label>
                <Textarea
                  id="deliverySchedule"
                  placeholder="Describe your proposed delivery schedule..."
                  rows={3}
                  value={formData.deliverySchedule}
                  onChange={(e) => handleChange('deliverySchedule', e.target.value)}
                />
              </div>
            </div>

            {/* Technical Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Technical Proposal</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="productionCapacity">Production Capacity (MT/month)</Label>
                  <Input
                    id="productionCapacity"
                    type="number"
                    value={formData.productionCapacity}
                    onChange={(e) => handleChange('productionCapacity', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sampleAvailable">Sample Available?</Label>
                  <Select value={formData.sampleAvailable} onValueChange={(v) => handleChange('sampleAvailable', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qualityCertificates">Quality Certificates</Label>
                <Input
                  id="qualityCertificates"
                  placeholder="e.g., ISO 9001, NAFDAC, SON"
                  value={formData.qualityCertificates}
                  onChange={(e) => handleChange('qualityCertificates', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="technicalProposal">Technical Proposal</Label>
                <Textarea
                  id="technicalProposal"
                  placeholder="Describe your technical approach, quality assurance, and any value-added services..."
                  rows={4}
                  value={formData.technicalProposal}
                  onChange={(e) => handleChange('technicalProposal', e.target.value)}
                />
              </div>
            </div>

            {/* Payment Terms */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Payment Terms</h3>
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Preferred Payment Terms</Label>
                <Select value={formData.paymentTerms} onValueChange={(v) => handleChange('paymentTerms', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADVANCE">Advance Payment</SelectItem>
                    <SelectItem value="NET_30">Net 30 Days</SelectItem>
                    <SelectItem value="NET_60">Net 60 Days</SelectItem>
                    <SelectItem value="ON_DELIVERY">On Delivery</SelectItem>
                    <SelectItem value="INSTALLMENT">Installment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Bid (Draft)
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
