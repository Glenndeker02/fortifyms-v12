'use client';

import { useState } from 'react';
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
import { Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Basic Info', description: 'RFP details and commodity' },
  { id: 2, title: 'Requirements', description: 'Quality specs and delivery' },
  { id: 3, title: 'Evaluation', description: 'Criteria and terms' },
  { id: 4, title: 'Review', description: 'Final review and submit' },
];

export default function CreateRFPPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    commodity: 'MAIZE',
    totalVolume: '',
    unitPackaging: '',
    budgetRange: '',
    bidDeadline: '',
    deliveryDeadline: '',
    description: '',

    // Quality specs
    moistureContent: '',
    grainSize: '',
    purity: '',
    additionalSpecs: '',

    // Delivery
    deliveryLocation: '',
    deliverySchedule: 'SINGLE',
    preferredPaymentTerms: 'NET_30',

    // Evaluation criteria
    priceWeight: '40',
    qualityWeight: '30',
    deliveryWeight: '15',
    capacityWeight: '10',
    trackRecordWeight: '5',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.title || !formData.totalVolume || !formData.bidDeadline) {
          toast({
            title: 'Validation Error',
            description: 'Please fill in all required fields',
            variant: 'destructive',
          });
          return false;
        }
        break;
      case 2:
        if (!formData.deliveryLocation || !formData.deliveryDeadline) {
          toast({
            title: 'Validation Error',
            description: 'Please fill in delivery details',
            variant: 'destructive',
          });
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/rfps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          commodity: formData.commodity,
          totalVolume: parseFloat(formData.totalVolume),
          unitPackaging: formData.unitPackaging,
          budgetRange: formData.budgetRange,
          bidDeadline: new Date(formData.bidDeadline).toISOString(),
          deliveryDeadline: new Date(formData.deliveryDeadline).toISOString(),
          description: formData.description,
          qualitySpecs: JSON.stringify({
            moistureContent: formData.moistureContent,
            grainSize: formData.grainSize,
            purity: formData.purity,
            additional: formData.additionalSpecs,
          }),
          deliveryLocation: formData.deliveryLocation,
          deliverySchedule: formData.deliverySchedule,
          preferredPaymentTerms: formData.preferredPaymentTerms,
          evaluationCriteria: {
            price: { weight: parseInt(formData.priceWeight) },
            quality: { weight: parseInt(formData.qualityWeight) },
            delivery: { weight: parseInt(formData.deliveryWeight) },
            capacity: { weight: parseInt(formData.capacityWeight) },
            trackRecord: { weight: parseInt(formData.trackRecordWeight) },
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create RFP');
      }

      toast({
        title: 'Success',
        description: 'RFP created successfully',
      });

      router.push(`/rfps/${data.data.rfp.id}`);
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

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    currentStep >= step.id
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-muted-foreground text-muted-foreground'
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Request for Proposal (RFP)</CardTitle>
          <CardDescription>
            Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">RFP Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Procurement of Maize for School Feeding Program"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="commodity">Commodity *</Label>
                    <Select value={formData.commodity} onValueChange={(v) => handleChange('commodity', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MAIZE">Maize</SelectItem>
                        <SelectItem value="SORGHUM">Sorghum</SelectItem>
                        <SelectItem value="MILLET">Millet</SelectItem>
                        <SelectItem value="RICE">Rice</SelectItem>
                        <SelectItem value="WHEAT">Wheat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="totalVolume">Total Volume (MT) *</Label>
                    <Input
                      id="totalVolume"
                      type="number"
                      placeholder="e.g., 1000"
                      value={formData.totalVolume}
                      onChange={(e) => handleChange('totalVolume', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unitPackaging">Unit Packaging</Label>
                    <Input
                      id="unitPackaging"
                      placeholder="e.g., 50kg bags"
                      value={formData.unitPackaging}
                      onChange={(e) => handleChange('unitPackaging', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budgetRange">Budget Range (₦)</Label>
                    <Input
                      id="budgetRange"
                      placeholder="e.g., 50-60 million"
                      value={formData.budgetRange}
                      onChange={(e) => handleChange('budgetRange', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bidDeadline">Bid Deadline *</Label>
                    <Input
                      id="bidDeadline"
                      type="datetime-local"
                      value={formData.bidDeadline}
                      onChange={(e) => handleChange('bidDeadline', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deliveryDeadline">Delivery Deadline *</Label>
                    <Input
                      id="deliveryDeadline"
                      type="date"
                      value={formData.deliveryDeadline}
                      onChange={(e) => handleChange('deliveryDeadline', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your requirements, intended use, and any special conditions..."
                    rows={4}
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Requirements */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Quality Specifications</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="moistureContent">Moisture Content (%)</Label>
                    <Input
                      id="moistureContent"
                      placeholder="e.g., Max 13.5"
                      value={formData.moistureContent}
                      onChange={(e) => handleChange('moistureContent', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grainSize">Grain Size</Label>
                    <Input
                      id="grainSize"
                      placeholder="e.g., Medium to Large"
                      value={formData.grainSize}
                      onChange={(e) => handleChange('grainSize', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purity">Purity (%)</Label>
                    <Input
                      id="purity"
                      placeholder="e.g., Min 98"
                      value={formData.purity}
                      onChange={(e) => handleChange('purity', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additionalSpecs">Additional Specifications</Label>
                  <Textarea
                    id="additionalSpecs"
                    placeholder="Any other quality requirements, certifications, or standards..."
                    rows={3}
                    value={formData.additionalSpecs}
                    onChange={(e) => handleChange('additionalSpecs', e.target.value)}
                  />
                </div>

                <h3 className="text-lg font-semibold pt-4">Delivery Requirements</h3>
                <div className="space-y-2">
                  <Label htmlFor="deliveryLocation">Delivery Location *</Label>
                  <Textarea
                    id="deliveryLocation"
                    placeholder="Full delivery address including city and state..."
                    rows={2}
                    value={formData.deliveryLocation}
                    onChange={(e) => handleChange('deliveryLocation', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deliverySchedule">Delivery Schedule</Label>
                    <Select
                      value={formData.deliverySchedule}
                      onValueChange={(v) => handleChange('deliverySchedule', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SINGLE">Single Delivery</SelectItem>
                        <SelectItem value="MULTIPLE">Multiple Deliveries</SelectItem>
                        <SelectItem value="SCHEDULED">Scheduled Deliveries</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferredPaymentTerms">Payment Terms</Label>
                    <Select
                      value={formData.preferredPaymentTerms}
                      onValueChange={(v) => handleChange('preferredPaymentTerms', v)}
                    >
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
              </div>
            )}

            {/* Step 3: Evaluation */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Bid Evaluation Criteria</h3>
                <p className="text-sm text-muted-foreground">
                  Define how bids will be evaluated. Total weight should equal 100%.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <Label className="w-40">Price</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.priceWeight}
                      onChange={(e) => handleChange('priceWeight', e.target.value)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <Label className="w-40">Quality</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.qualityWeight}
                      onChange={(e) => handleChange('qualityWeight', e.target.value)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <Label className="w-40">Delivery Capability</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.deliveryWeight}
                      onChange={(e) => handleChange('deliveryWeight', e.target.value)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <Label className="w-40">Production Capacity</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.capacityWeight}
                      onChange={(e) => handleChange('capacityWeight', e.target.value)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <Label className="w-40">Track Record</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.trackRecordWeight}
                      onChange={(e) => handleChange('trackRecordWeight', e.target.value)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>

                  <div className="flex items-center gap-4 pt-2 border-t">
                    <Label className="w-40 font-semibold">Total Weight</Label>
                    <span className="w-24 font-semibold">
                      {parseInt(formData.priceWeight) +
                        parseInt(formData.qualityWeight) +
                        parseInt(formData.deliveryWeight) +
                        parseInt(formData.capacityWeight) +
                        parseInt(formData.trackRecordWeight)}
                    </span>
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Review Your RFP</h3>

                <div className="space-y-3 border rounded-lg p-4">
                  <div>
                    <Label className="text-muted-foreground">Title</Label>
                    <p className="font-medium">{formData.title}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Commodity</Label>
                      <p className="font-medium">{formData.commodity}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Volume</Label>
                      <p className="font-medium">{formData.totalVolume} MT</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Bid Deadline</Label>
                      <p className="font-medium">
                        {new Date(formData.bidDeadline).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Delivery Deadline</Label>
                      <p className="font-medium">
                        {new Date(formData.deliveryDeadline).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Delivery Location</Label>
                    <p className="font-medium">{formData.deliveryLocation}</p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Payment Terms</Label>
                    <p className="font-medium">
                      {formData.preferredPaymentTerms.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  By creating this RFP, you confirm that all information is accurate and
                  complete. The RFP will be saved as a draft and can be published later.
                </p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              {currentStep < STEPS.length ? (
                <Button type="button" onClick={handleNext}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create RFP
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
