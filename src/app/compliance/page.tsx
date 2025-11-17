'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Plus,
  Filter,
  Download,
  Search,
  AlertTriangle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ComplianceAudit {
  id: string;
  auditType: string;
  auditDate: string;
  status: string;
  score: number | null;
  batchPeriod: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  mill: {
    id: string;
    name: string;
    code: string;
    region: string;
    country: string;
  };
  template: {
    id: string;
    name: string;
    version: string;
    commodity: string;
    certificationType: string;
  };
  auditor: {
    id: string;
    name: string;
    email: string;
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
  _count: {
    annotations: number;
  };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function CompliancePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [audits, setAudits] = useState<ComplianceAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0,
  });

  const canCreateAudit =
    session?.user?.role === 'MILL_MANAGER' ||
    session?.user?.role === 'FWGA_INSPECTOR' ||
    session?.user?.role === 'SYSTEM_ADMIN';

  useEffect(() => {
    fetchAudits();
  }, [pagination.page]);

  const fetchAudits = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      const response = await fetch(`/api/compliance/audits?${params}`);
      const data = await response.json();

      if (data.success) {
        setAudits(data.data.audits);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching audits:', error);
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

  const getCertificationTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      INITIAL: 'bg-blue-100 text-blue-800',
      RENEWAL: 'bg-purple-100 text-purple-800',
      SPOT_CHECK: 'bg-orange-100 text-orange-800',
    };

    return (
      <Badge className={`${colors[type] || 'bg-gray-100 text-gray-800'} hover:${colors[type]}`}>
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance Audits</h1>
          <p className="text-muted-foreground mt-1">
            Digital compliance and certification management
          </p>
        </div>
        {canCreateAudit && (
          <Button onClick={() => router.push('/compliance/audits/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Start New Audit
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter and search compliance audits</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by mill, template, auditor..."
                className="pl-8 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Status
          </Button>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Type
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </CardContent>
      </Card>

      {/* Audits Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mill</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Audit Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Auditor</TableHead>
                <TableHead>Annotations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="h-8 w-8" />
                      <p>No compliance audits found</p>
                      {canCreateAudit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push('/compliance/audits/new')}
                          className="mt-2"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Start First Audit
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                audits.map((audit) => (
                  <TableRow
                    key={audit.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/compliance/audits/${audit.id}`)}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{audit.mill.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {audit.mill.code} • {audit.mill.region}, {audit.mill.country}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{audit.template.name}</div>
                        <div className="text-xs text-muted-foreground">
                          v{audit.template.version} • {audit.template.commodity}
                        </div>
                        <div className="mt-1">
                          {getCertificationTypeBadge(audit.template.certificationType)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{audit.auditType}</TableCell>
                    <TableCell>{format(new Date(audit.auditDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{getStatusBadge(audit.status)}</TableCell>
                    <TableCell>
                      {audit.score !== null ? (
                        <div className="space-y-1">
                          <div
                            className={`font-semibold ${
                              audit.score >= 80
                                ? 'text-green-600'
                                : audit.score >= 60
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}
                          >
                            {audit.score.toFixed(1)}%
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{audit.auditor.name}</div>
                        <div className="text-xs text-muted-foreground">{audit.auditor.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {audit._count.annotations > 0 ? (
                        <Badge variant="secondary">{audit._count.annotations}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
            audits
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page >= pagination.pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
