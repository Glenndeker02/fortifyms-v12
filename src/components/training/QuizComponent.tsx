/**
 * Interactive Quiz Component
 *
 * Comprehensive quiz system with:
 * - Multiple question types (multiple choice, true/false, fill-in-blank)
 * - Timed quizzes
 * - Instant feedback
 * - Score tracking
 * - Review mode
 * - Progress saving
 */

import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Flag,
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank';
  question: string;
  options?: string[]; // For multiple choice
  correctAnswer: string | number;
  explanation: string;
  points: number;
}

export interface QuizData {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  timeLimit?: number; // seconds
  passingScore: number; // percentage
  allowReview: boolean;
}

interface QuizComponentProps {
  quiz: QuizData;
  onComplete: (score: number, passed: boolean, answers: Record<string, any>) => void;
  onExit?: () => void;
}

export function QuizComponent({ quiz, onComplete, onExit }: QuizComponentProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(quiz.timeLimit || null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showReview, setShowReview] = useState(false);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id];

  // Timer
  useEffect(() => {
    if (!quiz.timeLimit || isSubmitted) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [quiz.timeLimit, isSubmitted]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleFlagToggle = (questionId: string) => {
    setFlaggedQuestions((prev) => {
      const updated = new Set(prev);
      if (updated.has(questionId)) {
        updated.delete(questionId);
      } else {
        updated.add(questionId);
      }
      return updated;
    });
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleSubmit = () => {
    // Calculate score
    let totalPoints = 0;
    let earnedPoints = 0;

    quiz.questions.forEach((question) => {
      totalPoints += question.points;
      const userAnswer = answers[question.id];

      if (userAnswer !== undefined && userAnswer !== null && userAnswer !== '') {
        const isCorrect =
          question.type === 'fill_blank'
            ? userAnswer.toString().toLowerCase().trim() ===
              question.correctAnswer.toString().toLowerCase().trim()
            : userAnswer === question.correctAnswer;

        if (isCorrect) {
          earnedPoints += question.points;
        }
      }
    });

    const percentageScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    setScore(percentageScore);
    setIsSubmitted(true);

    const passed = percentageScore >= quiz.passingScore;
    onComplete(percentageScore, passed, answers);
  };

  const handleReview = () => {
    setShowReview(true);
    setCurrentQuestionIndex(0);
  };

  const getQuestionResult = (question: QuizQuestion): boolean | null => {
    if (!isSubmitted) return null;

    const userAnswer = answers[question.id];
    if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
      return false;
    }

    if (question.type === 'fill_blank') {
      return (
        userAnswer.toString().toLowerCase().trim() ===
        question.correctAnswer.toString().toLowerCase().trim()
      );
    }

    return userAnswer === question.correctAnswer;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = (): number => {
    return Object.keys(answers).filter(
      (key) => answers[key] !== undefined && answers[key] !== null && answers[key] !== ''
    ).length;
  };

  // Results view
  if (isSubmitted && !showReview) {
    const passed = score >= quiz.passingScore;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Quiz Results</CardTitle>
            <Badge variant={passed ? 'default' : 'destructive'} className="text-lg px-4 py-2">
              {Math.round(score)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant={passed ? 'default' : 'destructive'}>
            {passed ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {passed ? 'Congratulations! You Passed!' : 'You Did Not Pass'}
            </AlertTitle>
            <AlertDescription>
              {passed
                ? `You scored ${Math.round(score)}%. Great job!`
                : `You scored ${Math.round(score)}%. The passing score is ${quiz.passingScore}%.`}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Questions Answered</p>
              <p className="text-2xl font-bold">
                {getAnsweredCount()} / {quiz.questions.length}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Passing Score</p>
              <p className="text-2xl font-bold">{quiz.passingScore}%</p>
            </div>
          </div>

          <div className="flex gap-3">
            {quiz.allowReview && (
              <Button onClick={handleReview} variant="outline" className="flex-1">
                Review Answers
              </Button>
            )}
            {onExit && (
              <Button onClick={onExit} className="flex-1">
                {passed ? 'Continue' : 'Try Again Later'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Quiz view
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">{quiz.title}</h2>
              <p className="text-sm text-muted-foreground">{quiz.description}</p>
            </div>
            {timeRemaining !== null && !isSubmitted && (
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Clock className={`h-5 w-5 ${timeRemaining < 60 ? 'text-red-600' : ''}`} />
                <span className={timeRemaining < 60 ? 'text-red-600' : ''}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </span>
              <span className="font-medium">
                {getAnsweredCount()} / {quiz.questions.length} answered
              </span>
            </div>
            <Progress
              value={((currentQuestionIndex + 1) / quiz.questions.length) * 100}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl">
                Question {currentQuestionIndex + 1}
              </CardTitle>
              <CardDescription className="mt-2 text-base">
                {currentQuestion.question}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{currentQuestion.points} pts</Badge>
              {!isSubmitted && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleFlagToggle(currentQuestion.id)}
                >
                  <Flag
                    className={`h-4 w-4 ${
                      flaggedQuestions.has(currentQuestion.id)
                        ? 'fill-yellow-500 text-yellow-500'
                        : ''
                    }`}
                  />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Answer Input */}
          {currentQuestion.type === 'multiple_choice' && (
            <RadioGroup
              value={currentAnswer?.toString()}
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, parseInt(value))}
              disabled={isSubmitted}
            >
              {currentQuestion.options?.map((option, idx) => (
                <div
                  key={idx}
                  className={`flex items-center space-x-2 p-3 rounded-lg border ${
                    showReview
                      ? idx === currentQuestion.correctAnswer
                        ? 'border-green-500 bg-green-50'
                        : idx === currentAnswer
                        ? 'border-red-500 bg-red-50'
                        : ''
                      : ''
                  }`}
                >
                  <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                  <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                  {showReview && idx === currentQuestion.correctAnswer && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  {showReview && idx === currentAnswer && idx !== currentQuestion.correctAnswer && (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
              ))}
            </RadioGroup>
          )}

          {currentQuestion.type === 'true_false' && (
            <RadioGroup
              value={currentAnswer?.toString()}
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, value === 'true')}
              disabled={isSubmitted}
            >
              {['true', 'false'].map((option) => (
                <div
                  key={option}
                  className={`flex items-center space-x-2 p-3 rounded-lg border ${
                    showReview
                      ? (option === 'true') === currentQuestion.correctAnswer
                        ? 'border-green-500 bg-green-50'
                        : (option === 'true') === currentAnswer
                        ? 'border-red-500 bg-red-50'
                        : ''
                      : ''
                  }`}
                >
                  <RadioGroupItem value={option} id={`option-${option}`} />
                  <Label htmlFor={`option-${option}`} className="flex-1 cursor-pointer capitalize">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {currentQuestion.type === 'fill_blank' && (
            <div className="space-y-2">
              <Input
                placeholder="Type your answer here..."
                value={currentAnswer || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                disabled={isSubmitted}
              />
              {showReview && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Correct answer: </span>
                  <span className="font-medium">{currentQuestion.correctAnswer}</span>
                </p>
              )}
            </div>
          )}

          {/* Explanation (Review Mode) */}
          {showReview && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Explanation</AlertTitle>
              <AlertDescription>{currentQuestion.explanation}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            <div className="flex gap-2">
              {flaggedQuestions.size > 0 && !isSubmitted && (
                <Badge variant="secondary" className="gap-1">
                  <Flag className="h-3 w-3" />
                  {flaggedQuestions.size} flagged
                </Badge>
              )}
            </div>

            {currentQuestionIndex === quiz.questions.length - 1 && !isSubmitted ? (
              <Button onClick={handleSubmit}>Submit Quiz</Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={currentQuestionIndex === quiz.questions.length - 1}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Question Grid (for navigation) */}
      {!isSubmitted && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-10 gap-2">
              {quiz.questions.map((question, idx) => {
                const isAnswered = answers[question.id] !== undefined &&
                  answers[question.id] !== null &&
                  answers[question.id] !== '';
                const isFlagged = flaggedQuestions.has(question.id);
                const isCurrent = idx === currentQuestionIndex;

                return (
                  <button
                    key={question.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`aspect-square rounded-lg border-2 font-semibold text-sm transition-colors ${
                      isCurrent
                        ? 'border-primary bg-primary text-primary-foreground'
                        : isAnswered
                        ? 'border-green-500 bg-green-50'
                        : isFlagged
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-muted hover:bg-accent'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
