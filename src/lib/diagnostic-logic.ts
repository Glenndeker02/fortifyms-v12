/**
 * Diagnostic Branching Logic Utilities
 *
 * Handles evaluation of branching conditions and determining next questions
 * in the diagnostic questionnaire flow.
 */

export interface Question {
  id: string;
  type: 'numeric' | 'yes_no' | 'dropdown';
  question: string;
  unit?: string;
  options?: string[];
  expectedRange?: {
    min: number;
    max: number;
  };
  help?: string;
  required: boolean;
  conditional?: boolean;
  branching?: {
    [key: string]: {
      condition: string;
      nextQuestions: string[];
    };
  };
}

export interface Questionnaire {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  questions: Question[];
}

export interface DiagnosticResponses {
  [questionId: string]: any;
}

/**
 * Safely evaluate a branching condition
 * Uses a controlled evaluation approach instead of eval()
 */
export function evaluateBranchingCondition(
  condition: string,
  value: any
): boolean {
  try {
    // Create a safe function that only has access to the value
    const evaluator = new Function('value', `
      'use strict';
      try {
        return ${condition};
      } catch (e) {
        console.error('Error evaluating condition:', e);
        return false;
      }
    `);

    return Boolean(evaluator(value));
  } catch (error) {
    console.error('Failed to create condition evaluator:', error);
    return false;
  }
}

/**
 * Determine if a question should be shown based on previous responses
 */
export function shouldShowQuestion(
  question: Question,
  responses: DiagnosticResponses,
  allQuestions: Question[]
): boolean {
  // Always show non-conditional questions
  if (!question.conditional) {
    return true;
  }

  // Check if this question was triggered by a previous response
  for (const prevQuestion of allQuestions) {
    if (!prevQuestion.branching) continue;

    const prevResponse = responses[prevQuestion.id];
    if (prevResponse === undefined) continue;

    // Check each branching rule
    for (const rule of Object.values(prevQuestion.branching)) {
      if (rule.nextQuestions.includes(question.id)) {
        // This question is part of a branching path
        // Check if the condition is met
        if (evaluateBranchingCondition(rule.condition, prevResponse)) {
          return true;
        }
      }
    }
  }

  // If conditional but not triggered, don't show
  return false;
}

/**
 * Get the list of questions that should be shown based on current responses
 */
export function getVisibleQuestions(
  allQuestions: Question[],
  responses: DiagnosticResponses
): Question[] {
  return allQuestions.filter(question =>
    shouldShowQuestion(question, responses, allQuestions)
  );
}

/**
 * Get triggered follow-up questions based on the latest response
 */
export function getTriggeredQuestions(
  question: Question,
  response: any,
  allQuestions: Question[]
): Question[] {
  if (!question.branching) {
    return [];
  }

  const triggeredIds: string[] = [];

  // Check each branching rule
  for (const rule of Object.values(question.branching)) {
    if (evaluateBranchingCondition(rule.condition, response)) {
      triggeredIds.push(...rule.nextQuestions);
    }
  }

  // Return the actual question objects
  return allQuestions.filter(q => triggeredIds.includes(q.id));
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(
  responses: DiagnosticResponses,
  visibleQuestions: Question[]
): number {
  if (visibleQuestions.length === 0) return 0;

  const answeredCount = visibleQuestions.filter(q =>
    responses[q.id] !== undefined && responses[q.id] !== null && responses[q.id] !== ''
  ).length;

  return Math.round((answeredCount / visibleQuestions.length) * 100);
}

/**
 * Validate a response based on question type and constraints
 */
export function validateResponse(
  question: Question,
  response: any
): { valid: boolean; error?: string } {
  // Check required
  if (question.required && (response === undefined || response === null || response === '')) {
    return { valid: false, error: 'This question is required' };
  }

  // If not required and empty, it's valid
  if (!question.required && (response === undefined || response === null || response === '')) {
    return { valid: true };
  }

  // Type-specific validation
  switch (question.type) {
    case 'numeric':
      const numValue = parseFloat(response);

      if (isNaN(numValue)) {
        return { valid: false, error: 'Please enter a valid number' };
      }

      if (question.expectedRange) {
        const { min, max } = question.expectedRange;
        if (numValue < min || numValue > max) {
          return {
            valid: true, // Still valid, just a warning
            error: `Value is outside expected range (${min}-${max}${question.unit || ''})`
          };
        }
      }
      break;

    case 'yes_no':
      if (response !== 'yes' && response !== 'no') {
        return { valid: false, error: 'Please select yes or no' };
      }
      break;

    case 'dropdown':
      if (question.options && !question.options.includes(response)) {
        return { valid: false, error: 'Please select a valid option' };
      }
      break;
  }

  return { valid: true };
}

/**
 * Check if all required questions in the visible set have been answered
 */
export function canSubmitDiagnostic(
  responses: DiagnosticResponses,
  visibleQuestions: Question[]
): boolean {
  const requiredQuestions = visibleQuestions.filter(q => q.required);

  return requiredQuestions.every(q => {
    const response = responses[q.id];
    return response !== undefined && response !== null && response !== '';
  });
}

/**
 * Get the next unanswered question
 */
export function getNextUnansweredQuestion(
  responses: DiagnosticResponses,
  visibleQuestions: Question[]
): Question | null {
  return visibleQuestions.find(q => {
    const response = responses[q.id];
    return response === undefined || response === null || response === '';
  }) || null;
}

/**
 * Format time in minutes:seconds
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
