'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  BookOpen,
  Clock,
  Award,
  Play,
  CheckCircle2,
  Filter,
  Search,
  TrendingUp,
  Video,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: number;
  language: string;
  isActive: boolean;
  createdAt: string;
  modules: Array<{
    id: string;
    title: string;
    order: number;
  }>;
  _count: {
    modules: number;
    progress: number;
  };
  progress: Array<{
    id: string;
    status: string;
    progress: number;
    score: number | null;
    completedAt: string | null;
  }>;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function TrainingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 12,
    pages: 0,
  });

  useEffect(() => {
    fetchCourses();
  }, [pagination.page, activeTab]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        isActive: 'true',
      });

      if (activeTab !== 'all') {
        if (['Process-Specific', 'Equipment-Specific', 'Quality Assurance'].includes(activeTab)) {
          params.append('category', activeTab);
        } else if (activeTab === 'my-courses') {
          // Filter will be done client-side after fetching
        }
      }

      const response = await fetch(`/api/training/courses?${params}`);
      const data = await response.json();

      if (data.success) {
        let filteredCourses = data.data.courses;

        // Client-side filter for my-courses tab
        if (activeTab === 'my-courses') {
          filteredCourses = filteredCourses.filter((c: Course) => c.progress.length > 0);
        }

        setCourses(filteredCourses);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    const colors: Record<string, string> = {
      BEGINNER: 'bg-green-100 text-green-800',
      INTERMEDIATE: 'bg-yellow-100 text-yellow-800',
      ADVANCED: 'bg-red-100 text-red-800',
    };

    return (
      <Badge className={`${colors[difficulty] || 'bg-gray-100 text-gray-800'} hover:${colors[difficulty]}`}>
        {difficulty}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Play className="mr-1 h-3 w-3" />
            In Progress
          </Badge>
        );
      default:
        return null;
    }
  };

  const CourseCard = ({ course }: { course: Course }) => {
    const userProgress = course.progress[0];

    return (
      <Card
        className="cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => router.push(`/training/courses/${course.id}`)}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg mb-2">{course.title}</CardTitle>
              <div className="flex items-center gap-2 mb-2">
                {getDifficultyBadge(course.difficulty)}
                <Badge variant="outline">{course.category}</Badge>
                {userProgress && getStatusBadge(userProgress.status)}
              </div>
            </div>
            <Video className="h-8 w-8 text-primary" />
          </div>
          <CardDescription className="line-clamp-2">{course.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{course.duration} min</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>{course._count.modules} modules</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                <span>{course._count.progress} enrolled</span>
              </div>
            </div>

            {userProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{Math.round(userProgress.progress)}%</span>
                </div>
                <Progress value={userProgress.progress} />
                {userProgress.score !== null && (
                  <div className="text-sm text-muted-foreground">
                    Score: <span className="font-medium">{userProgress.score}%</span>
                  </div>
                )}
              </div>
            )}

            <Button
              className="w-full"
              variant={userProgress ? 'default' : 'outline'}
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/training/courses/${course.id}`);
              }}
            >
              {userProgress
                ? userProgress.status === 'COMPLETED'
                  ? 'Review Course'
                  : 'Continue Learning'
                : 'Start Course'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Training Library</h1>
          <p className="text-muted-foreground mt-1">
            Accessible, standardized training for fortification excellence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Award className="mr-2 h-4 w-4" />
            My Certificates
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  className="pl-8 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Difficulty
            </Button>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Language
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Course Categories Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Courses</TabsTrigger>
          <TabsTrigger value="my-courses">My Courses</TabsTrigger>
          <TabsTrigger value="Process-Specific">Process Training</TabsTrigger>
          <TabsTrigger value="Equipment-Specific">Equipment</TabsTrigger>
          <TabsTrigger value="Quality Assurance">Quality Assurance</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {courses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2">No Courses Found</h2>
                <p className="text-muted-foreground">
                  {activeTab === 'my-courses'
                    ? "You haven't enrolled in any courses yet."
                    : 'No courses available in this category.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} courses
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
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
