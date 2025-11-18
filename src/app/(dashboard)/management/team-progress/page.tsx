'use client';

/**
 * Manager Dashboard - Team Progress Tracking
 *
 * Comprehensive team oversight with:
 * - Team member progress overview
 * - Training completion rates
 * - Diagnostic activity tracking
 * - Performance metrics
 * - Compliance tracking
 * - Export and reporting
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  TrendingUp,
  Award,
  Clock,
  AlertCircle,
  Download,
  Filter,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  Target,
  BookOpen,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatarUrl?: string;
  stats: {
    coursesEnrolled: number;
    coursesCompleted: number;
    certificatesEarned: number;
    averageScore: number;
    lastActivity: string;
    totalLearningTime: number; // minutes
    diagnosticsCompleted: number;
    simulationsCompleted: number;
    complianceStatus: 'compliant' | 'at-risk' | 'non-compliant';
  };
}

interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  averageCompletionRate: number;
  totalCertificates: number;
  complianceRate: number;
  atRiskMembers: number;
}

const MOCK_TEAM_MEMBERS: TeamMember[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@example.com',
    role: 'Mill Technician',
    department: 'Operations',
    stats: {
      coursesEnrolled: 8,
      coursesCompleted: 6,
      certificatesEarned: 5,
      averageScore: 92,
      lastActivity: '2024-01-15T10:30:00',
      totalLearningTime: 480,
      diagnosticsCompleted: 12,
      simulationsCompleted: 4,
      complianceStatus: 'compliant',
    },
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    role: 'Quality Supervisor',
    department: 'Quality Control',
    stats: {
      coursesEnrolled: 6,
      coursesCompleted: 5,
      certificatesEarned: 4,
      averageScore: 88,
      lastActivity: '2024-01-14T16:20:00',
      totalLearningTime: 360,
      diagnosticsCompleted: 8,
      simulationsCompleted: 3,
      complianceStatus: 'compliant',
    },
  },
  {
    id: '3',
    name: 'Michael Chen',
    email: 'mchen@example.com',
    role: 'Mill Technician',
    department: 'Operations',
    stats: {
      coursesEnrolled: 5,
      coursesCompleted: 2,
      certificatesEarned: 2,
      averageScore: 75,
      lastActivity: '2024-01-10T09:15:00',
      totalLearningTime: 180,
      diagnosticsCompleted: 4,
      simulationsCompleted: 1,
      complianceStatus: 'at-risk',
    },
  },
  {
    id: '4',
    name: 'Emily Rodriguez',
    email: 'emily.r@example.com',
    role: 'Safety Officer',
    department: 'Safety',
    stats: {
      coursesEnrolled: 4,
      coursesCompleted: 4,
      certificatesEarned: 4,
      averageScore: 95,
      lastActivity: '2024-01-15T14:45:00',
      totalLearningTime: 320,
      diagnosticsCompleted: 6,
      simulationsCompleted: 2,
      complianceStatus: 'compliant',
    },
  },
  {
    id: '5',
    name: 'David Brown',
    email: 'dbrown@example.com',
    role: 'Mill Technician',
    department: 'Operations',
    stats: {
      coursesEnrolled: 3,
      coursesCompleted: 1,
      certificatesEarned: 1,
      averageScore: 68,
      lastActivity: '2024-01-05T11:30:00',
      totalLearningTime: 90,
      diagnosticsCompleted: 2,
      simulationsCompleted: 0,
      complianceStatus: 'non-compliant',
    },
  },
];

export default function TeamProgressPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedCompliance, setSelectedCompliance] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      setTeamMembers(MOCK_TEAM_MEMBERS);

      // Calculate team stats
      const stats: TeamStats = {
        totalMembers: MOCK_TEAM_MEMBERS.length,
        activeMembers: MOCK_TEAM_MEMBERS.filter(
          (m) =>
            new Date().getTime() - new Date(m.stats.lastActivity).getTime() <
            7 * 24 * 60 * 60 * 1000
        ).length,
        averageCompletionRate:
          MOCK_TEAM_MEMBERS.reduce(
            (sum, m) =>
              sum +
              (m.stats.coursesEnrolled > 0
                ? (m.stats.coursesCompleted / m.stats.coursesEnrolled) * 100
                : 0),
            0
          ) / MOCK_TEAM_MEMBERS.length,
        totalCertificates: MOCK_TEAM_MEMBERS.reduce(
          (sum, m) => sum + m.stats.certificatesEarned,
          0
        ),
        complianceRate:
          (MOCK_TEAM_MEMBERS.filter((m) => m.stats.complianceStatus === 'compliant')
            .length /
            MOCK_TEAM_MEMBERS.length) *
          100,
        atRiskMembers: MOCK_TEAM_MEMBERS.filter(
          (m) => m.stats.complianceStatus === 'at-risk'
        ).length,
      };

      setTeamStats(stats);
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter team members
  const filteredMembers = teamMembers.filter((member) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !member.name.toLowerCase().includes(query) &&
        !member.email.toLowerCase().includes(query) &&
        !member.role.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Department filter
    if (selectedDepartment !== 'all' && member.department !== selectedDepartment) {
      return false;
    }

    // Compliance filter
    if (
      selectedCompliance !== 'all' &&
      member.stats.complianceStatus !== selectedCompliance
    ) {
      return false;
    }

    return true;
  });

  // Sort team members
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'completion':
        const aRate =
          a.stats.coursesEnrolled > 0
            ? (a.stats.coursesCompleted / a.stats.coursesEnrolled) * 100
            : 0;
        const bRate =
          b.stats.coursesEnrolled > 0
            ? (b.stats.coursesCompleted / b.stats.coursesEnrolled) * 100
            : 0;
        return bRate - aRate;
      case 'score':
        return b.stats.averageScore - a.stats.averageScore;
      case 'activity':
        return (
          new Date(b.stats.lastActivity).getTime() -
          new Date(a.stats.lastActivity).getTime()
        );
      default:
        return 0;
    }
  });

  const departments = Array.from(new Set(teamMembers.map((m) => m.department)));

  const getComplianceBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Compliant
          </Badge>
        );
      case 'at-risk':
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            At Risk
          </Badge>
        );
      case 'non-compliant':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Non-Compliant
          </Badge>
        );
      default:
        return null;
    }
  };

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const handleExportReport = () => {
    // TODO: Implement export functionality
    alert('Export functionality coming soon');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Progress</h1>
          <p className="text-muted-foreground mt-1">
            Monitor training completion and compliance across your team
          </p>
        </div>
        <Button onClick={handleExportReport}>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Team Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-3xl font-bold">{teamStats?.totalMembers}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {teamStats?.activeMembers} active this week
                </p>
              </div>
              <Users className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Completion</p>
                <p className="text-3xl font-bold">
                  {Math.round(teamStats?.averageCompletionRate || 0)}%
                </p>
                <Progress
                  value={teamStats?.averageCompletionRate || 0}
                  className="mt-2"
                />
              </div>
              <TrendingUp className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Certificates</p>
                <p className="text-3xl font-bold">{teamStats?.totalCertificates}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Earned by team
                </p>
              </div>
              <Award className="h-10 w-10 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compliance</p>
                <p className="text-3xl font-bold">
                  {Math.round(teamStats?.complianceRate || 0)}%
                </p>
                <p className="text-xs text-destructive mt-1">
                  {teamStats?.atRiskMembers} at risk
                </p>
              </div>
              <Target className="h-10 w-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCompliance} onValueChange={setSelectedCompliance}>
              <SelectTrigger>
                <SelectValue placeholder="All Compliance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Compliance</SelectItem>
                <SelectItem value="compliant">Compliant</SelectItem>
                <SelectItem value="at-risk">At Risk</SelectItem>
                <SelectItem value="non-compliant">Non-Compliant</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="completion">Completion Rate</SelectItem>
                <SelectItem value="score">Average Score</SelectItem>
                <SelectItem value="activity">Recent Activity</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members ({sortedMembers.length})</CardTitle>
          <CardDescription>
            Detailed progress tracking for each team member
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMembers.map((member) => {
                const completionRate =
                  member.stats.coursesEnrolled > 0
                    ? (member.stats.coursesCompleted / member.stats.coursesEnrolled) *
                      100
                    : 0;

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.avatarUrl} />
                          <AvatarFallback>
                            {member.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{member.role}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.department}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {member.stats.coursesCompleted}/
                            {member.stats.coursesEnrolled}
                          </span>
                          <span className="font-medium">
                            {Math.round(completionRate)}%
                          </span>
                        </div>
                        <Progress value={completionRate} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-yellow-600" />
                          <span>{member.stats.certificatesEarned}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-600" />
                          <span>{member.stats.averageScore}%</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getComplianceBadge(member.stats.complianceStatus)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getRelativeTime(member.stats.lastActivity)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/management/team-progress/${member.id}`)
                        }
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
