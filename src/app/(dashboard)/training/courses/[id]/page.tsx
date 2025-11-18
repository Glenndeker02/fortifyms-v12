'use client';

/**
 * Training Course Detail Page
 *
 * Displays course overview and module list with:
 * - Course information (title, description, instructor, duration)
 * - Module/lesson list with progress tracking
 * - Enroll functionality
 * - Start/continue learning
 * - Course curriculum accordion
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  Clock,
  BookOpen,
  Award,
  Users,
  Lock,
  PlayCircle,
  FileText,
  Download,
  Share2,
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
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: number; // seconds
  videoUrl: string;
  isCompleted: boolean;
  isLocked: boolean;
  hasQuiz: boolean;
  order: number;
}

interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  order: number;
}

interface CourseDetail {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  category: string;
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: number; // minutes
  enrollmentCount: number;
  rating: number;
  thumbnailUrl: string;
  instructor: {
    name: string;
    title: string;
    avatarUrl: string;
    bio: string;
  };
  modules: Module[];
  learningObjectives: string[];
  prerequisites: string[];
  isEnrolled: boolean;
  progress: number; // 0-100
  certificateAvailable: boolean;
  lastAccessedLessonId?: string;
}

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const courseId = params.id as string;

  // State
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);

  useEffect(() => {
    fetchCourseDetail();
  }, [courseId]);

  const fetchCourseDetail = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual API call
      // const response = await fetch(`/api/training/courses/${courseId}`);
      // const data = await response.json();
      // setCourse(data.course);

      // Mock data
      await new Promise((resolve) => setTimeout(resolve, 500));
      setCourse({
        id: courseId,
        title: 'Moisture Control Best Practices',
        description: 'Learn advanced techniques for maintaining optimal moisture levels',
        longDescription:
          'This comprehensive course covers everything you need to know about moisture control in grain processing. From understanding the science behind moisture content to implementing best practices in your daily operations, this course will equip you with the knowledge and skills to maintain optimal grain quality.',
        category: 'Grain Quality',
        skillLevel: 'Intermediate',
        duration: 120,
        enrollmentCount: 234,
        rating: 4.8,
        thumbnailUrl: '/images/courses/moisture-control.jpg',
        instructor: {
          name: 'Dr. Sarah Johnson',
          title: 'Senior Grain Quality Expert',
          avatarUrl: '/images/instructors/sarah.jpg',
          bio: 'Dr. Johnson has over 20 years of experience in grain quality management and has trained thousands of mill technicians worldwide.',
        },
        modules: [
          {
            id: 'module-1',
            title: 'Introduction to Moisture Control',
            description: 'Fundamentals of moisture measurement and control',
            order: 1,
            lessons: [
              {
                id: 'lesson-1',
                title: 'Understanding Moisture Content',
                description: 'Learn the basics of grain moisture and why it matters',
                duration: 480,
                videoUrl: 'https://example.com/video1.mp4',
                isCompleted: true,
                isLocked: false,
                hasQuiz: false,
                order: 1,
              },
              {
                id: 'lesson-2',
                title: 'Moisture Measurement Techniques',
                description: 'Different methods for measuring moisture content',
                duration: 600,
                videoUrl: 'https://example.com/video2.mp4',
                isCompleted: true,
                isLocked: false,
                hasQuiz: true,
                order: 2,
              },
              {
                id: 'lesson-3',
                title: 'Common Moisture-Related Issues',
                description: 'Identifying and preventing moisture problems',
                duration: 420,
                videoUrl: 'https://example.com/video3.mp4',
                isCompleted: false,
                isLocked: false,
                hasQuiz: false,
                order: 3,
              },
            ],
          },
          {
            id: 'module-2',
            title: 'Advanced Control Systems',
            description: 'Modern moisture control technologies and systems',
            order: 2,
            lessons: [
              {
                id: 'lesson-4',
                title: 'Automated Moisture Control',
                description: 'Understanding automated control systems',
                duration: 540,
                videoUrl: 'https://example.com/video4.mp4',
                isCompleted: false,
                isLocked: false,
                hasQuiz: false,
                order: 1,
              },
              {
                id: 'lesson-5',
                title: 'Sensor Calibration',
                description: 'How to calibrate moisture sensors properly',
                duration: 660,
                videoUrl: 'https://example.com/video5.mp4',
                isCompleted: false,
                isLocked: true,
                hasQuiz: true,
                order: 2,
              },
            ],
          },
          {
            id: 'module-3',
            title: 'Best Practices and Troubleshooting',
            description: 'Practical application and problem-solving',
            order: 3,
            lessons: [
              {
                id: 'lesson-6',
                title: 'Daily Operating Procedures',
                description: 'Standard operating procedures for moisture control',
                duration: 480,
                videoUrl: 'https://example.com/video6.mp4',
                isCompleted: false,
                isLocked: true,
                hasQuiz: false,
                order: 1,
              },
              {
                id: 'lesson-7',
                title: 'Troubleshooting Common Problems',
                description: 'How to diagnose and fix moisture issues',
                duration: 720,
                videoUrl: 'https://example.com/video7.mp4',
                isCompleted: false,
                isLocked: true,
                hasQuiz: true,
                order: 2,
              },
              {
                id: 'lesson-8',
                title: 'Final Assessment',
                description: 'Test your knowledge and earn your certificate',
                duration: 300,
                videoUrl: '',
                isCompleted: false,
                isLocked: true,
                hasQuiz: true,
                order: 3,
              },
            ],
          },
        ],
        learningObjectives: [
          'Understand the science behind grain moisture content',
          'Master different moisture measurement techniques',
          'Operate and calibrate moisture control systems',
          'Identify and troubleshoot moisture-related issues',
          'Implement best practices for optimal grain quality',
        ],
        prerequisites: [
          'Basic understanding of grain processing',
          'Familiarity with mill operations',
        ],
        isEnrolled: true,
        progress: 35,
        certificateAvailable: false,
        lastAccessedLessonId: 'lesson-3',
      });
    } catch (error) {
      console.error('Error fetching course:', error);
      toast({
        title: 'Error',
        description: 'Failed to load course details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    try {
      setIsEnrolling(true);

      // TODO: API call to enroll
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setCourse((prev) => (prev ? { ...prev, isEnrolled: true, progress: 0 } : null));

      toast({
        title: 'Enrolled Successfully',
        description: 'You can now start learning',
      });

      // Start first lesson
      if (course?.modules[0]?.lessons[0]) {
        handleStartLesson(course.modules[0].lessons[0].id);
      }
    } catch (error) {
      toast({
        title: 'Enrollment Failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleStartLesson = (lessonId: string) => {
    router.push(`/training/courses/${courseId}/lessons/${lessonId}`);
  };

  const handleContinueLearning = () => {
    if (course?.lastAccessedLessonId) {
      handleStartLesson(course.lastAccessedLessonId);
    } else {
      // Find first incomplete lesson
      for (const module of course?.modules || []) {
        const incompleteLesson = module.lessons.find((l) => !l.isCompleted && !l.isLocked);
        if (incompleteLesson) {
          handleStartLesson(incompleteLesson.id);
          return;
        }
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalLessons = (): number => {
    return course?.modules.reduce((sum, module) => sum + module.lessons.length, 0) || 0;
  };

  const getCompletedLessons = (): number => {
    return (
      course?.modules.reduce(
        (sum, module) => sum + module.lessons.filter((l) => l.isCompleted).length,
        0
      ) || 0
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Course Not Found</h2>
            <Button onClick={() => router.push('/training')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Library
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/training')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
          <p className="text-muted-foreground mt-1">{course.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle>Course Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{course.longDescription}</p>

              {/* Learning Objectives */}
              <div>
                <h3 className="font-semibold mb-2">What You'll Learn</h3>
                <ul className="space-y-2">
                  {course.learningObjectives.map((objective, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Prerequisites */}
              {course.prerequisites.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Prerequisites</h3>
                  <ul className="space-y-1">
                    {course.prerequisites.map((prereq, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span>•</span>
                        <span>{prereq}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructor Card */}
          <Card>
            <CardHeader>
              <CardTitle>About the Instructor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={course.instructor.avatarUrl} />
                  <AvatarFallback>
                    {course.instructor.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">{course.instructor.name}</h3>
                  <p className="text-sm text-muted-foreground">{course.instructor.title}</p>
                  <p className="text-sm mt-2">{course.instructor.bio}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Course Curriculum */}
          <Card>
            <CardHeader>
              <CardTitle>Course Curriculum</CardTitle>
              <CardDescription>
                {course.modules.length} modules • {getTotalLessons()} lessons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {course.modules.map((module, moduleIdx) => (
                  <AccordionItem key={module.id} value={module.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <span className="font-semibold">
                          Module {moduleIdx + 1}: {module.title}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {module.description}
                      </p>
                      <div className="space-y-2">
                        {module.lessons.map((lesson, lessonIdx) => (
                          <div
                            key={lesson.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              lesson.isLocked
                                ? 'bg-muted/50 cursor-not-allowed'
                                : 'hover:bg-accent cursor-pointer'
                            }`}
                            onClick={() => !lesson.isLocked && handleStartLesson(lesson.id)}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {lesson.isCompleted ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                              ) : lesson.isLocked ? (
                                <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <PlayCircle className="h-5 w-5 text-primary flex-shrink-0" />
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-sm">{lesson.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {lesson.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {lesson.hasQuiz && (
                                <FileText className="h-4 w-4" title="Has quiz" />
                              )}
                              <Clock className="h-4 w-4" />
                              <span>{formatDuration(lesson.duration)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Enrollment Card */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Progress */}
              {course.isEnrolled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} />
                  <p className="text-xs text-muted-foreground">
                    {getCompletedLessons()} of {getTotalLessons()} lessons completed
                  </p>
                </div>
              )}

              <Separator />

              {/* Action Button */}
              {course.isEnrolled ? (
                <Button className="w-full" size="lg" onClick={handleContinueLearning}>
                  <Play className="mr-2 h-4 w-4" />
                  {course.progress > 0 ? 'Continue Learning' : 'Start Course'}
                </Button>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleEnroll}
                  disabled={isEnrolling}
                >
                  {isEnrolling ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Enrolling...
                    </>
                  ) : (
                    <>
                      <BookOpen className="mr-2 h-4 w-4" />
                      Enroll Now
                    </>
                  )}
                </Button>
              )}

              {course.certificateAvailable && (
                <Button variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download Certificate
                </Button>
              )}

              <Button variant="outline" className="w-full">
                <Share2 className="mr-2 h-4 w-4" />
                Share Course
              </Button>
            </CardContent>
          </Card>

          {/* Course Info */}
          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Category</span>
                <Badge variant="outline">{course.category}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Skill Level</span>
                <Badge
                  variant={
                    course.skillLevel === 'Beginner'
                      ? 'secondary'
                      : course.skillLevel === 'Advanced'
                      ? 'destructive'
                      : 'default'
                  }
                >
                  {course.skillLevel}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="text-sm font-medium">
                  {Math.floor(course.duration / 60)}h {course.duration % 60}m
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Modules</span>
                <span className="text-sm font-medium">{course.modules.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Lessons</span>
                <span className="text-sm font-medium">{getTotalLessons()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Students</span>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">{course.enrollmentCount}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rating</span>
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">{course.rating}/5.0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
