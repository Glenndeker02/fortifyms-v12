/**
 * Diagnostic Progress Component
 *
 * Shows progress through the diagnostic questionnaire with navigation controls
 */

import { ArrowLeft, ArrowRight, Save, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface DiagnosticProgressProps {
  currentStep: number;
  totalSteps: number;
  progress: number;
  canGoBack: boolean;
  canGoNext: boolean;
  canSkip: boolean;
  isLastQuestion: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onSubmit: () => void;
}

export function DiagnosticProgress({
  currentStep,
  totalSteps,
  progress,
  canGoBack,
  canGoNext,
  canSkip,
  isLastQuestion,
  isSaving,
  lastSaved,
  onBack,
  onNext,
  onSkip,
  onSubmit,
}: DiagnosticProgressProps) {
  return (
    <div className="space-y-6">
      {/* Progress Bar Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="font-medium">
              Question {currentStep + 1} of {totalSteps}
            </span>
            <Badge variant="outline" className="font-normal">
              {Math.round(progress)}% Complete
            </Badge>
          </div>

          {/* Auto-save Indicator */}
          <div className="flex items-center gap-2 text-muted-foreground">
            {isSaving ? (
              <>
                <Save className="h-3 w-3 animate-spin" />
                <span className="text-xs">Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="text-xs">
                  Saved {formatTimeSince(lastSaved)}
                </span>
              </>
            ) : null}
          </div>
        </div>

        <Progress value={progress} className="h-2" />

        {/* Step Indicators (Optional - shows for smaller questionnaires) */}
        {totalSteps <= 10 && (
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div
                key={idx}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  idx < currentStep
                    ? 'bg-primary'
                    : idx === currentStep
                    ? 'bg-primary/50'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={onBack}
          disabled={!canGoBack}
          className="min-w-24"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Right Side Buttons */}
        <div className="flex gap-2">
          {/* Skip Button (for optional questions) */}
          {canSkip && !isLastQuestion && (
            <Button variant="ghost" onClick={onSkip}>
              Skip
            </Button>
          )}

          {/* Next or Submit Button */}
          {isLastQuestion ? (
            <Button
              onClick={onSubmit}
              disabled={!canGoNext}
              className="min-w-32"
              size="lg"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Submit Diagnostic
            </Button>
          ) : (
            <Button
              onClick={onNext}
              disabled={!canGoNext}
              className="min-w-24"
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return 'recently';
}
