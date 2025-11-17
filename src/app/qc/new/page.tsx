'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { qcTestSchema, type QCTestInput } from '@/lib/validations';
import {
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Beaker,
  Package,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

export default function NewQCTestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const batchIdFromQuery = searchParams.get('batchId');
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QCTestInput>({
    resolver: zodResolver(qcTestSchema),
    defaultValues: {
      batchId: batchIdFromQuery || '',
      sampleCollectionPoint: 'MIDDLE',
      sampleCollectionTime: new Date(),
      testResults: [
        {
          testType: 'Iron Content',
          testDate: new Date(),
          testLocation: 'On-site Lab',
          resultValue: 0,
          unit: 'ppm',
          targetValue: 0,
          tolerancePercent: 10,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'testResults',
  });

  const canCreate =
    session?.user?.role === 'MILL_OPERATOR' ||
    session?.user?.role === 'MILL_MANAGER' ||
    session?.user?.role === 'FWGA_INSPECTOR' ||
    session?.user?.role === 'SYSTEM_ADMIN';

  useEffect(() => {
    if (!canCreate) {
      router.push('/qc');
    }
  }, [canCreate, router]);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/batches?status=QC_PENDING&limit=100');
      const data = await response.json();

      if (data.success) {
        setBatches(data.data.batches);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const onSubmit = async (data: QCTestInput) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch('/api/qc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to create QC test');
        return;
      }

      setSuccess(true);

      // Redirect to the QC test list after a short delay
      setTimeout(() => {
        router.push('/qc');
      }, 1500);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canCreate) {
    return null;
  }

  const testTypes = [
    'Iron Content',
    'Vitamin A',
    'Vitamin B1 (Thiamine)',
    'Vitamin B2 (Riboflavin)',
    'Vitamin B3 (Niacin)',
    'Vitamin B6',
    'Vitamin B12',
    'Folic Acid',
    'Zinc',
    'Moisture Content',
    'Protein Content',
    'Fat Content',
  ];

  const units = ['ppm', 'mg/kg', 'IU/kg', '%', 'μg/kg'];
  const testLocations = ['On-site Lab', 'External Lab', 'Field Testing'];
  const collectionPoints = ['START', 'MIDDLE', 'END', 'RANDOM'];
  const colorOptions = ['UNIFORM', 'SOMEWHAT_UNIFORM', 'NON_UNIFORM'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/qc')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Record QC Test</h1>
          <p className="text-muted-foreground mt-1">
            Create a new quality control test entry
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            QC test recorded successfully! Redirecting...
          </AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Batch Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Batch Information
            </CardTitle>
            <CardDescription>Select the batch to test</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="batchId">Batch *</Label>
              <Select
                value={watch('batchId')}
                onValueChange={(value) => setValue('batchId', value)}
                disabled={!!batchIdFromQuery}
              >
                <SelectTrigger id="batchId">
                  <SelectValue placeholder="Select a batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.batchId} - {batch.productType} ({batch.mill.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.batchId && (
                <p className="text-sm text-destructive mt-1">{errors.batchId.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sample Collection */}
        <Card>
          <CardHeader>
            <CardTitle>Sample Collection</CardTitle>
            <CardDescription>Information about the sample collected for testing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="sampleCollectionPoint">Collection Point *</Label>
                <Select
                  value={watch('sampleCollectionPoint')}
                  onValueChange={(value: any) => setValue('sampleCollectionPoint', value)}
                >
                  <SelectTrigger id="sampleCollectionPoint">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {collectionPoints.map((point) => (
                      <SelectItem key={point} value={point}>
                        {point}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.sampleCollectionPoint && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.sampleCollectionPoint.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="sampleCollectionTime">Collection Time *</Label>
                <Input
                  id="sampleCollectionTime"
                  type="datetime-local"
                  {...register('sampleCollectionTime', { valueAsDate: true })}
                />
                {errors.sampleCollectionTime && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.sampleCollectionTime.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="sampledBy">Sampled By *</Label>
                <Input
                  id="sampledBy"
                  {...register('sampledBy')}
                  placeholder="Name of person who collected sample"
                />
                {errors.sampledBy && (
                  <p className="text-sm text-destructive mt-1">{errors.sampledBy.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="sampleQuantity">Sample Quantity (kg) *</Label>
                <Input
                  id="sampleQuantity"
                  type="number"
                  step="0.01"
                  {...register('sampleQuantity', { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {errors.sampleQuantity && (
                  <p className="text-sm text-destructive mt-1">{errors.sampleQuantity.message}</p>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-4">Visual Inspection (Optional)</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="colorUniformity">Color Uniformity</Label>
                  <Select
                    value={watch('colorUniformity')}
                    onValueChange={(value: any) => setValue('colorUniformity', value)}
                  >
                    <SelectTrigger id="colorUniformity">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="odor">Odor</Label>
                  <Input id="odor" {...register('odor')} placeholder="Describe odor" />
                </div>

                <div>
                  <Label htmlFor="texture">Texture</Label>
                  <Input id="texture" {...register('texture')} placeholder="Describe texture" />
                </div>

                <div className="flex items-center space-x-2 mt-7">
                  <Checkbox
                    id="foreignMatterPresent"
                    checked={watch('foreignMatterPresent')}
                    onCheckedChange={(checked) => setValue('foreignMatterPresent', !!checked)}
                  />
                  <Label htmlFor="foreignMatterPresent" className="cursor-pointer">
                    Foreign matter present
                  </Label>
                </div>
              </div>

              {watch('foreignMatterPresent') && (
                <div className="mt-4">
                  <Label htmlFor="foreignMatterDescription">Foreign Matter Description</Label>
                  <Textarea
                    id="foreignMatterDescription"
                    {...register('foreignMatterDescription')}
                    placeholder="Describe the foreign matter found"
                    rows={3}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5" />
              Test Results
            </CardTitle>
            <CardDescription>Add one or more test results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Test {index + 1}</h3>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor={`testResults.${index}.testType`}>Test Type *</Label>
                    <Select
                      value={watch(`testResults.${index}.testType`)}
                      onValueChange={(value) => setValue(`testResults.${index}.testType`, value)}
                    >
                      <SelectTrigger id={`testResults.${index}.testType`}>
                        <SelectValue placeholder="Select test type" />
                      </SelectTrigger>
                      <SelectContent>
                        {testTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.testResults?.[index]?.testType && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.testResults[index]?.testType?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`testResults.${index}.testLocation`}>Test Location *</Label>
                    <Select
                      value={watch(`testResults.${index}.testLocation`)}
                      onValueChange={(value) =>
                        setValue(`testResults.${index}.testLocation`, value)
                      }
                    >
                      <SelectTrigger id={`testResults.${index}.testLocation`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {testLocations.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor={`testResults.${index}.testDate`}>Test Date *</Label>
                    <Input
                      id={`testResults.${index}.testDate`}
                      type="datetime-local"
                      {...register(`testResults.${index}.testDate`, { valueAsDate: true })}
                    />
                  </div>

                  <div>
                    <Label htmlFor={`testResults.${index}.unit`}>Unit *</Label>
                    <Select
                      value={watch(`testResults.${index}.unit`)}
                      onValueChange={(value) => setValue(`testResults.${index}.unit`, value)}
                    >
                      <SelectTrigger id={`testResults.${index}.unit`}>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor={`testResults.${index}.targetValue`}>Target Value *</Label>
                    <Input
                      id={`testResults.${index}.targetValue`}
                      type="number"
                      step="0.01"
                      {...register(`testResults.${index}.targetValue`, { valueAsNumber: true })}
                      placeholder="0.00"
                    />
                    {errors.testResults?.[index]?.targetValue && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.testResults[index]?.targetValue?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`testResults.${index}.resultValue`}>Result Value *</Label>
                    <Input
                      id={`testResults.${index}.resultValue`}
                      type="number"
                      step="0.01"
                      {...register(`testResults.${index}.resultValue`, { valueAsNumber: true })}
                      placeholder="0.00"
                    />
                    {errors.testResults?.[index]?.resultValue && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.testResults[index]?.resultValue?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`testResults.${index}.tolerancePercent`}>
                      Tolerance (%) *
                    </Label>
                    <Input
                      id={`testResults.${index}.tolerancePercent`}
                      type="number"
                      step="0.1"
                      {...register(`testResults.${index}.tolerancePercent`, {
                        valueAsNumber: true,
                      })}
                      placeholder="10.0"
                    />
                    {errors.testResults?.[index]?.tolerancePercent && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.testResults[index]?.tolerancePercent?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`testResults.${index}.labCertificateNumber`}>
                      Lab Certificate Number
                    </Label>
                    <Input
                      id={`testResults.${index}.labCertificateNumber`}
                      {...register(`testResults.${index}.labCertificateNumber`)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                append({
                  testType: '',
                  testDate: new Date(),
                  testLocation: 'On-site Lab',
                  resultValue: 0,
                  unit: 'ppm',
                  targetValue: 0,
                  tolerancePercent: 10,
                })
              }
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another Test
            </Button>
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
            <CardDescription>Any additional observations or comments</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              {...register('notes')}
              placeholder="Enter any additional notes about the sample or tests..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/qc')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Recording...' : 'Record QC Test'}
          </Button>
        </div>
      </form>
    </div>
  );
}
