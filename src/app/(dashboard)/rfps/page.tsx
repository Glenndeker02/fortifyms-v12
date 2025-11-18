'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Eye, Calendar, Package } from 'lucide-react';
import Link from 'next/link';

interface RFP {
  id: string;
  referenceNumber: string;
  title: string;
  commodity: string;
  totalVolume: number;
  bidDeadline: string;
  status: string;
  _count?: { bids: number };
}

export default function RFPsListPage() {
  const { toast } = useToast();
  const [rfps, setRfps] = useState<RFP[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchRFPs();
  }, [statusFilter]);

  const fetchRFPs = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const response = await fetch(`/api/rfps?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setRfps(data.data.rfps);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load RFPs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRFPs = rfps.filter(
    (rfp) =>
      rfp.title.toLowerCase().includes(search.toLowerCase()) ||
      rfp.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
      rfp.commodity.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      DRAFT: 'secondary',
      OPEN: 'default',
      CLOSED: 'outline',
      AWARDED: 'default',
    };

    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Requests for Proposal</h1>
          <p className="text-muted-foreground">Manage and track your RFPs</p>
        </div>
        <Link href="/rfps/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create RFP
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, reference number, or commodity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="AWARDED">Awarded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* RFP List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading RFPs...</div>
      ) : filteredRFPs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No RFPs found</h3>
            <p className="text-muted-foreground mb-4">
              {search ? 'Try adjusting your search criteria' : 'Create your first RFP to get started'}
            </p>
            {!search && (
              <Link href="/rfps/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create RFP
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRFPs.map((rfp) => (
            <Card key={rfp.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{rfp.title}</h3>
                      {getStatusBadge(rfp.status)}
                    </div>

                    <p className="text-sm text-muted-foreground mb-4">
                      {rfp.referenceNumber} • {rfp.commodity} • {rfp.totalVolume} MT
                    </p>

                    <div className="flex gap-6 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Deadline: {new Date(rfp.bidDeadline).toLocaleDateString()}</span>
                      </div>
                      {rfp._count && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span>{rfp._count.bids} bids</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Link href={`/rfps/${rfp.id}`}>
                    <Button variant="outline">
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
