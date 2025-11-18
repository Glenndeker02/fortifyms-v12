'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Truck,
  MapPin,
  Clock,
  Package,
  User,
  Navigation,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function TripDetailPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTripDetails();
  }, []);

  const fetchTripDetails = async () => {
    try {
      const response = await fetch(`/api/delivery-trips/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setTrip(data.data.trip);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load trip details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrip = async () => {
    try {
      const response = await fetch(`/api/delivery-trips/${params.id}/start`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Trip started successfully' });
        fetchTripDetails();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCompleteTrip = async () => {
    try {
      const response = await fetch(`/api/delivery-trips/${params.id}/complete`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Trip completed successfully' });
        fetchTripDetails();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading || !trip) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading trip details...</div>
      </div>
    );
  }

  const orders = trip.orders ? JSON.parse(trip.orders) : [];
  const deliverySequence = trip.deliverySequence ? JSON.parse(trip.deliverySequence) : [];

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{trip.tripNumber}</h1>
            <Badge>{trip.status.replace('_', ' ')}</Badge>
          </div>
          <p className="text-muted-foreground">
            {trip.completedStops} of {trip.stops} stops completed
          </p>
        </div>

        <div className="flex gap-2">
          {trip.status === 'SCHEDULED' && (
            <Button onClick={handleStartTrip}>
              <Truck className="mr-2 h-4 w-4" />
              Start Trip
            </Button>
          )}
          {trip.status === 'IN_PROGRESS' && (
            <>
              <Link href={`/logistics/tracking/${trip.id}`}>
                <Button variant="outline">
                  <Navigation className="mr-2 h-4 w-4" />
                  Live Tracking
                </Button>
              </Link>
              <Link href={`/pod/create?tripId=${trip.id}&orderId=${orders[0]?.orderId}`}>
                <Button variant="outline">
                  <Package className="mr-2 h-4 w-4" />
                  Create POD
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Driver</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold">
              {trip.driver ? `${trip.driver.firstName} ${trip.driver.lastName}` : 'Not assigned'}
            </div>
            {trip.driver?.phoneNumber && (
              <p className="text-xs text-muted-foreground">{trip.driver.phoneNumber}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vehicle</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold">
              {trip.vehicle?.plateNumber || 'Not assigned'}
            </div>
            {trip.vehicle?.model && (
              <p className="text-xs text-muted-foreground">{trip.vehicle.model}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distance</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trip.totalDistance ? `${trip.totalDistance.toFixed(1)} km` : 'N/A'}
            </div>
            {trip.avgSpeed && (
              <p className="text-xs text-muted-foreground">
                Avg speed: {trip.avgSpeed.toFixed(1)} km/h
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {trip.startTime && trip.endTime ? (
              <>
                <div className="text-2xl font-bold">
                  {(
                    (new Date(trip.endTime).getTime() - new Date(trip.startTime).getTime()) /
                    (1000 * 60 * 60)
                  ).toFixed(1)}{' '}
                  hrs
                </div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </>
            ) : trip.startTime ? (
              <>
                <div className="text-2xl font-bold">In Progress</div>
                <p className="text-xs text-muted-foreground">
                  Started: {new Date(trip.startTime).toLocaleTimeString()}
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">Not started</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delivery Sequence */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Delivery Sequence</CardTitle>
        </CardHeader>
        <CardContent>
          {deliverySequence.length > 0 ? (
            <div className="space-y-4">
              {deliverySequence.map((stop: any, idx: number) => (
                <div
                  key={idx}
                  className={`flex items-start gap-4 p-4 border rounded-lg ${
                    stop.completed ? 'bg-muted' : ''
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      stop.completed
                        ? 'bg-primary text-primary-foreground'
                        : 'border-2 border-muted-foreground'
                    }`}
                  >
                    {stop.completed ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <span className="font-semibold">{stop.sequence}</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Stop {stop.sequence}</h4>
                      <Badge variant={stop.completed ? 'default' : 'outline'}>
                        {stop.completed ? 'Completed' : 'Pending'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Order ID:</span>
                        <p className="font-medium">{stop.orderId}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Location:</span>
                        <p className="font-medium">{stop.location?.address || 'N/A'}</p>
                      </div>
                      {stop.completed && stop.completedAt && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Completed at:</span>
                          <p className="font-medium">
                            {new Date(stop.completedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No delivery sequence available</p>
          )}
        </CardContent>
      </Card>

      {/* Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map((order: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-semibold">{order.orderId}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.commodity} • {order.quantity} MT
                    </p>
                  </div>
                  <Link href={`/purchase-orders/${order.orderId}`}>
                    <Button variant="outline" size="sm">
                      View Order
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No orders</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
