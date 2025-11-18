'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Navigation, Clock, TrendingUp, Activity } from 'lucide-react';

interface TripTracking {
  trip: any;
  tracking: {
    points: any[];
    latest: any;
    eta: string | null;
  };
}

export default function TripTrackingPage({ params }: { params: { tripId: string } }) {
  const { toast } = useToast();
  const [data, setData] = useState<TripTracking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchTracking = async () => {
    try {
      const response = await fetch(`/api/tracking/trip/${params.tripId}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load tracking data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading tracking data...</div>
      </div>
    );
  }

  const { trip, tracking } = data;
  const latest = tracking.latest;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{trip.tripNumber}</h1>
          <Badge variant={trip.status === 'IN_PROGRESS' ? 'default' : 'secondary'}>
            {trip.status.replace('_', ' ')}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Real-time tracking • Last update: {latest ? new Date(latest.timestamp).toLocaleString() : 'N/A'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Current Location */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Location</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {latest ? (
              <>
                <div className="text-2xl font-bold">
                  {latest.latitude.toFixed(4)}, {latest.longitude.toFixed(4)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Accuracy: {latest.accuracy ? `±${latest.accuracy}m` : 'N/A'}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">No location data</p>
            )}
          </CardContent>
        </Card>

        {/* Speed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Speed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latest?.speed ? `${latest.speed.toFixed(1)} km/h` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Battery: {latest?.batteryLevel ? `${latest.batteryLevel}%` : 'N/A'}
            </p>
          </CardContent>
        </Card>

        {/* ETA */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ETA to Next Stop</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {tracking.eta ? (
              <>
                <div className="text-2xl font-bold">
                  {new Date(tracking.eta).toLocaleTimeString()}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {Math.round((new Date(tracking.eta).getTime() - Date.now()) / 60000)} min remaining
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">Calculating...</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trip Progress */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Trip Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Stops Completed</span>
              <span className="text-sm font-medium">
                {trip.completedStops} / {trip.stops}
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(trip.completedStops / trip.stops) * 100}%` }}
              />
            </div>
          </div>

          {trip.deliverySequence && (
            <div className="mt-6 space-y-3">
              <h4 className="font-semibold">Delivery Sequence</h4>
              {JSON.parse(trip.deliverySequence).map((stop: any, idx: number) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 border rounded-lg ${
                    stop.completed ? 'bg-muted' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      stop.completed
                        ? 'bg-primary text-primary-foreground'
                        : 'border-2 border-muted-foreground'
                    }`}
                  >
                    {stop.sequence}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Stop {stop.sequence}</p>
                    <p className="text-sm text-muted-foreground">{stop.location?.address || 'Location'}</p>
                    {stop.completed && (
                      <p className="text-xs text-muted-foreground">
                        Completed: {new Date(stop.completedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Badge variant={stop.completed ? 'default' : 'outline'}>
                    {stop.completed ? 'Complete' : 'Pending'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Tracking Points */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Tracking Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tracking.points.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No tracking data yet</p>
          ) : (
            <div className="space-y-2">
              {tracking.points.slice(0, 10).map((point: any, idx: number) => (
                <div key={point.id} className="flex items-center justify-between p-2 border rounded text-sm">
                  <div>
                    <span className="font-medium">
                      {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                    </span>
                    {point.speed && <span className="text-muted-foreground ml-2">• {point.speed.toFixed(1)} km/h</span>}
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(point.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
