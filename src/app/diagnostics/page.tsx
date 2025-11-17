'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Plus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
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

interface DiagnosticResult {
  id: string;
  category: string;
  subcategory: string | null;
  result: string;
  severity: string;
  createdAt: string;
  user: {
    name: string;
  };
  mill: {
    name: string;
    code: string;
  } | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function DiagnosticsPage() {
  const router = useRouter();
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0,
  });

  useEffect(() => {
    fetchResults();
  }, [pagination.page]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      const response = await fetch(`/api/diagnostics/results?${params}`);
      const data = await response.json();

      if (data.success) {
        setResults(data.data.results);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching diagnostic results:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertTriangle className="mr-1 h-3 w-3" />
            High
          </Badge>
        );
      case 'MEDIUM':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <AlertCircle className="mr-1 h-3 w-3" />
            Medium
          </Badge>
        );
      case 'LOW':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Low
          </Badge>
        );
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Diagnostics</h1>
          <p className="text-muted-foreground mt-1">
            Interactive troubleshooting and system diagnostics
          </p>
        </div>
        <Button onClick={() => router.push('/diagnostics/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Start New Diagnostic
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter and search diagnostic results</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search diagnostics..."
                className="pl-8 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Category
          </Button>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Severity
          </Button>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Mill</TableHead>
                <TableHead>Result Summary</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="h-8 w-8" />
                      <p>No diagnostic results found</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/diagnostics/new')}
                        className="mt-2"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Start First Diagnostic
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                results.map((result) => (
                  <TableRow
                    key={result.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/diagnostics/results/${result.id}`)}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{result.category}</div>
                        {result.subcategory && (
                          <div className="text-xs text-muted-foreground">{result.subcategory}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {result.mill ? (
                        <div className="space-y-1">
                          <div className="font-medium">{result.mill.name}</div>
                          <div className="text-xs text-muted-foreground">{result.mill.code}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md line-clamp-2 text-sm">{result.result}</div>
                    </TableCell>
                    <TableCell>{getSeverityBadge(result.severity)}</TableCell>
                    <TableCell>{result.user.name}</TableCell>
                    <TableCell>{format(new Date(result.createdAt), 'MMM d, yyyy')}</TableCell>
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
            results
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
