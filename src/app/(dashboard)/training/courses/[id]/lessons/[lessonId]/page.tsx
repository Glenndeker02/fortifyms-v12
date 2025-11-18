'use client';

/**
 * Lesson Viewer Page
 *
 * Video player page with:
 * - Video playback with progress tracking
 * - Lesson navigation (previous/next)
 * - Knowledge checks at specific timestamps
 * - Notes and resources
 * - Auto-save progress
 * - Mark as complete
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
  BookOpen,
  Lock,
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
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { VideoPlayer } from '@/components/training/VideoPlayer';

interface LessonData {
  id: string;
  title: string;
  description: string;
  duration: number;
  videoUrl: string;
  moduleId: string;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
  hasQuiz: boolean;
  quizId?: string;
  resources: {
    id: string;
    title: string;
    type: 'pdf' | 'document' | 'link';
    url: string;
  }[];
  transcriptUrl?: string;
  knowledgeCheckPoints: number[]; // Timestamps in seconds
  previousLesson?: {
    id: string;
    title: string;
    isLocked: boolean;
  };
  nextLesson?: {
    id: string;
    title: string;
    isLocked: boolean;
  };
  userProgress: number; // 0-100
  isCompleted: boolean;
  userNotes?: string;
}

interface KnowledgeCheckQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export default function LessonViewerPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const courseId = params.id as string;
  const lessonId = params.lessonId as string;

  // State
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [userNotes, setUserNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showKnowledgeCheck, setShowKnowledgeCheck] = useState(false);
  const [currentKnowledgeCheck, setCurrentKnowledgeCheck] = useState<KnowledgeCheckQuestion | null>(null);
  const [knowledgeCheckAnswer, setKnowledgeCheckAnswer] = useState<number | null>(null);
  const [knowledgeCheckSubmitted, setKnowledgeCheckSubmitted] = useState(false);

  useEffect(() => {
    fetchLessonData();
  }, [lessonId]);

  const fetchLessonData = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual API call
      // const response = await fetch(`/api/training/lessons/${lessonId}`);
      // const data = await response.json();
      // setLesson(data.lesson);

      // Mock data
      await new Promise((resolve) => setTimeout(resolve, 500));
      setLesson({
        id: lessonId,
        title: 'Understanding Moisture Content',
        description: 'Learn the basics of grain moisture and why it matters for quality control',
        duration: 480,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        moduleId: 'module-1',
        moduleTitle: 'Introduction to Moisture Control',
        courseId: courseId,
        courseTitle: 'Moisture Control Best Practices',
        hasQuiz: true,
        quizId: 'quiz-1',
        resources: [
          {
            id: 'res-1',
            title: 'Moisture Content Guide (PDF)',
            type: 'pdf',
            url: '/resources/moisture-guide.pdf',
          },
          {
            id: 'res-2',
            title: 'Calibration Checklist',
            type: 'document',
            url: '/resources/calibration-checklist.pdf',
          },
        ],
        transcriptUrl: '/transcripts/lesson-1.txt',
        knowledgeCheckPoints: [120, 300], // Check at 2min and 5min
        previousLesson: undefined,
        nextLesson: {
          id: 'lesson-2',
          title: 'Moisture Measurement Techniques',
          isLocked: false,
        },
        userProgress: 45,
        isCompleted: false,
        userNotes: 'Important points to remember...',
      });

      setUserNotes('Important points to remember...');
      setCurrentProgress(45);
    } catch (error) {
      console.error('Error fetching lesson:', error);
      toast({
        title: 'Error',
        description: 'Failed to load lesson',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProgress = useCallback(async (progress: number) => {
    setCurrentProgress(progress);

    // Auto-save progress to backend
    try {
      // TODO: API call to save progress
      // await fetch(`/api/training/lessons/${lessonId}/progress`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ progress }),
      // });
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }, [lessonId]);

  const handleComplete = useCallback(async () => {
    try {
      // Mark lesson as complete
      // TODO: API call
      toast({
        title: 'Lesson Completed!',
        description: 'Great job! Continue to the next lesson.',
      });

      setLesson((prev) => (prev ? { ...prev, isCompleted: true } : null));

      // If there's a quiz, prompt to take it
      if (lesson?.hasQuiz) {
        toast({
          title: 'Quiz Available',
          description: 'Test your knowledge before moving on',
        });
      }
    } catch (error) {
      console.error('Failed to mark complete:', error);
    }
  }, [lesson, toast]);

  const handleKnowledgeCheck = useCallback((timestamp: number) => {
    // Load knowledge check question for this timestamp
    // TODO: Fetch from API based on timestamp
    setCurrentKnowledgeCheck({
      question: 'What is the optimal moisture content for wheat grain storage?',
      options: ['10-12%', '13-15%', '16-18%', '19-21%'],
      correctAnswer: 0,
      explanation: 'The optimal moisture content for wheat storage is 10-12% to prevent spoilage and maintain quality.',
    });
    setKnowledgeCheckAnswer(null);
    setKnowledgeCheckSubmitted(false);
    setShowKnowledgeCheck(true);
  }, []);

  const handleKnowledgeCheckSubmit = () => {
    setKnowledgeCheckSubmitted(true);
    if (knowledgeCheckAnswer === currentKnowledgeCheck?.correctAnswer) {
      toast({
        title: 'Correct!',
        description: 'Great job!',
      });
    } else {
      toast({
        title: 'Incorrect',
        description: 'Review the explanation and try again',
        variant: 'destructive',
      });
    }
  };

  const handleKnowledgeCheckContinue = () => {
    setShowKnowledgeCheck(false);
    // Video will resume automatically
  };

  const handleSaveNotes = async () => {
    try {
      setIsSavingNotes(true);

      // TODO: API call to save notes
      await new Promise((resolve) => setTimeout(resolve, 500));

      toast({
        title: 'Notes Saved',
        description: 'Your notes have been saved',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save notes',
        variant: 'destructive',
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleNavigate = (lessonId: string) => {
    router.push(`/training/courses/${courseId}/lessons/${lessonId}`);
  };

  const handleTakeQuiz = () => {
    if (lesson?.quizId) {
      router.push(`/training/courses/${courseId}/quizzes/${lesson.quizId}`);
    }
  };

  if (loading || !lesson) {
    return (
      <div className="container mx-auto p-6">
        <div className="aspect-video bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/training/courses/${courseId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>{lesson.courseTitle}</span>
              <span>›</span>
              <span>{lesson.moduleTitle}</span>
            </div>
          </div>
        </div>

        {lesson.isCompleted && (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player */}
          <VideoPlayer
            src={lesson.videoUrl}
            title={lesson.title}
            moduleId={lesson.moduleId}
            lessonId={lesson.id}
            onProgress={handleProgress}
            onComplete={handleComplete}
            onKnowledgeCheck={handleKnowledgeCheck}
            knowledgeCheckPoints={lesson.knowledgeCheckPoints}
            initialProgress={lesson.userProgress}
          />

          {/* Lesson Navigation */}
          <div className="flex items-center justify-between">
            {lesson.previousLesson ? (
              <Button
                variant="outline"
                onClick={() => handleNavigate(lesson.previousLesson!.id)}
                disabled={lesson.previousLesson.isLocked}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous: {lesson.previousLesson.title}
              </Button>
            ) : (
              <div />
            )}

            {lesson.nextLesson ? (
              <Button
                onClick={() => handleNavigate(lesson.nextLesson!.id)}
                disabled={lesson.nextLesson.isLocked}
              >
                Next: {lesson.nextLesson.title}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <div />
            )}
          </div>

          {/* Quiz Prompt */}
          {lesson.hasQuiz && lesson.isCompleted && (
            <Card className="border-primary bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Quiz Available</h3>
                    <p className="text-sm text-muted-foreground">
                      Test your knowledge before moving on
                    </p>
                  </div>
                  <Button onClick={handleTakeQuiz}>
                    <FileText className="mr-2 h-4 w-4" />
                    Take Quiz
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs: Overview, Resources, Notes */}
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="notes">My Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>About This Lesson</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{lesson.description}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resources" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Lesson Resources</CardTitle>
                  <CardDescription>
                    Downloadable materials and references
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {lesson.resources.length > 0 ? (
                    <div className="space-y-2">
                      {lesson.resources.map((resource) => (
                        <div
                          key={resource.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{resource.title}</p>
                              <p className="text-xs text-muted-foreground uppercase">
                                {resource.type}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No resources available for this lesson
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>My Notes</CardTitle>
                  <CardDescription>
                    Take notes while watching the lesson
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Write your notes here..."
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    rows={10}
                  />
                  <Button onClick={handleSaveNotes} disabled={isSavingNotes}>
                    {isSavingNotes ? 'Saving...' : 'Save Notes'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle>Your Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Video Progress</span>
                  <span className="font-medium">{Math.round(currentProgress)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${currentProgress}%` }}
                  />
                </div>
              </div>

              <Separator />

              {!lesson.isCompleted && currentProgress >= 95 && (
                <Button className="w-full" onClick={handleComplete}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark as Complete
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Lesson Info */}
          <Card>
            <CardHeader>
              <CardTitle>Lesson Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">
                  {Math.floor(lesson.duration / 60)}:{(lesson.duration % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Resources</span>
                <span className="font-medium">{lesson.resources.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Has Quiz</span>
                <Badge variant={lesson.hasQuiz ? 'default' : 'secondary'}>
                  {lesson.hasQuiz ? 'Yes' : 'No'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Knowledge Check Dialog */}
      <AlertDialog open={showKnowledgeCheck} onOpenChange={setShowKnowledgeCheck}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Knowledge Check</AlertDialogTitle>
            <AlertDialogDescription>
              Answer this question before continuing
            </AlertDialogDescription>
          </AlertDialogHeader>

          {currentKnowledgeCheck && (
            <div className="space-y-4">
              <p className="font-medium">{currentKnowledgeCheck.question}</p>
              <div className="space-y-2">
                {currentKnowledgeCheck.options.map((option, idx) => (
                  <div
                    key={idx}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      knowledgeCheckAnswer === idx
                        ? 'border-primary bg-primary/10'
                        : 'hover:bg-accent'
                    } ${
                      knowledgeCheckSubmitted
                        ? idx === currentKnowledgeCheck.correctAnswer
                          ? 'border-green-500 bg-green-50'
                          : idx === knowledgeCheckAnswer
                          ? 'border-red-500 bg-red-50'
                          : ''
                        : ''
                    }`}
                    onClick={() => !knowledgeCheckSubmitted && setKnowledgeCheckAnswer(idx)}
                  >
                    {option}
                  </div>
                ))}
              </div>

              {knowledgeCheckSubmitted && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Explanation:</p>
                  <p className="text-sm text-muted-foreground">
                    {currentKnowledgeCheck.explanation}
                  </p>
                </div>
              )}
            </div>
          )}

          <AlertDialogFooter>
            {!knowledgeCheckSubmitted ? (
              <>
                <AlertDialogCancel>Skip</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleKnowledgeCheckSubmit}
                  disabled={knowledgeCheckAnswer === null}
                >
                  Submit Answer
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction onClick={handleKnowledgeCheckContinue}>
                Continue
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
