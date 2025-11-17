'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Download,
  Edit,
  FileText,
  Factory,
  User,
  Calendar,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AuditDetail {
  id: string;
  auditType: string;
  auditDate: string;
  status: string;
  score: number | null;
  batchPeriod: string | null;
  responses: any;
  notes: string | null;
  reviewNotes: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
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
  template: {
    id: string;
    name: string;
    version: string;
    commodity: string;
    certificationType: string;
    sections: any;
    scoringRules: any;
  };
  auditor: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  submitter: {
    id: string;
    name: string;
    email: string;
  } | null;
  reviewer: {
    id: string;
    name: string;
    email: string;
  } | null;
  annotations: Array<{
    id: string;
    sectionId: string;
    itemId: string;
    annotationType: string;
    content: string;
    createdAt: string;
    annotator: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

export default function AuditDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [audit, setAudit] = useState<AuditDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canEdit =
    session?.user?.role === 'FWGA_INSPECTOR' ||
    session?.user?.role === 'MILL_MANAGER' ||
    session?.user?.role === 'SYSTEM_ADMIN';

  useEffect(() => {
    fetchAudit();
  }, [params.id]);

  const fetchAudit = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/compliance/audits/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to fetch audit');
        return;
      }

      setAudit(data.data);
    } catch (err) {
      setError('An error occurred while fetching the audit');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      case 'PENDING_REVIEW':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="mr-1 h-3 w-3" />
            Pending Review
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge variant="outline">
            <FileText className="mr-1 h-3 w-3" />
            In Progress
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
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

  if (error || !audit) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Audit Not Found</h2>
            <p className="text-muted-foreground mb-6">{error || 'The requested audit could not be found.'}</p>
            <Button onClick={() => router.push('/compliance')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Audits
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/compliance')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Compliance Audit</h1>
            <p className="text-muted-foreground mt-1">
              {audit.template.name} - {audit.mill.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {getStatusBadge(audit.status)}
          {canEdit && audit.status === 'IN_PROGRESS' && (
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Continue Audit
            </Button>
          )}
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audit Type</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audit.auditType}</div>
            <p className="text-xs text-muted-foreground">
              {audit.template.certificationType.replace('_', ' ')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            {audit.score !== null && audit.score >= 80 ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : audit.score !== null && audit.score < 60 ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : (
              <Clock className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            {audit.score !== null ? (
              <>
                <div
                  className={`text-2xl font-bold ${
                    audit.score >= 80
                      ? 'text-green-600'
                      : audit.score >= 60
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}
                >
                  {audit.score.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {audit.score >= 80 ? 'Excellent' : audit.score >= 60 ? 'Satisfactory' : 'Needs Improvement'}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">-</div>
                <p className="text-xs text-muted-foreground">Not yet scored</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audit Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {format(new Date(audit.auditDate), 'MMM d')}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(audit.auditDate), 'yyyy')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annotations</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audit.annotations.length}</div>
            <p className="text-xs text-muted-foreground">Inspector notes</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Audit Details</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="annotations">Annotations ({audit.annotations.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Information</CardTitle>
              <CardDescription>Complete audit details and metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Factory className="h-4 w-4" />
                    Mill Information
                  </h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Mill Name:</dt>
                      <dd className="text-sm font-medium">{audit.mill.name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Mill Code:</dt>
                      <dd className="text-sm font-medium">{audit.mill.code}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Location:</dt>
                      <dd className="text-sm font-medium">
                        {audit.mill.region}, {audit.mill.country}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Address:</dt>
                      <dd className="text-sm font-medium">{audit.mill.address}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Template Information
                  </h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Template:</dt>
                      <dd className="text-sm font-medium">{audit.template.name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Version:</dt>
                      <dd className="text-sm font-medium">v{audit.template.version}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Commodity:</dt>
                      <dd className="text-sm font-medium">{audit.template.commodity}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Type:</dt>
                      <dd className="text-sm font-medium">
                        {audit.template.certificationType.replace('_', ' ')}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Auditor Information
                  </h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Name:</dt>
                      <dd className="text-sm font-medium">{audit.auditor.name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Email:</dt>
                      <dd className="text-sm font-medium">{audit.auditor.email}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Role:</dt>
                      <dd className="text-sm font-medium">{audit.auditor.role}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Timeline
                  </h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Created:</dt>
                      <dd className="text-sm font-medium">
                        {format(new Date(audit.createdAt), 'PPpp')}
                      </dd>
                    </div>
                    {audit.submittedAt && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">Submitted:</dt>
                        <dd className="text-sm font-medium">
                          {format(new Date(audit.submittedAt), 'PPpp')}
                        </dd>
                      </div>
                    )}
                    {audit.reviewedAt && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">Reviewed:</dt>
                        <dd className="text-sm font-medium">
                          {format(new Date(audit.reviewedAt), 'PPpp')}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {audit.batchPeriod && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Batch Period</h3>
                    <p className="text-sm text-muted-foreground">{audit.batchPeriod}</p>
                  </div>
                </>
              )}

              {audit.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Audit Notes</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {audit.notes}
                    </p>
                  </div>
                </>
              )}

              {audit.reviewNotes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Review Notes</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {audit.reviewNotes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Checklist</CardTitle>
              <CardDescription>Template sections and response status</CardDescription>
            </CardHeader>
            <CardContent>
              {audit.template.sections && Array.isArray(audit.template.sections) && audit.template.sections.length > 0 ? (
                <div className="space-y-4">
                  {audit.template.sections.map((section: any, index: number) => (
                    <div key={section.id || index} className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-2">{section.name}</h3>
                      {section.description && (
                        <p className="text-sm text-muted-foreground mb-3">{section.description}</p>
                      )}
                      <div className="text-sm text-muted-foreground">
                        {section.items?.length || 0} items
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No checklist sections defined in template
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="annotations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inspector Annotations</CardTitle>
              <CardDescription>Notes and comments from inspectors</CardDescription>
            </CardHeader>
            <CardContent>
              {audit.annotations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No annotations added yet
                </div>
              ) : (
                <div className="space-y-4">
                  {audit.annotations.map((annotation) => (
                    <div key={annotation.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium">{annotation.annotator.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(annotation.createdAt), 'PPpp')}
                          </div>
                        </div>
                        <Badge variant="outline">{annotation.annotationType}</Badge>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{annotation.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit History</CardTitle>
              <CardDescription>Timeline of audit events and changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Audit Created</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(audit.createdAt), 'PPpp')} by {audit.auditor.name}
                    </div>
                  </div>
                </div>

                {audit.submittedAt && audit.submitter && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <CheckCircle2 className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Submitted for Review</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(audit.submittedAt), 'PPpp')} by {audit.submitter.name}
                      </div>
                    </div>
                  </div>
                )}

                {audit.reviewedAt && audit.reviewer && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {audit.status === 'APPROVED' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {audit.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(audit.reviewedAt), 'PPpp')} by {audit.reviewer.name}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
