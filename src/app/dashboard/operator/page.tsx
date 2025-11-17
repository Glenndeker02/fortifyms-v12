import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Package,
  FlaskConical,
  Wrench,
  GraduationCap,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

export default function OperatorDashboard() {
  // TODO: Fetch real data from API
  const stats = {
    batchesToday: 5,
    pendingQC: 3,
    maintenanceTasks: 2,
    trainingProgress: 65,
  };

  const recentBatches = [
    {
      id: 'KEN001-L1-20250105-0001',
      product: 'Fortified Parboiled Rice',
      status: 'QC_PENDING',
      time: '2 hours ago',
    },
    {
      id: 'KEN001-L1-20250105-0002',
      product: 'Fortified Maize Flour',
      status: 'APPROVED',
      time: '4 hours ago',
    },
    {
      id: 'KEN001-L1-20250104-0015',
      product: 'Fortified Parboiled Rice',
      status: 'APPROVED',
      time: '1 day ago',
    },
  ];

  const upcomingTasks = [
    {
      title: 'Calibration: Doser Unit 1',
      due: 'Today, 2:00 PM',
      priority: 'high',
    },
    {
      title: 'QC Test: Batch KEN001-L1-20250105-0001',
      due: 'Today, 4:30 PM',
      priority: 'high',
    },
    {
      title: 'Training: Advanced QC Techniques',
      due: 'Tomorrow, 9:00 AM',
      priority: 'medium',
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mill Operator Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your production overview for today.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Batches Today</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.batchesToday}</div>
              <p className="text-xs text-muted-foreground">+2 from yesterday</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending QC</CardTitle>
              <FlaskConical className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingQC}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maintenance Tasks</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.maintenanceTasks}</div>
              <p className="text-xs text-muted-foreground">Due this week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Training Progress</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.trainingProgress}%</div>
              <Progress value={stats.trainingProgress} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Batches */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Batches</CardTitle>
              <CardDescription>Your latest production batches</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentBatches.map((batch) => (
                  <div
                    key={batch.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{batch.id}</p>
                      <p className="text-sm text-muted-foreground">{batch.product}</p>
                      <p className="text-xs text-muted-foreground">{batch.time}</p>
                    </div>
                    <Badge
                      variant={
                        batch.status === 'APPROVED'
                          ? 'default'
                          : batch.status === 'QC_PENDING'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {batch.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
              <Button asChild className="w-full mt-4" variant="outline">
                <Link href="/batches">View All Batches</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Tasks</CardTitle>
              <CardDescription>Your scheduled tasks and reminders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingTasks.map((task, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 border-b pb-3 last:border-0"
                  >
                    {task.priority === 'high' ? (
                      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{task.title}</p>
                      <p className="text-sm text-muted-foreground">{task.due}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button asChild className="w-full mt-4" variant="outline">
                <Link href="/maintenance">View All Tasks</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for daily operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button asChild className="h-auto flex-col gap-2 py-4">
                <Link href="/batches/new">
                  <Package className="h-6 w-6" />
                  <span>Log New Batch</span>
                </Link>
              </Button>
              <Button asChild className="h-auto flex-col gap-2 py-4" variant="outline">
                <Link href="/qc/new">
                  <FlaskConical className="h-6 w-6" />
                  <span>Record QC Test</span>
                </Link>
              </Button>
              <Button asChild className="h-auto flex-col gap-2 py-4" variant="outline">
                <Link href="/diagnostics">
                  <ClipboardList className="h-6 w-6" />
                  <span>Run Diagnostic</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
