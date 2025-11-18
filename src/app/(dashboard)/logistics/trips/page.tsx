'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Truck, MapPin, Clock, Plus, Eye, Navigation } from 'lucide-react';
import Link from 'next/link';

interface Trip {
  id: string;
  tripNumber: string;
  driverId: string;
  driver?: { firstName: string; lastName: string };
  status: string;
  startTime: string | null;
  stops: number;
  completedStops: number;
  currentLocation?: string;
}

export default function TripsListPage() {
  const { toast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const response = await fetch('/api/delivery-trips');
      const data = await response.json();

      if (data.success) {
        setTrips(data.data.trips);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load trips',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      SCHEDULED: 'secondary',
      IN_PROGRESS: 'default',
      COMPLETED: 'outline',
      CANCELLED: 'destructive',
    };

    return <Badge variant={variants[status] || 'default'}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Delivery Trips</h1>
          <p className="text-muted-foreground">Track and manage deliveries</p>
        </div>
        <Link href="/logistics/trips/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Trip
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trips.filter((t) => t.status === 'SCHEDULED').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trips.filter((t) => t.status === 'IN_PROGRESS').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trips.filter((t) => t.status === 'COMPLETED').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
            <Navigation className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trips.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Trips List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading trips...</div>
      ) : trips.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No trips found</h3>
            <p className="text-muted-foreground mb-4">Create your first delivery trip</p>
            <Link href="/logistics/trips/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Trip
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => (
            <Card key={trip.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{trip.tripNumber}</h3>
                      {getStatusBadge(trip.status)}
                    </div>

                    <div className="space-y-2 text-sm">
                      {trip.driver && (
                        <p className="text-muted-foreground">
                          Driver: {trip.driver.firstName} {trip.driver.lastName}
                        </p>
                      )}

                      <div className="flex gap-6">
                        <span className="text-muted-foreground">
                          Progress: {trip.completedStops}/{trip.stops} stops
                        </span>
                        {trip.startTime && (
                          <span className="text-muted-foreground">
                            Started: {new Date(trip.startTime).toLocaleString()}
                          </span>
                        )}
                      </div>

                      {trip.currentLocation && trip.status === 'IN_PROGRESS' && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>Live tracking active</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {trip.status === 'IN_PROGRESS' && (
                      <Link href={`/logistics/tracking/${trip.id}`}>
                        <Button variant="outline" size="sm">
                          <Navigation className="mr-2 h-4 w-4" />
                          Track
                        </Button>
                      </Link>
                    )}
                    <Link href={`/logistics/trips/${trip.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
