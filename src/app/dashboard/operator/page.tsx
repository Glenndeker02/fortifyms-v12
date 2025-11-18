'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Activity,
  Package,
  Wrench,
  BookOpen,
  AlertCircle,
  TrendingUp,
  Award,
  Plus,
  CheckCircle2,
  Clock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

interface OperatorAnalytics {
  todayFocus: {
    batchesToday: number;
    scheduledBatches: number;
    maintenanceDue: number;
    pendingDiagnostics: number;
    pendingTraining: number;
  };
  myPerformance: {
    batchesThisMonth: number;
    qcPassRate: number;
    trainingCompleted: number;
    safetyIncidents: number;
  };
  recentActivity: {
    batches: Array<{
      id: string;
      batchNumber: string;
      productionLine: string;
      quantityProduced: number;
      status: string;
      createdAt: string;
    }>;
    maintenance: Array<{
      id: string;
      title: string;
      scheduledDate: string;
      priority: string;
      equipment: {
        name: string;
        type: string;
      };
    }>;
    training: Array<{
      status: string;
      progress: number;
      course: {
        title: string;
        difficulty: string;
      };
    }>;
  };
}

export default function OperatorDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<OperatorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/mill-operator');
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to fetch analytics');
        return;
      }

      setAnalytics(data.data);
    } catch (err) {
      setError('An error occurred while fetching analytics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      QC_APPROVED: 'bg-green-100 text-green-800',
      QC_FAILED: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-green-100 text-green-800',
    };

    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={fetchAnalytics}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {session?.user?.name}
        </p>
      </div>

      {/* Today's Focus */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Today's Focus</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Batches Today</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.todayFocus.batchesToday}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.todayFocus.scheduledBatches} scheduled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maintenance Due</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.todayFocus.maintenanceDue}
              </div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Diagnostics</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.todayFocus.pendingDiagnostics}
              </div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Training</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.todayFocus.pendingTraining}
              </div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card className="bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              <Plus className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <Button
                size="sm"
                className="w-full"
                onClick={() => router.push('/batches/new')}
              >
                New Batch
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* My Performance */}
      <div>
        <h2 className="text-xl font-semibold mb-4">My Performance This Month</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Batches Logged</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.myPerformance.batchesThisMonth}
              </div>
              <p className="text-xs text-muted-foreground">Total batches</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">QC Pass Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.myPerformance.qcPassRate}%
              </div>
              <Progress value={analytics.myPerformance.qcPassRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Training Completed</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.myPerformance.trainingCompleted}
              </div>
              <p className="text-xs text-muted-foreground">Courses finished</p>
            </CardContent>
          </Card>

          <Card
            className={
              analytics.myPerformance.safetyIncidents === 0
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Safety Incidents</CardTitle>
              {analytics.myPerformance.safetyIncidents === 0 ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.myPerformance.safetyIncidents}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.myPerformance.safetyIncidents === 0
                  ? 'Excellent safety record!'
                  : 'Needs attention'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Batches */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Batches</CardTitle>
            <CardDescription>Your latest production batches</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.recentActivity.batches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No batches logged yet
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.recentActivity.batches.slice(0, 5).map((batch) => (
                  <div
                    key={batch.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/batches/${batch.id}`)}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{batch.batchNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {batch.productionLine} • {batch.quantityProduced} kg
                      </div>
                    </div>
                    {getStatusBadge(batch.status)}
                  </div>
                ))}
              </div>
            )}
            {analytics.recentActivity.batches.length > 0 && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => router.push('/batches')}
              >
                View All Batches
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Maintenance */}
        <Card>
          <CardHeader>
            <CardTitle>My Maintenance Tasks</CardTitle>
            <CardDescription>Tasks assigned to you</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.recentActivity.maintenance.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No maintenance tasks assigned
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.recentActivity.maintenance.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/maintenance/tasks/${task.id}`)}
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {task.title || `${task.equipment.name} Maintenance`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {task.equipment.type}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(task.scheduledDate).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        task.priority === 'CRITICAL' || task.priority === 'HIGH'
                          ? 'bg-red-50 text-red-700 border-red-300'
                          : ''
                      }
                    >
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            {analytics.recentActivity.maintenance.length > 0 && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => router.push('/maintenance')}
              >
                View All Tasks
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Training Progress */}
      {analytics.recentActivity.training.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Training in Progress</CardTitle>
            <CardDescription>Continue your learning journey</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.recentActivity.training.map((training, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{training.course.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {training.course.difficulty}
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {Math.round(training.progress)}%
                    </div>
                  </div>
                  <Progress value={training.progress} />
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => router.push('/training')}
            >
              View All Courses
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
