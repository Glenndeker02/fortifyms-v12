'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { batchLogSchema } from '@/lib/validations';
import { z } from 'zod';

type BatchFormData = z.infer<typeof batchLogSchema>;

const PRODUCTION_LINES = ['Line 1', 'Line 2', 'Line 3', 'Line 4'];

const CROP_TYPES = [
  'Parboiled Rice',
  'White Rice',
  'Whole Grain Maize',
  'Refined Maize Flour',
  'Wheat Flour',
];

const PRODUCT_TYPES = [
  'Fortified Parboiled Rice',
  'Fortified White Rice',
  'Fortified Maize Flour',
  'Fortified Wheat Flour',
];

const PREMIX_TYPES = [
  'Rice Premix Standard',
  'Maize Premix Standard',
  'Wheat Premix Standard',
  'Custom Premix',
];

export default function NewBatchPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mills, setMills] = useState<Array<{ id: string; name: string; code: string }>>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BatchFormData>({
    resolver: zodResolver(batchLogSchema),
    defaultValues: {
      millId: session?.user?.millId || '',
    },
  });

  const inputWeight = watch('inputWeight');
  const premixDosingRate = watch('premixDosingRate');

  useEffect(() => {
    // Fetch mills for selection (FWGA staff only)
    if (
      session?.user?.role === 'FWGA_INSPECTOR' ||
      session?.user?.role === 'FWGA_PROGRAM_MANAGER' ||
      session?.user?.role === 'SYSTEM_ADMIN'
    ) {
      fetchMills();
    }
  }, [session]);

  useEffect(() => {
    // Auto-calculate expected premix when input weight or dosing rate changes
    if (inputWeight && premixDosingRate) {
      const expected = (inputWeight * premixDosingRate) / 1000; // Convert to kg
      setValue('expectedPremix', Number(expected.toFixed(4)));
    }
  }, [inputWeight, premixDosingRate, setValue]);

  const fetchMills = async () => {
    try {
      const response = await fetch('/api/mills');
      const data = await response.json();
      if (data.success) {
        setMills(data.data.mills || []);
      }
    } catch (error) {
      console.error('Error fetching mills:', error);
    }
  };

  const onSubmit = async (data: BatchFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to create batch log');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/batches/${result.data.id}`);
      }, 1500);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if user can create batches
  const canCreateBatch =
    session?.user?.role === 'MILL_OPERATOR' ||
    session?.user?.role === 'MILL_MANAGER' ||
    session?.user?.role === 'SYSTEM_ADMIN';

  if (!canCreateBatch) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            Only mill staff can create batch logs.
          </p>
          <Button asChild>
            <Link href="/batches">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Batches
            </Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/batches">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Log New Batch</h1>
            <p className="text-muted-foreground">
              Record production batch details and premix usage
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            {/* Alerts */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Batch logged successfully! Redirecting...
                </AlertDescription>
              </Alert>
            )}

            {/* Production Details */}
            <Card>
              <CardHeader>
                <CardTitle>Production Details</CardTitle>
                <CardDescription>
                  Basic information about the production run
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Mill Selection (for FWGA staff) */}
                  {!session?.user?.millId && (
                    <div className="space-y-2">
                      <Label htmlFor="millId">
                        Mill <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        onValueChange={(value) => setValue('millId', value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger
                          id="millId"
                          className={errors.millId ? 'border-destructive' : ''}
                        >
                          <SelectValue placeholder="Select mill" />
                        </SelectTrigger>
                        <SelectContent>
                          {mills.map((mill) => (
                            <SelectItem key={mill.id} value={mill.id}>
                              {mill.name} ({mill.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.millId && (
                        <p className="text-sm text-destructive">{errors.millId.message}</p>
                      )}
                    </div>
                  )}

                  {/* Production Line */}
                  <div className="space-y-2">
                    <Label htmlFor="productionLine">
                      Production Line <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      onValueChange={(value) => setValue('productionLine', value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger
                        id="productionLine"
                        className={errors.productionLine ? 'border-destructive' : ''}
                      >
                        <SelectValue placeholder="Select line" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCTION_LINES.map((line) => (
                          <SelectItem key={line} value={line}>
                            {line}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.productionLine && (
                      <p className="text-sm text-destructive">
                        {errors.productionLine.message}
                      </p>
                    )}
                  </div>

                  {/* Crop Type */}
                  <div className="space-y-2">
                    <Label htmlFor="cropType">
                      Crop Type <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      onValueChange={(value) => setValue('cropType', value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger
                        id="cropType"
                        className={errors.cropType ? 'border-destructive' : ''}
                      >
                        <SelectValue placeholder="Select crop type" />
                      </SelectTrigger>
                      <SelectContent>
                        {CROP_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.cropType && (
                      <p className="text-sm text-destructive">{errors.cropType.message}</p>
                    )}
                  </div>

                  {/* Product Type */}
                  <div className="space-y-2">
                    <Label htmlFor="productType">
                      Product Type <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      onValueChange={(value) => setValue('productType', value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger
                        id="productType"
                        className={errors.productType ? 'border-destructive' : ''}
                      >
                        <SelectValue placeholder="Select product type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.productType && (
                      <p className="text-sm text-destructive">{errors.productType.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weight Measurements */}
            <Card>
              <CardHeader>
                <CardTitle>Weight Measurements</CardTitle>
                <CardDescription>Input and output weights in kilograms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="inputWeight">
                      Input Weight (kg) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="inputWeight"
                      type="number"
                      step="0.01"
                      placeholder="10000"
                      {...register('inputWeight', { valueAsNumber: true })}
                      disabled={isSubmitting}
                      className={errors.inputWeight ? 'border-destructive' : ''}
                    />
                    {errors.inputWeight && (
                      <p className="text-sm text-destructive">{errors.inputWeight.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="outputWeight">
                      Output Weight (kg) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="outputWeight"
                      type="number"
                      step="0.01"
                      placeholder="9500"
                      {...register('outputWeight', { valueAsNumber: true })}
                      disabled={isSubmitting}
                      className={errors.outputWeight ? 'border-destructive' : ''}
                    />
                    {errors.outputWeight && (
                      <p className="text-sm text-destructive">{errors.outputWeight.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Premix Details */}
            <Card>
              <CardHeader>
                <CardTitle>Premix Details</CardTitle>
                <CardDescription>Premix type, dosing rate, and usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="premixType">
                      Premix Type <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      onValueChange={(value) => setValue('premixType', value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger
                        id="premixType"
                        className={errors.premixType ? 'border-destructive' : ''}
                      >
                        <SelectValue placeholder="Select premix type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PREMIX_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.premixType && (
                      <p className="text-sm text-destructive">{errors.premixType.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="premixBatchNumber">
                      Premix Batch Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="premixBatchNumber"
                      placeholder="PM-2025-001"
                      {...register('premixBatchNumber')}
                      disabled={isSubmitting}
                      className={errors.premixBatchNumber ? 'border-destructive' : ''}
                    />
                    {errors.premixBatchNumber && (
                      <p className="text-sm text-destructive">
                        {errors.premixBatchNumber.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="premixDosingRate">
                      Dosing Rate (g/MT) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="premixDosingRate"
                      type="number"
                      step="0.0001"
                      placeholder="2.0"
                      {...register('premixDosingRate', { valueAsNumber: true })}
                      disabled={isSubmitting}
                      className={errors.premixDosingRate ? 'border-destructive' : ''}
                    />
                    {errors.premixDosingRate && (
                      <p className="text-sm text-destructive">
                        {errors.premixDosingRate.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Grams of premix per metric ton of product
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expectedPremix">Expected Premix (kg)</Label>
                    <Input
                      id="expectedPremix"
                      type="number"
                      step="0.0001"
                      {...register('expectedPremix', { valueAsNumber: true })}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Auto-calculated from input weight and dosing rate
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="actualPremixUsed">
                      Actual Premix Used (kg) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="actualPremixUsed"
                      type="number"
                      step="0.0001"
                      placeholder="20.0"
                      {...register('actualPremixUsed', { valueAsNumber: true })}
                      disabled={isSubmitting}
                      className={errors.actualPremixUsed ? 'border-destructive' : ''}
                    />
                    {errors.actualPremixUsed && (
                      <p className="text-sm text-destructive">
                        {errors.actualPremixUsed.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
                <CardDescription>Optional observations or comments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    {...register('notes')}
                    disabled={isSubmitting}
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter any additional observations, issues, or comments..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4">
              <Button variant="outline" asChild disabled={isSubmitting}>
                <Link href="/batches">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting || success}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {success ? 'Batch Logged!' : 'Log Batch'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
