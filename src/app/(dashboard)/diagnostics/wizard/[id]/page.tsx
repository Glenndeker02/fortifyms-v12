'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useToast } from '@/components/ui/use-toast';

import { QuestionRenderer } from '@/components/diagnostics/QuestionRenderer';
import { DiagnosticProgress } from '@/components/diagnostics/DiagnosticProgress';
import {
  Question,
  Questionnaire,
  DiagnosticResponses,
  getVisibleQuestions,
  getTriggeredQuestions,
  calculateProgress,
  canSubmitDiagnostic,
  getNextUnansweredQuestion,
} from '@/lib/diagnostic-logic';

export default function DiagnosticWizardPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const diagnosticId = params.id as string;

  // State
  const [loading, setLoading] = useState(true);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [responses, setResponses] = useState<DiagnosticResponses>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived state
  const visibleQuestions = questionnaire
    ? getVisibleQuestions(questionnaire.questions, responses)
    : [];

  const currentQuestion = visibleQuestions[currentStep];
  const currentResponse = currentQuestion ? responses[currentQuestion.id] : undefined;
  const progress = calculateProgress(responses, visibleQuestions);
  const canSubmit = questionnaire ? canSubmitDiagnostic(responses, visibleQuestions) : false;

  // Fetch questionnaire data
  useEffect(() => {
    fetchDiagnosticData();
  }, [diagnosticId]);

  const fetchDiagnosticData = async () => {
    try {
      setLoading(true);

      // Try to load existing diagnostic result (for resume functionality)
      const resultResponse = await fetch(`/api/diagnostics/results/${diagnosticId}`);

      if (resultResponse.ok) {
        const resultData = await resultResponse.json();

        if (resultData.success) {
          const diagnostic = resultData.data;

          // Parse saved responses
          const savedResponses = diagnostic.responses
            ? JSON.parse(diagnostic.responses)
            : {};

          setResponses(savedResponses);
          setCurrentStep(diagnostic.currentStep || 0);

          // Fetch questionnaire structure
          // Note: In a real implementation, you'd fetch this from the backend
          // For now, we'll reconstruct it from the diagnostic category/subcategory
          await fetchQuestionnaireTemplate(
            diagnostic.category,
            diagnostic.subcategory
          );
        }
      } else {
        toast({
          title: 'Error',
          description: 'Diagnostic not found',
          variant: 'destructive',
        });
        router.push('/diagnostics');
      }
    } catch (error) {
      console.error('Error fetching diagnostic:', error);
      toast({
        title: 'Error',
        description: 'Failed to load diagnostic',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestionnaireTemplate = async (
    category: string,
    subcategory: string
  ) => {
    try {
      const response = await fetch('/api/diagnostics/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, subcategory }),
      });

      const data = await response.json();

      if (data.questionnaire) {
        setQuestionnaire({
          id: diagnosticId,
          title: data.questionnaire.title,
          category,
          subcategory,
          questions: data.questionnaire.questions,
        });
      }
    } catch (error) {
      console.error('Error fetching questionnaire template:', error);
    }
  };

  // Auto-save functionality
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      if (Object.keys(responses).length > 0 && questionnaire) {
        autoSave();
      }
    }, 5000); // Auto-save after 5 seconds of inactivity

    return () => clearTimeout(saveTimer);
  }, [responses, currentStep]);

  const autoSave = async () => {
    try {
      setIsSaving(true);

      await fetch('/api/diagnostics/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosticId,
          responses,
          currentStep,
        }),
      });

      setLastSaved(new Date());

      // Also save to localStorage as backup
      localStorage.setItem(
        `diagnostic_${diagnosticId}`,
        JSON.stringify({
          responses,
          currentStep,
          savedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle response change
  const handleResponseChange = useCallback(
    (questionId: string, value: any) => {
      setResponses((prev) => ({
        ...prev,
        [questionId]: value,
      }));

      // Check if this response triggers new questions
      if (questionnaire && currentQuestion) {
        const triggered = getTriggeredQuestions(
          currentQuestion,
          value,
          questionnaire.questions
        );

        if (triggered.length > 0) {
          // New questions were triggered - they'll appear in the visible questions
          console.log('Triggered new questions:', triggered);
        }
      }
    },
    [questionnaire, currentQuestion]
  );

  // Navigation handlers
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < visibleQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    if (!currentQuestion?.required && currentStep < visibleQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSubmitClick = () => {
    if (canSubmit) {
      setShowSubmitDialog(true);
    } else {
      const nextUnanswered = getNextUnansweredQuestion(responses, visibleQuestions);
      if (nextUnanswered) {
        const index = visibleQuestions.findIndex((q) => q.id === nextUnanswered.id);
        if (index !== -1) {
          setCurrentStep(index);
        }
        toast({
          title: 'Incomplete Diagnostic',
          description: 'Please answer all required questions before submitting.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      const response = await fetch('/api/diagnostics/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosticId,
          responses,
          currentStep: visibleQuestions.length - 1,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'completed') {
        // Clear localStorage backup
        localStorage.removeItem(`diagnostic_${diagnosticId}`);

        toast({
          title: 'Diagnostic Complete',
          description: 'Your diagnostic has been submitted successfully.',
        });

        // Navigate to results page
        router.push(`/diagnostics/results/${diagnosticId}`);
      } else {
        toast({
          title: 'Submission Failed',
          description: data.error || 'Failed to submit diagnostic',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while submitting',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      setShowSubmitDialog(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // No questionnaire loaded
  if (!questionnaire) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Questionnaire Not Found</h2>
            <p className="text-muted-foreground mb-6">
              Unable to load the diagnostic questionnaire.
            </p>
            <Button onClick={() => router.push('/diagnostics')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Diagnostics
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLastQuestion = currentStep === visibleQuestions.length - 1;
  const hasCurrentResponse =
    currentResponse !== undefined &&
    currentResponse !== null &&
    currentResponse !== '';

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/diagnostics')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{questionnaire.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{questionnaire.category}</Badge>
            <span className="text-muted-foreground">›</span>
            <Badge variant="outline">{questionnaire.subcategory}</Badge>
          </div>
        </div>
      </div>

      {/* Progress Component */}
      <DiagnosticProgress
        currentStep={currentStep}
        totalSteps={visibleQuestions.length}
        progress={progress}
        canGoBack={currentStep > 0}
        canGoNext={hasCurrentResponse || !currentQuestion?.required}
        canSkip={!currentQuestion?.required}
        isLastQuestion={isLastQuestion}
        isSaving={isSaving}
        lastSaved={lastSaved}
        onBack={handleBack}
        onNext={handleNext}
        onSkip={handleSkip}
        onSubmit={handleSubmitClick}
      />

      {/* Current Question Card */}
      {currentQuestion && (
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">Question {currentStep + 1}</CardTitle>
                <CardDescription className="mt-2">
                  {currentQuestion.required ? (
                    <span className="text-orange-600 font-medium">Required</span>
                  ) : (
                    <span className="text-muted-foreground">Optional</span>
                  )}
                </CardDescription>
              </div>

              {currentQuestion.conditional && (
                <Badge variant="secondary">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Follow-up Question
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <QuestionRenderer
              question={currentQuestion}
              value={currentResponse}
              onChange={(value) => handleResponseChange(currentQuestion.id, value)}
            />
          </CardContent>
        </Card>
      )}

      {/* Completion Summary (shown on last question) */}
      {isLastQuestion && hasCurrentResponse && (
        <Card className="border-green-500 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              Ready to Submit
            </CardTitle>
            <CardDescription className="text-green-700">
              You've answered all required questions. Review your responses or submit your
              diagnostic.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">Total Questions:</span>
                <span className="font-medium text-green-900">
                  {visibleQuestions.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Answered:</span>
                <span className="font-medium text-green-900">
                  {
                    visibleQuestions.filter(
                      (q) =>
                        responses[q.id] !== undefined &&
                        responses[q.id] !== null &&
                        responses[q.id] !== ''
                    ).length
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Completion:</span>
                <span className="font-medium text-green-900">{progress}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Diagnostic?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit this diagnostic? Once submitted, you won't
              be able to change your answers. The system will analyze your responses and
              provide recommendations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Submit Diagnostic
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
