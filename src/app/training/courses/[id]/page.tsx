'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Award,
  Play,
  CheckCircle2,
  Lock,
  Video,
  FileText,
  Download,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CourseDetail {
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
    content: string | null;
    videoUrl: string | null;
    order: number;
    isActive: boolean;
    quizzes: Array<{
      id: string;
      question: string;
      type: string;
      options: string | null;
      points: number;
      order: number;
    }>;
  }>;
  progress: Array<{
    id: string;
    status: string;
    progress: number;
    score: number | null;
    certificateId: string | null;
    completedAt: string | null;
  }>;
  _count: {
    modules: number;
    progress: number;
  };
}

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetchCourse();
  }, [params.id]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/training/courses/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to fetch course');
        return;
      }

      setCourse(data.data);
    } catch (err) {
      setError('An error occurred while fetching the course');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!course) return;

    try {
      setEnrolling(true);

      const response = await fetch('/api/training/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: course.id,
          status: 'IN_PROGRESS',
          progress: 0,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Refresh course data to show enrollment
        fetchCourse();
      } else {
        console.error('Failed to enroll:', result.error);
      }
    } catch (err) {
      console.error('Error enrolling:', err);
    } finally {
      setEnrolling(false);
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

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-96 md:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Course Not Found</h2>
            <p className="text-muted-foreground mb-6">
              {error || 'The requested course could not be found.'}
            </p>
            <Button onClick={() => router.push('/training')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Courses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userProgress = course.progress[0];
  const isEnrolled = !!userProgress;
  const isCompleted = userProgress?.status === 'COMPLETED';

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/training')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            {getDifficultyBadge(course.difficulty)}
            <Badge variant="outline">{course.category}</Badge>
            {isCompleted && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Completed
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Course Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Course Overview */}
          <Card>
            <CardHeader>
              <CardTitle>About This Course</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{course.description}</p>

              <Separator />

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Duration</div>
                  <div className="font-medium flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {course.duration} min
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Modules</div>
                  <div className="font-medium flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {course._count.modules}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Language</div>
                  <div className="font-medium">{course.language.toUpperCase()}</div>
                </div>
              </div>

              {isEnrolled && userProgress && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Your Progress</span>
                      <span className="font-medium">{Math.round(userProgress.progress)}%</span>
                    </div>
                    <Progress value={userProgress.progress} />
                    {userProgress.score !== null && (
                      <div className="text-sm text-muted-foreground">
                        Current Score: <span className="font-medium">{userProgress.score}%</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Course Modules */}
          <Card>
            <CardHeader>
              <CardTitle>Course Content</CardTitle>
              <CardDescription>
                {course.modules.length} modules • {course.duration} minutes total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {course.modules.map((module, index) => (
                  <div
                    key={module.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {isEnrolled ? (
                          <Play className="h-5 w-5 text-primary" />
                        ) : (
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">
                          {index + 1}. {module.title}
                        </div>
                        {module.content && (
                          <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {module.content}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                          {module.videoUrl && (
                            <div className="flex items-center gap-1">
                              <Video className="h-3 w-3" />
                              <span>Video</span>
                            </div>
                          )}
                          {module.quizzes.length > 0 && (
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span>{module.quizzes.length} quiz(zes)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {isEnrolled && (
                      <Button size="sm" variant="ghost">
                        Start
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Enrollment */}
        <div className="space-y-6">
          {/* Enrollment Card */}
          <Card>
            <CardHeader>
              <CardTitle>Enrollment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEnrolled ? (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Self-paced learning</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Certificate on completion</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Access to all modules</span>
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleEnroll} disabled={enrolling}>
                    {enrolling ? 'Enrolling...' : 'Enroll Now'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-center py-4">
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
                        <div className="font-semibold">Course Completed!</div>
                        {userProgress.certificateId && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Certificate: {userProgress.certificateId}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <Play className="h-12 w-12 text-primary mx-auto mb-2" />
                        <div className="font-semibold">In Progress</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {Math.round(userProgress.progress)}% complete
                        </div>
                      </>
                    )}
                  </div>
                  <Button className="w-full">
                    {isCompleted ? 'Review Course' : 'Continue Learning'}
                  </Button>
                  {isCompleted && userProgress.certificateId && (
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Download Certificate
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Course Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Course Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Enrolled</span>
                <span className="font-medium">{course._count.progress}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Difficulty</span>
                <span className="font-medium">{course.difficulty}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">{course.category}</span>
              </div>
            </CardContent>
          </Card>

          {/* What You'll Learn */}
          <Card>
            <CardHeader>
              <CardTitle>What You'll Learn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                  <span>Understand key fortification processes</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                  <span>Apply best practices in your operations</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                  <span>Ensure quality and compliance standards</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                  <span>Troubleshoot common issues</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
