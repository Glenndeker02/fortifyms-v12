/**
 * Assessment Builder Component
 *
 * Creates formative and summative assessments with:
 * - Multiple assessment types (formative, summative, diagnostic)
 * - Adaptive difficulty based on performance
 * - Detailed feedback and explanations
 * - Progress tracking
 * - Remediation recommendations
 */

import { useState, useCallback } from 'react';
import {
  BookOpen,
  Brain,
  Target,
  TrendingUp,
  Award,
  AlertCircle,
} from 'lucide-react';

import { QuizComponent, QuizData, QuizQuestion } from './QuizComponent';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export type AssessmentType = 'formative' | 'summative' | 'diagnostic';

export interface Assessment {
  id: string;
  title: string;
  description: string;
  type: AssessmentType;
  moduleId?: string;
  coursId?: string;
  questions: QuizQuestion[];
  timeLimit?: number;
  passingScore: number;
  allowReview: boolean;
  adaptiveDifficulty?: boolean;
  remediationContent?: {
    weakTopics: string[];
    recommendedCourses: string[];
    practiceQuizzes: string[];
  };
}

export interface AssessmentBuilderProps {
  assessment: Assessment;
  onComplete: (
    score: number,
    passed: boolean,
    answers: Record<string, any>,
    weakTopics?: string[]
  ) => void;
  onExit?: () => void;
}

