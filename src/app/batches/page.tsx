'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/MainLayout';
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
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Filter, Download } from 'lucide-react';
import { format } from 'date-fns';

interface Batch {
  id: string;
  batchId: string;
  productType: string;
  inputWeight: number;
  outputWeight: number;
  status: string;
  variance: number;
  createdAt: string;
  mill: {
    name: string;
    code: string;
  };
  operator: {
    name: string;
  };
  qcTests: Array<{
    status: string;
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

export default function BatchesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    fetchBatches();
  }, [pagination.page]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      const response = await fetch(`/api/batches?${params}`);
      const data = await response.json();

      if (data.success) {
        setBatches(data.data.batches);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    // TODO: Implement search functionality
  };

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'secondary';
  };

  const formatWeight = (weight: number) => {
    return `${weight.toLocaleString()} kg`;
  };

  const formatVariance = (variance: number) => {
    const sign = variance >= 0 ? '+' : '';
    return `${sign}${variance.toFixed(2)}%`;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Batch Management</h1>
            <p className="text-muted-foreground">
              Track and manage all production batches
            </p>
          </div>
          {(session?.user?.role === 'MILL_OPERATOR' ||
            session?.user?.role === 'MILL_MANAGER' ||
            session?.user?.role === 'SYSTEM_ADMIN') && (
            <Button asChild>
              <Link href="/batches/new">
                <Plus className="mr-2 h-4 w-4" />
                Log New Batch
              </Link>
            </Button>
          )}
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search batches..."
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Batches Table */}
        <Card>
          <CardHeader>
            <CardTitle>Batches ({pagination.total})</CardTitle>
            <CardDescription>
              All production batches with QC status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : batches.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No batches found</p>
                <Button asChild className="mt-4" variant="outline">
                  <Link href="/batches/new">Log Your First Batch</Link>
                </Button>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Mill</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Input/Output</TableHead>
                      <TableHead>Variance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Operator</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch) => (
                      <TableRow
                        key={batch.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/batches/${batch.id}`)}
                      >
                        <TableCell className="font-medium">
                          {batch.batchId}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{batch.mill.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {batch.mill.code}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{batch.productType}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{formatWeight(batch.inputWeight)}</div>
                            <div className="text-muted-foreground">
                              → {formatWeight(batch.outputWeight)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              Math.abs(batch.variance) > 5
                                ? 'text-destructive'
                                : 'text-muted-foreground'
                            }
                          >
                            {formatVariance(batch.variance)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(batch.status)}>
                            {batch.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{batch.operator.name}</TableCell>
                        <TableCell>
                          {format(new Date(batch.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/batches/${batch.id}`);
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="flex items-center justify-between px-2 py-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} batches
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page === 1}
                        onClick={() =>
                          setPagination((prev) => ({
                            ...prev,
                            page: prev.page - 1,
                          }))
                        }
                      >
                        Previous
                      </Button>
                      <div className="text-sm">
                        Page {pagination.page} of {pagination.pages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page === pagination.pages}
                        onClick={() =>
                          setPagination((prev) => ({
                            ...prev,
                            page: prev.page + 1,
                          }))
                        }
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
