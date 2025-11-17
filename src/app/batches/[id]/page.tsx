'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Package,
  FlaskConical,
  FileText,
  Edit,
  Download,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';

interface BatchDetail {
  id: string;
  batchId: string;
  productionLine: string;
  cropType: string;
  productType: string;
  inputWeight: number;
  outputWeight: number;
  premixType: string;
  premixBatchNumber: string;
  targetFortification: Record<string, number>;
  actualPremixUsed: number;
  expectedPremix: number;
  variance: number;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  mill: {
    id: string;
    name: string;
    code: string;
    address: string;
    region: string;
    country: string;
  };
  operator: {
    id: string;
    name: string;
    email: string;
  };
  qcTests: Array<{
    id: string;
    testType: string;
    result: number;
    unit: string;
    target: number;
    tolerance: number;
    status: string;
    notes?: string;
    createdAt: string;
    tester: {
      name: string;
    };
  }>;
  premixUsage?: Array<{
    id: string;
    quantity: number;
    unit: string;
    timestamp: string;
  }>;
  traceabilityRecords?: Array<{
    id: string;
    eventType: string;
    description: string;
    timestamp: string;
    userId: string;
  }>;
}

const STATUS_COLORS = {
  QC_PENDING: 'secondary',
  QC_IN_PROGRESS: 'default',
  APPROVED: 'default',
  FAILED: 'destructive',
  QUARANTINED: 'destructive',
  RELEASED: 'default',
  REJECTED: 'destructive',
  CANCELLED: 'secondary',
} as const;

const QC_STATUS_COLORS = {
  PASS: 'default',
  MARGINAL: 'secondary',
  FAIL: 'destructive',
  PENDING: 'secondary',
} as const;

export default function BatchDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchBatch();
    }
  }, [params.id]);

  const fetchBatch = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/batches/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setBatch(data.data);
      } else {
        console.error('Error fetching batch:', data.error);
      }
    } catch (error) {
      console.error('Error fetching batch:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'secondary';
  };

  const getQCStatusColor = (status: string) => {
    return QC_STATUS_COLORS[status as keyof typeof QC_STATUS_COLORS] || 'secondary';
  };

  const formatWeight = (weight: number) => {
    return `${weight.toLocaleString()} kg`;
  };

  const formatVariance = (variance: number) => {
    const sign = variance >= 0 ? '+' : '';
    return `${sign}${variance.toFixed(2)}%`;
  };

  const calculateEfficiency = () => {
    if (!batch) return 0;
    return ((batch.outputWeight / batch.inputWeight) * 100).toFixed(2);
  };

  const canEditBatch = () => {
    if (!session) return false;
    return (
      session.user.role === 'MILL_MANAGER' ||
      session.user.role === 'SYSTEM_ADMIN' ||
      (session.user.role === 'MILL_OPERATOR' && session.user.millId === batch?.mill.id)
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!batch) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Batch Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The batch you're looking for doesn't exist or you don't have access to it.
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/batches">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{batch.batchId}</h1>
                <p className="text-muted-foreground">{batch.productType}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor(batch.status)} className="text-sm">
              {batch.status.replace('_', ' ')}
            </Badge>
            {canEditBatch() && (
              <>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Input Weight</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatWeight(batch.inputWeight)}</div>
              <p className="text-xs text-muted-foreground">{batch.cropType}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Output Weight</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatWeight(batch.outputWeight)}</div>
              <p className="text-xs text-muted-foreground">
                {calculateEfficiency()}% efficiency
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Premix Variance</CardTitle>
              {Math.abs(batch.variance) > 5 ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  Math.abs(batch.variance) > 5 ? 'text-destructive' : ''
                }`}
              >
                {formatVariance(batch.variance)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatWeight(batch.actualPremixUsed)} / {formatWeight(batch.expectedPremix)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">QC Status</CardTitle>
              <FlaskConical className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{batch.qcTests.length}</div>
              <p className="text-xs text-muted-foreground">
                {batch.qcTests.filter((t) => t.status === 'PASS').length} passed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="qc">QC Tests ({batch.qcTests.length})</TabsTrigger>
            <TabsTrigger value="traceability">Traceability</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Batch Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Batch Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Batch ID</p>
                      <p className="text-sm font-mono">{batch.batchId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Production Line
                      </p>
                      <p className="text-sm">{batch.productionLine}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Crop Type</p>
                      <p className="text-sm">{batch.cropType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Product Type</p>
                      <p className="text-sm">{batch.productType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Created</p>
                      <p className="text-sm">
                        {format(new Date(batch.createdAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Updated</p>
                      <p className="text-sm">
                        {format(new Date(batch.updatedAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Mill & Operator */}
              <Card>
                <CardHeader>
                  <CardTitle>Mill & Operator</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Mill</p>
                    <div>
                      <p className="text-sm font-semibold">{batch.mill.name}</p>
                      <p className="text-sm text-muted-foreground">{batch.mill.code}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {batch.mill.address}, {batch.mill.region}, {batch.mill.country}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Operator</p>
                    <div>
                      <p className="text-sm font-semibold">{batch.operator.name}</p>
                      <p className="text-sm text-muted-foreground">{batch.operator.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Premix Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Premix Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Premix Type</p>
                      <p className="text-sm">{batch.premixType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Batch Number</p>
                      <p className="text-sm font-mono">{batch.premixBatchNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Expected</p>
                      <p className="text-sm">{formatWeight(batch.expectedPremix)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Actual Used</p>
                      <p className="text-sm">{formatWeight(batch.actualPremixUsed)}</p>
                    </div>
                  </div>
                  {batch.targetFortification &&
                    Object.keys(batch.targetFortification).length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">
                            Target Fortification
                          </p>
                          <div className="space-y-1">
                            {Object.entries(batch.targetFortification).map(([key, value]) => (
                              <div key={key} className="flex justify-between text-sm">
                                <span className="capitalize">{key}:</span>
                                <span className="font-mono">{value} ppm</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                </CardContent>
              </Card>

              {/* Notes */}
              {batch.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{batch.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="qc" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quality Control Tests</CardTitle>
                <CardDescription>
                  All QC tests performed on this batch
                </CardDescription>
              </CardHeader>
              <CardContent>
                {batch.qcTests.length === 0 ? (
                  <div className="py-8 text-center">
                    <FlaskConical className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No QC tests recorded yet</p>
                    <Button asChild className="mt-4" variant="outline">
                      <Link href={`/qc/new?batchId=${batch.id}`}>Record QC Test</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {batch.qcTests.map((test) => (
                      <Card key={test.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{test.testType}</h4>
                                <Badge variant={getQCStatusColor(test.status)}>
                                  {test.status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Result</p>
                                  <p className="font-mono">
                                    {test.result} {test.unit}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Target</p>
                                  <p className="font-mono">
                                    {test.target} {test.unit}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Tolerance</p>
                                  <p className="font-mono">± {test.tolerance}%</p>
                                </div>
                              </div>
                              <div className="text-sm">
                                <p className="text-muted-foreground">
                                  Tested by {test.tester.name} on{' '}
                                  {format(new Date(test.createdAt), 'MMM dd, yyyy HH:mm')}
                                </p>
                              </div>
                              {test.notes && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {test.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="traceability">
            <Card>
              <CardHeader>
                <CardTitle>Traceability Records</CardTitle>
                <CardDescription>
                  Complete audit trail for this batch
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Traceability records coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Batch Timeline</CardTitle>
                <CardDescription>
                  Chronological history of all batch events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Timeline coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
