'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Calendar,
  Filter,
  Download,
  Search,
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

interface QCTest {
  id: string;
  testType: string;
  testDate: string;
  result: number;
  unit: string;
  target: number;
  tolerance: number;
  deviation: number;
  status: string;
  batch: {
    id: string;
    batchId: string;
    productType: string;
    productionLine: string;
    mill: {
      id: string;
      name: string;
      code: string;
    };
  };
  tester: {
    id: string;
    name: string;
    email: string;
  };
  sample: {
    id: string;
    sampleId: string;
    collectionPoint: string;
  } | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function QCTestsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [qcTests, setQcTests] = useState<QCTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0,
  });

  const canCreateQCTest =
    session?.user?.role === 'MILL_OPERATOR' ||
    session?.user?.role === 'MILL_MANAGER' ||
    session?.user?.role === 'FWGA_INSPECTOR' ||
    session?.user?.role === 'SYSTEM_ADMIN';

  useEffect(() => {
    fetchQCTests();
  }, [pagination.page]);

  const fetchQCTests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      const response = await fetch(`/api/qc?${params}`);
      const data = await response.json();

      if (data.success) {
        setQcTests(data.data.qcTests);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching QC tests:', error);
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

  const formatResult = (result: number, unit: string, target: number) => {
    return (
      <div className="space-y-1">
        <div className="font-medium">
          {result.toFixed(2)} {unit}
        </div>
        <div className="text-xs text-muted-foreground">
          Target: {target.toFixed(2)} {unit}
        </div>
      </div>
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
          <h1 className="text-3xl font-bold tracking-tight">QC Testing</h1>
          <p className="text-muted-foreground mt-1">
            Quality control test results and analysis
          </p>
        </div>
        {canCreateQCTest && (
          <Button onClick={() => router.push('/qc/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Record QC Test
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter and search QC tests</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by batch ID, test type..."
                className="pl-8 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Status
          </Button>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Date Range
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </CardContent>
      </Card>

      {/* QC Tests Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch ID</TableHead>
                <TableHead>Mill</TableHead>
                <TableHead>Product Type</TableHead>
                <TableHead>Test Type</TableHead>
                <TableHead>Test Date</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Deviation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tester</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {qcTests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="h-8 w-8" />
                      <p>No QC tests found</p>
                      {canCreateQCTest && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push('/qc/new')}
                          className="mt-2"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Record First QC Test
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                qcTests.map((test) => (
                  <TableRow
                    key={test.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/qc/${test.id}`)}
                  >
                    <TableCell className="font-medium">{test.batch.batchId}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{test.batch.mill.name}</div>
                        <div className="text-xs text-muted-foreground">{test.batch.mill.code}</div>
                      </div>
                    </TableCell>
                    <TableCell>{test.batch.productType}</TableCell>
                    <TableCell>{test.testType}</TableCell>
                    <TableCell>{format(new Date(test.testDate), 'MMM d, yyyy HH:mm')}</TableCell>
                    <TableCell>{formatResult(test.result, test.unit, test.target)}</TableCell>
                    <TableCell>
                      <span
                        className={
                          Math.abs(test.deviation) > 10
                            ? 'text-destructive font-medium'
                            : Math.abs(test.deviation) > 5
                            ? 'text-yellow-600 font-medium'
                            : ''
                        }
                      >
                        {formatDeviation(test.deviation)}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(test.status)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{test.tester.name}</div>
                        <div className="text-xs text-muted-foreground">{test.tester.email}</div>
                      </div>
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
            tests
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
