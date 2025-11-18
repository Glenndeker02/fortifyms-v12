/**
 * Interactive Walkthrough Overlay Component
 *
 * Provides guided step-by-step instructions with:
 * - Spotlight/highlight on target elements
 * - Overlay with instructions
 * - Step navigation (next/previous/skip)
 * - Progress indicator
 * - Customizable positioning
 * - Keyboard navigation support
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

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
import { cn } from '@/lib/utils';

export interface WalkthroughStep {
  id: string;
  title: string;
  content: string;
  targetSelector?: string; // CSS selector for element to highlight
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'hover' | 'input' | 'none';
  actionText?: string; // Text to display for the action
  disableNext?: boolean; // Disable next until action is performed
  onBeforeNext?: () => void | Promise<void>;
  onBeforePrevious?: () => void | Promise<void>;
}

export interface WalkthroughOverlayProps {
  steps: WalkthroughStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onStepChange?: (stepIndex: number) => void;
  initialStep?: number;
  showProgress?: boolean;
  allowSkip?: boolean;
  className?: string;
}

export function WalkthroughOverlay({
  steps,
  isActive,
  onComplete,
  onSkip,
  onStepChange,
  initialStep = 0,
  showProgress = true,
  allowSkip = true,
  className,
}: WalkthroughOverlayProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStep);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [cardPosition, setCardPosition] = useState({ top: 0, left: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Find and highlight target element
  useEffect(() => {
    if (!isActive || !currentStep.targetSelector) {
      setTargetElement(null);
      return;
    }

    const element = document.querySelector<HTMLElement>(currentStep.targetSelector);
    if (element) {
      setTargetElement(element);
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }
  }, [currentStepIndex, currentStep, isActive]);

  // Calculate card position based on target element
  useEffect(() => {
    if (!targetElement || !cardRef.current) {
      // Center the card if no target
      setCardPosition({
        top: window.innerHeight / 2 - 200,
        left: window.innerWidth / 2 - 200,
      });
      return;
    }

    const targetRect = targetElement.getBoundingClientRect();
    const cardRect = cardRef.current.getBoundingClientRect();
    const placement = currentStep.placement || 'right';
    const offset = 20;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = targetRect.top - cardRect.height - offset;
        left = targetRect.left + targetRect.width / 2 - cardRect.width / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + offset;
        left = targetRect.left + targetRect.width / 2 - cardRect.width / 2;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - cardRect.height / 2;
        left = targetRect.left - cardRect.width - offset;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - cardRect.height / 2;
        left = targetRect.right + offset;
        break;
      case 'center':
        top = window.innerHeight / 2 - cardRect.height / 2;
        left = window.innerWidth / 2 - cardRect.width / 2;
        break;
    }

    // Ensure card stays within viewport
    const padding = 20;
    top = Math.max(padding, Math.min(top, window.innerHeight - cardRect.height - padding));
    left = Math.max(padding, Math.min(left, window.innerWidth - cardRect.width - padding));

    setCardPosition({ top, left });
  }, [targetElement, currentStep.placement]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && allowSkip) {
        onSkip();
      } else if (e.key === 'ArrowRight' && !isLastStep) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && !isFirstStep) {
        handlePrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isLastStep, isFirstStep, allowSkip, onSkip]);

  // Notify parent of step changes
  useEffect(() => {
    if (isActive) {
      onStepChange?.(currentStepIndex);
    }
  }, [currentStepIndex, isActive, onStepChange]);

  const handleNext = useCallback(async () => {
    if (currentStep.onBeforeNext) {
      await currentStep.onBeforeNext();
    }

    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [currentStep, isLastStep, onComplete]);

  const handlePrevious = useCallback(async () => {
    if (currentStep.onBeforePrevious) {
      await currentStep.onBeforePrevious();
    }

    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStep, isFirstStep]);

  const handleSkip = useCallback(() => {
    onSkip();
  }, [onSkip]);

  if (!isActive) return null;

  return (
    <div
      ref={overlayRef}
      className={cn(
        'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
        className
      )}
    >
      {/* Spotlight effect on target element */}
      {targetElement && (
        <>
          {/* Highlight overlay with cutout */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 51 }}
          >
            <defs>
              <mask id="spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={targetElement.getBoundingClientRect().left - 8}
                  y={targetElement.getBoundingClientRect().top - 8}
                  width={targetElement.getBoundingClientRect().width + 16}
                  height={targetElement.getBoundingClientRect().height + 16}
                  rx="8"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.3)"
              mask="url(#spotlight-mask)"
            />
          </svg>

          {/* Pulsing border around target */}
          <div
            className="absolute border-4 border-primary rounded-lg animate-pulse pointer-events-none"
            style={{
              top: targetElement.getBoundingClientRect().top - 8,
              left: targetElement.getBoundingClientRect().left - 8,
              width: targetElement.getBoundingClientRect().width + 16,
              height: targetElement.getBoundingClientRect().height + 16,
              zIndex: 52,
            }}
          />
        </>
      )}

      {/* Instruction Card */}
      <Card
        ref={cardRef}
        className="absolute w-96 shadow-2xl"
        style={{
          top: cardPosition.top,
          left: cardPosition.left,
          zIndex: 53,
        }}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">
                  Step {currentStepIndex + 1} of {steps.length}
                </Badge>
                {currentStep.action && currentStep.action !== 'none' && (
                  <Badge variant="secondary" className="capitalize">
                    {currentStep.action}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl">{currentStep.title}</CardTitle>
            </div>
            {allowSkip && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkip}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {currentStep.actionText && (
            <CardDescription className="mt-2 font-medium text-primary">
              {currentStep.actionText}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {currentStep.content}
          </p>

          {showProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={isFirstStep}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>

            <div className="flex gap-1">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'h-1.5 w-1.5 rounded-full transition-colors',
                    idx === currentStepIndex
                      ? 'bg-primary w-4'
                      : idx < currentStepIndex
                      ? 'bg-primary/50'
                      : 'bg-muted'
                  )}
                />
              ))}
            </div>

            <Button
              size="sm"
              onClick={handleNext}
              disabled={currentStep.disableNext}
            >
              {isLastStep ? (
                <>
                  Finish
                  <Check className="ml-1 h-4 w-4" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
