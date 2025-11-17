'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Download,
  Edit,
  Calendar,
  User,
  Beaker,
  Package,
  Factory,
  FileText,
  Camera,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface QCTestDetail {
  id: string;
  testType: string;
  testMethod: string;
  testLocation: string;
  testDate: string;
  result: number;
  unit: string;
  target: number;
  tolerance: number;
  deviation: number;
  status: string;
  labCertificate: string | null;
  labReportUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  batch: {
    id: string;
    batchId: string;
    productType: string;
    productionLine: string;
    cropType: string;
    targetFortification: any;
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
  };
  tester: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  sample: {
    id: string;
    sampleId: string;
    collectionPoint: string;
    collectionTime: string;
    sampledBy: string;
    sampleQuantity: number;
    visualInspection: string;
    photoUrls: string | null;
    notes: string | null;
  } | null;
}

export default function QCTestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [qcTest, setQcTest] = useState<QCTestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canEdit =
    session?.user?.role === 'MILL_MANAGER' ||
    session?.user?.role === 'FWGA_INSPECTOR' ||
    session?.user?.role === 'SYSTEM_ADMIN';

  useEffect(() => {
    fetchQCTest();
  }, [params.id]);

  const fetchQCTest = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/qc/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to fetch QC test');
        return;
      }

      setQcTest(data.data);
    } catch (err) {
      setError('An error occurred while fetching the QC test');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASS':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Pass
          </Badge>
        );
      case 'MARGINAL':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Marginal
          </Badge>
        );
      case 'FAIL':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="mr-1 h-3 w-3" />
            Fail
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDeviation = (deviation: number) => {
    const sign = deviation >= 0 ? '+' : '';
    return `${sign}${deviation.toFixed(2)}%`;
  };

  const parseVisualInspection = (visualInspection: string) => {
    try {
      return JSON.parse(visualInspection);
    } catch {
      return {};
    }
  };

  const parsePhotoUrls = (photoUrls: string | null) => {
    if (!photoUrls) return [];
    try {
      return JSON.parse(photoUrls);
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !qcTest) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">QC Test Not Found</h2>
            <p className="text-muted-foreground mb-6">{error || 'The requested QC test could not be found.'}</p>
            <Button onClick={() => router.push('/qc')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to QC Tests
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const visualInspection = qcTest.sample ? parseVisualInspection(qcTest.sample.visualInspection) : {};
  const photoUrls = qcTest.sample ? parsePhotoUrls(qcTest.sample.photoUrls) : [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/qc')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">QC Test Details</h1>
            <p className="text-muted-foreground mt-1">
              {qcTest.testType} - {qcTest.batch.batchId}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Result</CardTitle>
            <Beaker className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {qcTest.result.toFixed(2)} {qcTest.unit}
            </div>
            <p className="text-xs text-muted-foreground">
              Target: {qcTest.target.toFixed(2)} {qcTest.unit}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deviation</CardTitle>
            {Math.abs(qcTest.deviation) > 10 ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                Math.abs(qcTest.deviation) > 10
                  ? 'text-destructive'
                  : Math.abs(qcTest.deviation) > 5
                  ? 'text-yellow-600'
                  : ''
              }`}
            >
              {formatDeviation(qcTest.deviation)}
            </div>
            <p className="text-xs text-muted-foreground">
              Tolerance: ±{qcTest.tolerance}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-2">{getStatusBadge(qcTest.status)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {format(new Date(qcTest.testDate), 'MMM d, yyyy HH:mm')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Method</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{qcTest.testMethod}</div>
            <p className="text-xs text-muted-foreground mt-1">{qcTest.testLocation}</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Test Details</TabsTrigger>
          <TabsTrigger value="sample">Sample Information</TabsTrigger>
          <TabsTrigger value="batch">Batch Details</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Information</CardTitle>
              <CardDescription>Complete test results and analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Beaker className="h-4 w-4" />
                    Test Details
                  </h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Test Type:</dt>
                      <dd className="text-sm font-medium">{qcTest.testType}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Test Method:</dt>
                      <dd className="text-sm font-medium">{qcTest.testMethod}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Test Location:</dt>
                      <dd className="text-sm font-medium">{qcTest.testLocation}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Test Date:</dt>
                      <dd className="text-sm font-medium">
                        {format(new Date(qcTest.testDate), 'PPpp')}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Tester Information
                  </h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Name:</dt>
                      <dd className="text-sm font-medium">{qcTest.tester.name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Email:</dt>
                      <dd className="text-sm font-medium">{qcTest.tester.email}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Role:</dt>
                      <dd className="text-sm font-medium">{qcTest.tester.role}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Test Results</h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Result</div>
                      <div className="text-2xl font-bold">
                        {qcTest.result.toFixed(2)} {qcTest.unit}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Target</div>
                      <div className="text-2xl font-bold">
                        {qcTest.target.toFixed(2)} {qcTest.unit}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Deviation</div>
                      <div
                        className={`text-2xl font-bold ${
                          Math.abs(qcTest.deviation) > 10
                            ? 'text-destructive'
                            : Math.abs(qcTest.deviation) > 5
                            ? 'text-yellow-600'
                            : 'text-green-600'
                        }`}
                      >
                        {formatDeviation(qcTest.deviation)}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Acceptable Range</div>
                    <div className="text-sm font-medium">
                      {(qcTest.target * (1 - qcTest.tolerance / 100)).toFixed(2)} -{' '}
                      {(qcTest.target * (1 + qcTest.tolerance / 100)).toFixed(2)} {qcTest.unit}{' '}
                      (±{qcTest.tolerance}%)
                    </div>
                  </div>
                </div>
              </div>

              {qcTest.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Notes</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {qcTest.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sample" className="space-y-4">
          {qcTest.sample ? (
            <Card>
              <CardHeader>
                <CardTitle>Sample Information</CardTitle>
                <CardDescription>Details about the collected sample</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="font-semibold mb-2">Sample Details</h3>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">Sample ID:</dt>
                        <dd className="text-sm font-medium">{qcTest.sample.sampleId}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">Collection Point:</dt>
                        <dd className="text-sm font-medium">{qcTest.sample.collectionPoint}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">Collection Time:</dt>
                        <dd className="text-sm font-medium">
                          {format(new Date(qcTest.sample.collectionTime), 'PPpp')}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">Sampled By:</dt>
                        <dd className="text-sm font-medium">{qcTest.sample.sampledBy}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">Sample Quantity:</dt>
                        <dd className="text-sm font-medium">{qcTest.sample.sampleQuantity} kg</dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Visual Inspection</h3>
                    <dl className="space-y-2">
                      {visualInspection.colorUniformity && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-muted-foreground">Color Uniformity:</dt>
                          <dd className="text-sm font-medium">{visualInspection.colorUniformity}</dd>
                        </div>
                      )}
                      {visualInspection.odor && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-muted-foreground">Odor:</dt>
                          <dd className="text-sm font-medium">{visualInspection.odor}</dd>
                        </div>
                      )}
                      {visualInspection.texture && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-muted-foreground">Texture:</dt>
                          <dd className="text-sm font-medium">{visualInspection.texture}</dd>
                        </div>
                      )}
                      {visualInspection.foreignMatterPresent !== undefined && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-muted-foreground">Foreign Matter:</dt>
                          <dd className="text-sm font-medium">
                            {visualInspection.foreignMatterPresent ? 'Present' : 'None'}
                          </dd>
                        </div>
                      )}
                      {visualInspection.foreignMatterDescription && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-muted-foreground">Description:</dt>
                          <dd className="text-sm font-medium">
                            {visualInspection.foreignMatterDescription}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>

                {photoUrls.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Sample Photos
                      </h3>
                      <div className="grid gap-4 md:grid-cols-3">
                        {photoUrls.map((url: string, index: number) => (
                          <div key={index} className="border rounded-lg p-2">
                            <img
                              src={url}
                              alt={`Sample photo ${index + 1}`}
                              className="w-full h-48 object-cover rounded"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {qcTest.sample.notes && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2">Sample Notes</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {qcTest.sample.notes}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No sample information available
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Information</CardTitle>
              <CardDescription>Details about the tested batch</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Batch Details
                  </h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Batch ID:</dt>
                      <dd className="text-sm font-medium">
                        <Button
                          variant="link"
                          className="h-auto p-0"
                          onClick={() => router.push(`/batches/${qcTest.batch.id}`)}
                        >
                          {qcTest.batch.batchId}
                        </Button>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Product Type:</dt>
                      <dd className="text-sm font-medium">{qcTest.batch.productType}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Crop Type:</dt>
                      <dd className="text-sm font-medium">{qcTest.batch.cropType}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Production Line:</dt>
                      <dd className="text-sm font-medium">{qcTest.batch.productionLine}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Factory className="h-4 w-4" />
                    Mill Information
                  </h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Mill Name:</dt>
                      <dd className="text-sm font-medium">{qcTest.batch.mill.name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Mill Code:</dt>
                      <dd className="text-sm font-medium">{qcTest.batch.mill.code}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Region:</dt>
                      <dd className="text-sm font-medium">{qcTest.batch.mill.region}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Country:</dt>
                      <dd className="text-sm font-medium">{qcTest.batch.mill.country}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {qcTest.batch.targetFortification && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Target Fortification</h3>
                    <div className="grid gap-2 md:grid-cols-3">
                      {Object.entries(qcTest.batch.targetFortification).map(([nutrient, value]) => (
                        <div key={nutrient} className="bg-muted/50 rounded-lg p-3">
                          <div className="text-sm text-muted-foreground">{nutrient}</div>
                          <div className="text-lg font-semibold">{value as any} ppm</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Laboratory Documents</CardTitle>
              <CardDescription>Certificates and reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {qcTest.labCertificate && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Lab Certificate</div>
                      <div className="text-sm text-muted-foreground">
                        Certificate #: {qcTest.labCertificate}
                      </div>
                    </div>
                  </div>
                  {qcTest.labReportUrl && (
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  )}
                </div>
              )}

              {!qcTest.labCertificate && !qcTest.labReportUrl && (
                <div className="text-center py-12 text-muted-foreground">
                  No laboratory documents available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