export function AssessmentBuilder({
  assessment,
  onComplete,
  onExit,
}: AssessmentBuilderProps) {
  const [showIntro, setShowIntro] = useState(true);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);

  const handleQuizComplete = useCallback(
    (score: number, passed: boolean, answers: Record<string, any>) => {
      // Analyze weak topics based on answers
      const identified = identifyWeakTopics(assessment.questions, answers);
      setWeakTopics(identified);

      onComplete(score, passed, answers, identified);
    },
    [assessment.questions, onComplete]
  );

  const identifyWeakTopics = (
    questions: QuizQuestion[],
    answers: Record<string, any>
  ): string[] => {
    // This is a simplified version - in production, questions would have topic tags
    const incorrect: string[] = [];

    questions.forEach((question) => {
      const userAnswer = answers[question.id];
      const isCorrect =
        question.type === 'fill_blank'
          ? userAnswer?.toString().toLowerCase().trim() ===
            question.correctAnswer.toString().toLowerCase().trim()
          : userAnswer === question.correctAnswer;

      if (!isCorrect) {
        // Extract topic from question text (simplified)
        if (question.question.toLowerCase().includes('moisture')) {
          incorrect.push('Moisture Control');
        } else if (question.question.toLowerCase().includes('temperature')) {
          incorrect.push('Temperature Management');
        } else if (question.question.toLowerCase().includes('speed')) {
          incorrect.push('Mill Speed');
        } else if (question.question.toLowerCase().includes('safety')) {
          incorrect.push('Safety Procedures');
        }
      }
    });

    return Array.from(new Set(incorrect));
  };

  const getAssessmentTypeInfo = (type: AssessmentType) => {
    switch (type) {
      case 'formative':
        return {
          icon: Brain,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: 'Formative Assessment',
          description:
            'This assessment helps you check your understanding as you learn. Results will guide your learning path.',
        };
      case 'summative':
        return {
          icon: Award,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          title: 'Summative Assessment',
          description:
            'This is a final assessment to evaluate your mastery of the material. Your performance will be recorded.',
        };
      case 'diagnostic':
        return {
          icon: Target,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: 'Diagnostic Assessment',
          description:
            'This assessment identifies your current knowledge level and areas for improvement.',
        };
    }
  };

  const typeInfo = getAssessmentTypeInfo(assessment.type);
  const TypeIcon = typeInfo.icon;

  if (showIntro) {
    return (
      <div className="space-y-6">
        {/* Assessment Introduction */}
        <Card className={`border-2 ${typeInfo.borderColor} ${typeInfo.bgColor}`}>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg bg-white shadow-sm`}>
                <TypeIcon className={`h-8 w-8 ${typeInfo.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-2xl">{assessment.title}</CardTitle>
                  <Badge variant="outline" className="capitalize">
                    {assessment.type}
                  </Badge>
                </div>
                <CardDescription className="text-base">
                  {assessment.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{typeInfo.title}</AlertTitle>
              <AlertDescription>{typeInfo.description}</AlertDescription>
            </Alert>

            {/* Assessment Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span>Questions</span>
                </div>
                <p className="text-2xl font-bold">{assessment.questions.length}</p>
              </div>

              {assessment.timeLimit && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Brain className="h-4 w-4" />
                    <span>Time Limit</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {Math.floor(assessment.timeLimit / 60)} min
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  <span>Passing Score</span>
                </div>
                <p className="text-2xl font-bold">{assessment.passingScore}%</p>
              </div>
            </div>

            {/* Assessment Type Specific Info */}
            {assessment.type === 'formative' && (
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertTitle>Low-Stakes Practice</AlertTitle>
                <AlertDescription>
                  This assessment is for practice only. You can retake it multiple
                  times to improve your understanding.
                </AlertDescription>
              </Alert>
            )}

            {assessment.type === 'summative' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>High-Stakes Assessment</AlertTitle>
                <AlertDescription>
                  Your score on this assessment will be recorded and may affect
                  your certification. Make sure you're ready before starting.
                </AlertDescription>
              </Alert>
            )}

            {assessment.adaptiveDifficulty && (
              <Alert>
                <Brain className="h-4 w-4" />
                <AlertTitle>Adaptive Assessment</AlertTitle>
                <AlertDescription>
                  Question difficulty will adjust based on your performance.
                </AlertDescription>
              </Alert>
            )}

            {/* Start Button */}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowIntro(false)}
                size="lg"
                className="flex-1"
              >
                Start Assessment
              </Button>
              {onExit && (
                <Button onClick={onExit} variant="outline" size="lg">
                  Exit
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Convert Assessment to QuizData format
  const quizData: QuizData = {
    id: assessment.id,
    title: assessment.title,
    description: assessment.description,
    questions: assessment.questions,
    timeLimit: assessment.timeLimit,
    passingScore: assessment.passingScore,
    allowReview: assessment.allowReview,
  };

  return (
    <div className="space-y-4">
      {/* Assessment Type Banner */}
      <Card className={`border-2 ${typeInfo.borderColor} ${typeInfo.bgColor} py-3`}>
        <CardContent className="py-0">
          <div className="flex items-center gap-2">
            <TypeIcon className={`h-5 w-5 ${typeInfo.color}`} />
            <span className="font-semibold">{typeInfo.title}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">
              Passing score: {assessment.passingScore}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Quiz Component */}
      <QuizComponent
        quiz={quizData}
        onComplete={handleQuizComplete}
        onExit={onExit}
      />
    </div>
  );
}

/**
 * Assessment Results Component
 * Displays results with remediation recommendations
 */
export interface AssessmentResultsProps {
  assessment: Assessment;
  score: number;
  passed: boolean;
  weakTopics: string[];
  onRetake?: () => void;
  onViewRemediation?: () => void;
  onExit?: () => void;
}

export function AssessmentResults({
  assessment,
  score,
  passed,
  weakTopics,
  onRetake,
  onViewRemediation,
  onExit,
}: AssessmentResultsProps) {
  const typeInfo = {
    formative: {
      icon: Brain,
      color: 'text-blue-600',
    },
    summative: {
      icon: Award,
      color: 'text-purple-600',
    },
    diagnostic: {
      icon: Target,
      color: 'text-green-600',
    },
  }[assessment.type];

  const TypeIcon = typeInfo.icon;

  return (
    <div className="space-y-6">
      {/* Score Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TypeIcon className={`h-8 w-8 ${typeInfo.color}`} />
              <div>
                <CardTitle>Assessment Complete</CardTitle>
                <CardDescription>{assessment.title}</CardDescription>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{Math.round(score)}%</div>
              <Badge variant={passed ? 'default' : 'destructive'} className="mt-2">
                {passed ? 'Passed' : 'Not Passed'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={score} className="h-3" />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Required Score</p>
              <p className="font-semibold">{assessment.passingScore}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Your Score</p>
              <p className="font-semibold">{Math.round(score)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weak Topics / Remediation */}
      {weakTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Areas for Improvement</CardTitle>
            <CardDescription>
              Focus on these topics to strengthen your understanding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {weakTopics.map((topic, idx) => (
                <Badge key={idx} variant="outline">
                  {topic}
                </Badge>
              ))}
            </div>

            {assessment.remediationContent && onViewRemediation && (
              <Button onClick={onViewRemediation} className="w-full">
                View Recommended Learning Resources
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {assessment.type === 'formative' && onRetake && (
          <Button onClick={onRetake} variant="outline" className="flex-1">
            Retake Assessment
          </Button>
        )}
        {onExit && (
          <Button onClick={onExit} className="flex-1">
            {passed ? 'Continue' : 'Review Material'}
          </Button>
        )}
      </div>
    </div>
  );
}
