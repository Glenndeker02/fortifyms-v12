/**
 * Dynamic Question Renderer Component
 *
 * Renders different question types with appropriate inputs and validation
 */

import { useState } from 'react';
import { HelpCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Question, validateResponse } from '@/lib/diagnostic-logic';

interface QuestionRendererProps {
  question: Question;
  value: any;
  onChange: (value: any) => void;
  onValidate?: (valid: boolean) => void;
}

export function QuestionRenderer({
  question,
  value,
  onChange,
  onValidate,
}: QuestionRendererProps) {
  const [touched, setTouched] = useState(false);
  const validation = touched ? validateResponse(question, value) : { valid: true };

  const handleChange = (newValue: any) => {
    onChange(newValue);
    setTouched(true);

    const newValidation = validateResponse(question, newValue);
    onValidate?.(newValidation.valid);
  };

  const handleBlur = () => {
    setTouched(true);
    const newValidation = validateResponse(question, value);
    onValidate?.(newValidation.valid);
  };

  // Check if value is out of expected range (for warnings)
  const isOutOfRange = question.type === 'numeric' &&
    question.expectedRange &&
    value !== undefined &&
    value !== null &&
    value !== '' &&
    !isNaN(parseFloat(value)) &&
    (parseFloat(value) < question.expectedRange.min ||
      parseFloat(value) > question.expectedRange.max);

  return (
    <div className="space-y-4">
      {/* Question Label with Help */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <Label className="text-base font-medium">
            {question.question}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        </div>

        {question.help && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{question.help}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Expected Range Info (for numeric questions) */}
      {question.type === 'numeric' && question.expectedRange && (
        <div className="text-sm text-muted-foreground">
          Expected range: {question.expectedRange.min} - {question.expectedRange.max}
          {question.unit && ` ${question.unit}`}
        </div>
      )}

      {/* Question Input */}
      {renderQuestionInput()}

      {/* Out of Range Warning */}
      {isOutOfRange && (
        <Alert variant="warning" className="border-yellow-500 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Value is outside expected range ({question.expectedRange!.min}-
            {question.expectedRange!.max}
            {question.unit})
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Error */}
      {touched && !validation.valid && validation.error && (
        <Alert variant="destructive">
          <AlertDescription>{validation.error}</AlertDescription>
        </Alert>
      )}

      {/* Success Indicator */}
      {touched && validation.valid && value && !isOutOfRange && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span>Answer recorded</span>
        </div>
      )}
    </div>
  );

  function renderQuestionInput() {
    switch (question.type) {
      case 'numeric':
        return (
          <div className="flex gap-2">
            <Input
              type="number"
              step="any"
              value={value ?? ''}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
              placeholder={`Enter value${question.unit ? ` (${question.unit})` : ''}`}
              className="text-lg"
            />
            {question.unit && (
              <div className="flex items-center px-3 bg-muted rounded-md border">
                <span className="text-sm font-medium text-muted-foreground">
                  {question.unit}
                </span>
              </div>
            )}
          </div>
        );

      case 'yes_no':
        return (
          <div className="flex gap-4">
            <Button
              type="button"
              variant={value === 'yes' ? 'default' : 'outline'}
              onClick={() => handleChange('yes')}
              className="flex-1 h-12 text-base"
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={value === 'no' ? 'default' : 'outline'}
              onClick={() => handleChange('no')}
              className="flex-1 h-12 text-base"
            >
              No
            </Button>
          </div>
        );

      case 'dropdown':
        return (
          <Select value={value ?? ''} onValueChange={handleChange}>
            <SelectTrigger className="text-lg h-12">
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option} className="text-base">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return <div className="text-muted-foreground">Unsupported question type</div>;
    }
  }
}
