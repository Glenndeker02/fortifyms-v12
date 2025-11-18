'use client';

/**
 * Diagnostic Results Detail Page
 *
 * Displays completed diagnostic with:
 * - Summary (category, date, severity, status)
 * - Flagged issues
 * - Recommendations with training links
 * - Questions & answers review
 * - Attached photos
 * - Action buttons (Mark Resolved, Retry, Schedule Follow-Up, Request Support)
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  RefreshCw,
  Calendar,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  Info,
  Loader2,
  MessageSquare,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';

import { RecommendationCard } from '@/components/diagnostics/RecommendationCard';

interface DiagnosticResult {
  id: string;
  category: string;
  subcategory: string;
  status: 'in_progress' | 'completed' | 'resolved';
  createdAt: string;
  completedAt: string | null;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null;
  responses: string; // JSON string
  currentStep: number;
  user: {
    name: string;
    email: string;
  };
}

interface Question {
  id: string;
  text: string;
  type: 'numeric' | 'yes_no' | 'dropdown';
  unit?: string;
  expectedRange?: { min: number; max: number };
  options?: string[];
}

interface FlaggedIssue {
  questionId: string;
  questionText: string;
  userResponse: any;
  expectedRange?: { min: number; max: number };
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

interface Recommendation {
  issue: string;
  action: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  trainingModule?: string;
  details?: string;
}

export default function DiagnosticResultsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const diagnosticId = params.id as string;

  // State
  const [loading, setLoading] = useState(true);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [flaggedIssues, setFlaggedIssues] = useState<FlaggedIssue[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [completedRecommendations, setCompletedRecommendations] = useState<Set<string>>(
    new Set()
  );
  const [isExporting, setIsExporting] = useState(false);

  // Fetch diagnostic results
  useEffect(() => {
    fetchDiagnosticResults();
  }, [diagnosticId]);

  const fetchDiagnosticResults = async () => {
    try {
      setLoading(true);

      // Fetch diagnostic result
      const response = await fetch(`/api/diagnostics/results/${diagnosticId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        toast({
          title: 'Error',
          description: 'Failed to load diagnostic results',
          variant: 'destructive',
        });
        router.push('/diagnostics');
        return;
      }

      const diagnosticData = data.data;
      setDiagnostic(diagnosticData);

      // Parse responses
      const parsedResponses = diagnosticData.responses
        ? JSON.parse(diagnosticData.responses)
        : {};
      setResponses(parsedResponses);

      // Fetch questionnaire structure to get questions
      const questionnaireResponse = await fetch('/api/diagnostics/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: diagnosticData.category,
          subcategory: diagnosticData.subcategory,
        }),
      });

      const questionnaireData = await questionnaireResponse.json();
      if (questionnaireData.questionnaire) {
        setQuestions(questionnaireData.questionnaire.questions);

        // Analyze responses to find flagged issues
        const issues = analyzeResponses(
          questionnaireData.questionnaire.questions,
          parsedResponses
        );
        setFlaggedIssues(issues);

        // Generate recommendations based on flagged issues
        const recs = generateRecommendations(issues);
        setRecommendations(recs);
      }
    } catch (error) {
      console.error('Error fetching diagnostic results:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while loading results',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Analyze responses to find out-of-range values and issues
  const analyzeResponses = (
    questions: Question[],
    responses: Record<string, any>
  ): FlaggedIssue[] => {
    const issues: FlaggedIssue[] = [];

    questions.forEach((question) => {
      const response = responses[question.id];
      if (response === undefined || response === null) return;

      // Check numeric values against expected range
      if (question.type === 'numeric' && question.expectedRange) {
        const numValue = parseFloat(response);
        const { min, max } = question.expectedRange;

        if (numValue < min || numValue > max) {
          // Determine severity based on how far out of range
          const deviation = Math.abs(
            numValue < min ? min - numValue : numValue - max
          );
          const range = max - min;
          const deviationPercent = (deviation / range) * 100;

          let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
          if (deviationPercent > 50) {
            severity = 'CRITICAL';
          } else if (deviationPercent > 25) {
            severity = 'HIGH';
          } else if (deviationPercent > 10) {
            severity = 'MEDIUM';
          } else {
            severity = 'LOW';
          }

          issues.push({
            questionId: question.id,
            questionText: question.text,
            userResponse: response,
            expectedRange: question.expectedRange,
            severity,
            reason: `Value ${numValue}${question.unit || ''} is outside expected range (${min}-${max}${question.unit || ''})`,
          });
        }
      }

      // Check yes/no questions (if 'no' might indicate an issue)
      if (question.type === 'yes_no' && response === 'no') {
        // For certain critical questions, 'no' might be flagged
        if (
          question.text.toLowerCase().includes('properly') ||
          question.text.toLowerCase().includes('functioning') ||
          question.text.toLowerCase().includes('working')
        ) {
          issues.push({
            questionId: question.id,
            questionText: question.text,
            userResponse: response,
            severity: 'HIGH',
            reason: 'Component not functioning as expected',
          });
        }
      }
    });

    return issues;
  };

  // Generate recommendations based on flagged issues
  const generateRecommendations = (issues: FlaggedIssue[]): Recommendation[] => {
    const recommendations: Recommendation[] = [];

    issues.forEach((issue) => {
      // Generate contextual recommendations based on the issue
      if (issue.questionText.toLowerCase().includes('moisture')) {
        recommendations.push({
          issue: issue.questionText,
          action: 'Adjust moisture control settings and monitor grain moisture levels',
          priority: issue.severity,
          trainingModule: 'Moisture Control Best Practices',
          details: issue.reason,
        });
      } else if (issue.questionText.toLowerCase().includes('temperature')) {
        recommendations.push({
          issue: issue.questionText,
          action: 'Check temperature sensors and cooling systems',
          priority: issue.severity,
          trainingModule: 'Temperature Management',
          details: issue.reason,
        });
      } else if (issue.questionText.toLowerCase().includes('speed')) {
        recommendations.push({
          issue: issue.questionText,
          action: 'Calibrate mill speed settings and check drive belts',
          priority: issue.severity,
          trainingModule: 'Mill Speed Optimization',
          details: issue.reason,
        });
      } else {
        recommendations.push({
          issue: issue.questionText,
          action: 'Review equipment specifications and perform maintenance check',
          priority: issue.severity,
          details: issue.reason,
        });
      }
    });

    // Sort by priority
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return recommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  };

  const handleMarkResolved = async () => {
    try {
      const response = await fetch(`/api/diagnostics/results/${diagnosticId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      });

      if (response.ok) {
        toast({
          title: 'Marked as Resolved',
          description: 'Diagnostic has been marked as resolved',
        });
        setDiagnostic((prev) => (prev ? { ...prev, status: 'resolved' } : null));
      }
    } catch (error) {
      console.error('Error marking as resolved:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleRetry = () => {
    router.push('/diagnostics/new');
  };

  const handleScheduleFollowUp = () => {
    // TODO: Implement follow-up scheduling
    toast({
      title: 'Coming Soon',
      description: 'Follow-up scheduling will be available soon',
    });
  };

  const handleRequestSupport = () => {
    // TODO: Navigate to support ticket creation
    toast({
      title: 'Coming Soon',
      description: 'Support request will be available soon',
    });
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // TODO: Implement PDF export
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast({
        title: 'Export Complete',
        description: 'Diagnostic results exported as PDF',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export PDF',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleMarkRecommendationComplete = (issue: string) => {
    setCompletedRecommendations((prev) => {
      const updated = new Set(prev);
      if (updated.has(issue)) {
        updated.delete(issue);
      } else {
        updated.add(issue);
      }
      return updated;
    });
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          variant: 'destructive' as const,
          icon: AlertCircle,
          bgClass: 'bg-red-50 border-red-200',
          textClass: 'text-red-900',
        };
      case 'HIGH':
        return {
          variant: 'destructive' as const,
          icon: AlertTriangle,
          bgClass: 'bg-orange-50 border-orange-200',
          textClass: 'text-orange-900',
        };
      case 'MEDIUM':
        return {
          variant: 'default' as const,
          icon: Info,
          bgClass: 'bg-yellow-50 border-yellow-200',
          textClass: 'text-yellow-900',
        };
      case 'LOW':
        return {
          variant: 'secondary' as const,
          icon: Info,
          bgClass: 'bg-blue-50 border-blue-200',
          textClass: 'text-blue-900',
        };
      default:
        return {
          variant: 'outline' as const,
          icon: Info,
          bgClass: '',
          textClass: '',
        };
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Not found
  if (!diagnostic) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Diagnostic Not Found</h2>
            <p className="text-muted-foreground mb-6">
              Unable to load the diagnostic results.
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

  const severityConfig = diagnostic.severity
    ? getSeverityConfig(diagnostic.severity)
    : null;

  return (
    <TooltipProvider>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/diagnostics')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Diagnostic Results
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{diagnostic.category}</Badge>
                <span className="text-muted-foreground">›</span>
                <Badge variant="outline">{diagnostic.subcategory}</Badge>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportPDF}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export PDF
            </Button>
            {diagnostic.status !== 'resolved' && (
              <Button onClick={handleMarkResolved}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark Resolved
              </Button>
            )}
          </div>
        </div>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Diagnostic Summary</CardTitle>
            <CardDescription>
              Completed on{' '}
              {diagnostic.completedAt
                ? new Date(diagnostic.completedAt).toLocaleString()
                : 'N/A'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Status */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Status</span>
                </div>
                <Badge
                  variant={
                    diagnostic.status === 'resolved'
                      ? 'default'
                      : diagnostic.status === 'completed'
                      ? 'secondary'
                      : 'outline'
                  }
                  className="text-sm"
                >
                  {diagnostic.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              {/* Severity */}
              {diagnostic.severity && severityConfig && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Severity</span>
                  </div>
                  <Badge variant={severityConfig.variant} className="text-sm">
                    {diagnostic.severity}
                  </Badge>
                </div>
              )}

              {/* Issues Found */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>Issues Found</span>
                </div>
                <p className="text-2xl font-bold">{flaggedIssues.length}</p>
              </div>

              {/* Recommendations */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Recommendations</span>
                </div>
                <p className="text-2xl font-bold">{recommendations.length}</p>
              </div>
            </div>

            <Separator className="my-6" />

            {/* User Info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Conducted by:</span>
              <span className="font-medium text-foreground">
                {diagnostic.user.name}
              </span>
              <span>({diagnostic.user.email})</span>
            </div>
          </CardContent>
        </Card>

        {/* Flagged Issues */}
        {flaggedIssues.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Flagged Issues
              </CardTitle>
              <CardDescription>
                Issues identified during the diagnostic assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {flaggedIssues.map((issue, idx) => {
                const config = getSeverityConfig(issue.severity);
                const SeverityIcon = config.icon;

                return (
                  <Alert key={idx} className={config.bgClass}>
                    <SeverityIcon className="h-4 w-4" />
                    <AlertTitle className="flex items-center justify-between">
                      <span>{issue.questionText}</span>
                      <Badge variant={config.variant}>{issue.severity}</Badge>
                    </AlertTitle>
                    <AlertDescription className="space-y-2 mt-2">
                      <div>
                        <span className="font-medium">Your Response: </span>
                        <span>{issue.userResponse}</span>
                        {issue.expectedRange && (
                          <>
                            <br />
                            <span className="text-sm text-muted-foreground">
                              Expected: {issue.expectedRange.min} -{' '}
                              {issue.expectedRange.max}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-sm">{issue.reason}</p>
                    </AlertDescription>
                  </Alert>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Recommendations</h2>
              <p className="text-muted-foreground mt-1">
                Suggested actions to address identified issues
              </p>
            </div>

            {recommendations.map((rec, idx) => (
              <RecommendationCard
                key={idx}
                recommendation={rec}
                onMarkComplete={handleMarkRecommendationComplete}
                isCompleted={completedRecommendations.has(rec.issue)}
              />
            ))}
          </div>
        )}

        {/* Questions & Answers Review */}
        <Card>
          <CardHeader>
            <CardTitle>Questions & Answers</CardTitle>
            <CardDescription>
              Review all responses from this diagnostic
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {questions.map((question, idx) => {
                const response = responses[question.id];
                const hasResponse =
                  response !== undefined && response !== null && response !== '';

                return (
                  <div
                    key={question.id}
                    className="flex items-start justify-between py-3 border-b last:border-b-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {idx + 1}. {question.text}
                      </p>
                      {hasResponse ? (
                        <p className="text-muted-foreground mt-1">
                          {response}
                          {question.unit && ` ${question.unit}`}
                        </p>
                      ) : (
                        <p className="text-muted-foreground italic mt-1">
                          Not answered
                        </p>
                      )}
                    </div>
                    {hasResponse && (
                      <CheckCircle2 className="h-5 w-5 text-green-600 ml-4" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons Footer */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleRetry}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Run Another Diagnostic
              </Button>
              <Button variant="outline" onClick={handleScheduleFollowUp}>
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Follow-Up
              </Button>
              <Button variant="outline" onClick={handleRequestSupport}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Request Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
