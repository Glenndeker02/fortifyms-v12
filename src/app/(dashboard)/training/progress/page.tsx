'use client';

/**
 * Training Progress Dashboard
 *
 * User's learning progress dashboard with:
 * - Overall learning statistics
 * - Courses in progress
 * - Completed courses
 * - Earned certificates
 * - Learning streak
 * - Skill development tracking
 * - Leaderboard position
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  Award,
  BookOpen,
  Clock,
  TrendingUp,
  Calendar,
  Target,
  Flame,
  Star,
  CheckCircle2,
  Play,
  Download,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

interface CourseProgress {
  id: string;
  title: string;
  category: string;
  progress: number;
  lastAccessed: string;
  totalLessons: number;
  completedLessons: number;
  thumbnailUrl: string;
}

interface CompletedCourse {
  id: string;
  title: string;
  category: string;
  completedDate: string;
  score: number;
  certificateId: string;
  instructor: string;
}

interface LearningStats {
  totalCoursesEnrolled: number;
  totalCoursesCompleted: number;
  totalLessonsCompleted: number;
  totalLearningTimeMinutes: number;
  currentStreak: number;
  longestStreak: number;
  certificatesEarned: number;
  averageScore: number;
  rank: number;
  totalUsers: number;
}

export default function TrainingProgressPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [coursesInProgress, setCoursesInProgress] = useState<CourseProgress[]>([]);
  const [completedCourses, setCompletedCourses] = useState<CompletedCourse[]>([]);

  useEffect(() => {
    fetchProgressData();
  }, []);

  const fetchProgressData = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual API calls
      await new Promise((resolve) => setTimeout(resolve, 500));

      setStats({
        totalCoursesEnrolled: 6,
        totalCoursesCompleted: 2,
        totalLessonsCompleted: 24,
        totalLearningTimeMinutes: 720,
        currentStreak: 5,
        longestStreak: 12,
        certificatesEarned: 2,
        averageScore: 92,
        rank: 15,
        totalUsers: 234,
      });

      setCoursesInProgress([
        {
          id: 'course-1',
          title: 'Moisture Control Best Practices',
          category: 'Grain Quality',
          progress: 65,
          lastAccessed: '2024-01-15T10:30:00',
          totalLessons: 8,
          completedLessons: 5,
          thumbnailUrl: '/images/courses/moisture.jpg',
        },
        {
          id: 'course-4',
          title: 'Safety Protocols and Procedures',
          category: 'Safety',
          progress: 30,
          lastAccessed: '2024-01-14T14:20:00',
          totalLessons: 5,
          completedLessons: 2,
          thumbnailUrl: '/images/courses/safety.jpg',
        },
      ]);

      setCompletedCourses([
        {
          id: 'course-2',
          title: 'Temperature Management Fundamentals',
          category: 'Equipment Operation',
          completedDate: '2024-01-10T16:00:00',
          score: 95,
          certificateId: 'CERT-2024-001',
          instructor: 'John Smith',
        },
        {
          id: 'course-6',
          title: 'Preventive Maintenance Essentials',
          category: 'Maintenance',
          completedDate: '2024-01-05T11:30:00',
          score: 89,
          certificateId: 'CERT-2024-002',
          instructor: 'Tom Wilson',
        },
      ]);
    } catch (error) {
      console.error('Error fetching progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatLearningTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading || !stats) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, idx) => (
            <Skeleton key={idx} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Learning Progress</h1>
        <p className="text-muted-foreground mt-1">
          Track your courses, achievements, and skill development
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Courses Enrolled */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Courses Enrolled</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCoursesEnrolled}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalCoursesCompleted} completed
            </p>
            <Progress
              value={(stats.totalCoursesCompleted / stats.totalCoursesEnrolled) * 100}
              className="mt-2"
            />
          </CardContent>
        </Card>

        {/* Learning Time */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Learning Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatLearningTime(stats.totalLearningTimeMinutes)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalLessonsCompleted} lessons completed
            </p>
          </CardContent>
        </Card>

        {/* Current Streak */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {stats.currentStreak}
              <Flame className="h-6 w-6 text-orange-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Longest: {stats.longestStreak} days
            </p>
          </CardContent>
        </Card>

        {/* Certificates */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Certificates Earned</CardTitle>
            <Award className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.certificatesEarned}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg score: {stats.averageScore}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Average Score</span>
                <span className="font-semibold">{stats.averageScore}%</span>
              </div>
              <Progress value={stats.averageScore} className="h-2" />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Leaderboard Rank</p>
                <p className="text-2xl font-bold">
                  #{stats.rank}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Out of</p>
                <p className="text-lg font-semibold">{stats.totalUsers} users</p>
              </div>
            </div>

            <Button variant="outline" className="w-full">
              <Trophy className="mr-2 h-4 w-4" />
              View Leaderboard
            </Button>
          </CardContent>
        </Card>

        {/* Goals Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Learning Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Complete 5 courses this month</span>
                <span className="font-medium">2/5</span>
              </div>
              <Progress value={40} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Maintain 7-day streak</span>
                <span className="font-medium">5/7</span>
              </div>
              <Progress value={71} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Earn 3 certificates</span>
                <span className="font-medium">2/3</span>
              </div>
              <Progress value={67} className="h-2" />
            </div>

            <Separator />

            <Button variant="outline" className="w-full">
              <Calendar className="mr-2 h-4 w-4" />
              Set New Goals
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Courses Tabs */}
      <Tabs defaultValue="in-progress">
        <TabsList>
          <TabsTrigger value="in-progress">
            In Progress ({coursesInProgress.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedCourses.length})
          </TabsTrigger>
        </TabsList>

        {/* In Progress */}
        <TabsContent value="in-progress" className="space-y-4">
          {coursesInProgress.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Courses in Progress</h3>
                <p className="text-muted-foreground mb-4">
                  Start learning by enrolling in a course
                </p>
                <Button onClick={() => router.push('/training')}>
                  Browse Courses
                </Button>
              </CardContent>
            </Card>
          ) : (
            coursesInProgress.map((course) => (
              <Card key={course.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold">{course.title}</h3>
                          <Badge variant="outline">{course.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Last accessed {getRelativeTime(course.lastAccessed)}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">
                            {course.completedLessons} / {course.totalLessons} lessons
                            ({course.progress}%)
                          </span>
                        </div>
                        <Progress value={course.progress} className="h-2" />
                      </div>

                      <Button
                        onClick={() => router.push(`/training/courses/${course.id}`)}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Continue Learning
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Completed */}
        <TabsContent value="completed" className="space-y-4">
          {completedCourses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Completed Courses Yet</h3>
                <p className="text-muted-foreground">
                  Complete your first course to earn a certificate
                </p>
              </CardContent>
            </Card>
          ) : (
            completedCourses.map((course) => (
              <Card key={course.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold">{course.title}</h3>
                          <Badge variant="outline">{course.category}</Badge>
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Completed on{' '}
                          {new Date(course.completedDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-muted-foreground">Score: </span>
                          <span className="font-semibold text-primary">{course.score}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Instructor: </span>
                          <span className="font-medium">{course.instructor}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Award className="mr-2 h-4 w-4" />
                          View Certificate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/training/courses/${course.id}`)}
                        >
                          Review Course
                        </Button>
                      </div>
                    </div>

                    <Award className="h-12 w-12 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
