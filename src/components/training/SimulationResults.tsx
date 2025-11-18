/**
 * Simulation Results and Feedback Component
 *
 * Displays comprehensive simulation results with:
 * - Performance metrics and scoring
 * - Decision timeline analysis
 * - Feedback on each action
 * - Best practices comparison
 * - Recommendations for improvement
 * - Replay functionality
 */

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Play,
  RotateCcw,
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
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SimulationState } from './SimulationEngine';

export interface SimulationResult {
  simulationId: string;
  title: string;
  category: string;
  completedAt: string;
  finalState: SimulationState;
  decisionHistory: Array<{
    timestamp: number;
    scenarioTitle: string;
    actionTaken: string;
    outcome: 'success' | 'warning' | 'error' | 'info';
    impact: string;
    scoreChange: number;
  }>;
  bestPractices: {
    followed: string[];
    missed: string[];
  };
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
  certificateEarned?: boolean;
}

export interface SimulationResultsProps {
  result: SimulationResult;
  onRetry?: () => void;
  onViewCertificate?: () => void;
  onShare?: () => void;
  onExit?: () => void;
}

export function SimulationResults({
  result,
  onRetry,
  onViewCertificate,
  onShare,
  onExit,
}: SimulationResultsProps) {
  const [selectedTab, setSelectedTab] = useState('overview');

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'B':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'C':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'D':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'F':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Zap className="h-4 w-4 text-blue-600" />;
    }
  };

  const accuracy =
    result.finalState.actionsCount > 0
      ? (result.finalState.correctActions / result.finalState.actionsCount) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Header Score Card */}
      <Card className={`border-2 ${getGradeColor(result.performanceGrade)}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-2xl">{result.title}</CardTitle>
                <Badge variant="outline">{result.category}</Badge>
              </div>
              <CardDescription>
                Completed on{' '}
                {new Date(result.completedAt).toLocaleString('en-US', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}
              </CardDescription>
            </div>
            <div className="text-center">
              <div className="text-6xl font-bold mb-2">
                {result.performanceGrade}
              </div>
              <Badge variant="outline" className="text-sm">
                {result.finalState.score}% Score
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Final Score</p>
                <p className="text-3xl font-bold">{result.finalState.score}%</p>
              </div>
              {result.finalState.score >= 70 ? (
                <TrendingUp className="h-10 w-10 text-green-600" />
              ) : (
                <TrendingDown className="h-10 w-10 text-red-600" />
              )}
            </div>
            <Progress value={result.finalState.score} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Time Taken</p>
                <p className="text-2xl font-bold">
                  {formatTime(result.finalState.timeElapsed)}
                </p>
              </div>
              <Clock className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Actions Taken</p>
                <p className="text-2xl font-bold">
                  {result.finalState.actionsCount}
                </p>
              </div>
              <Zap className="h-10 w-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accuracy</p>
                <p className="text-2xl font-bold">{Math.round(accuracy)}%</p>
              </div>
              {accuracy >= 70 ? (
                <TrendingUp className="h-10 w-10 text-green-600" />
              ) : (
                <TrendingDown className="h-10 w-10 text-orange-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Certificate Earned */}
      {result.certificateEarned && (
        <Alert>
          <Award className="h-4 w-4" />
          <AlertTitle>Congratulations!</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>You've earned a certificate for completing this simulation!</span>
            {onViewCertificate && (
              <Button variant="outline" size="sm" onClick={onViewCertificate}>
                View Certificate
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs: Overview, Timeline, Feedback */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Decision Timeline</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Correct Actions</p>
                  <p className="text-2xl font-bold text-green-600">
                    {result.finalState.correctActions}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Incorrect Actions</p>
                  <p className="text-2xl font-bold text-red-600">
                    {result.finalState.incorrectActions}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Achievements Unlocked</h4>
                {result.finalState.achievements.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.finalState.achievements.map((achievement, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1">
                        <Award className="h-3 w-3" />
                        {achievement}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No achievements unlocked
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Best Practices */}
          <Card>
            <CardHeader>
              <CardTitle>Best Practices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.bestPractices.followed.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Followed ({result.bestPractices.followed.length})
                  </h4>
                  <ul className="space-y-1">
                    {result.bestPractices.followed.map((practice, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>{practice}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.bestPractices.missed.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2 text-orange-600">
                    <AlertTriangle className="h-4 w-4" />
                    Missed Opportunities ({result.bestPractices.missed.length})
                  </h4>
                  <ul className="space-y-1">
                    {result.bestPractices.missed.map((practice, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                        <span>{practice}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Decision Timeline</CardTitle>
              <CardDescription>
                Review your decisions throughout the simulation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {result.decisionHistory.map((decision, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-semibold text-sm">
                        {formatTime(decision.timestamp)}
                      </div>
                      {idx < result.decisionHistory.length - 1 && (
                        <div className="w-0.5 h-full bg-border my-2" />
                      )}
                    </div>
                    <Card className="flex-1 mb-4">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h4 className="font-semibold mb-1">
                              {decision.scenarioTitle}
                            </h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              Action: {decision.actionTaken}
                            </p>
                            <p className="text-sm">{decision.impact}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getOutcomeIcon(decision.outcome)}
                            <Badge
                              variant={
                                decision.scoreChange >= 0
                                  ? 'default'
                                  : 'destructive'
                              }
                            >
                              {decision.scoreChange >= 0 ? '+' : ''}
                              {decision.scoreChange}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recommendations for Improvement</CardTitle>
            </CardHeader>
            <CardContent>
              {result.recommendations.length > 0 ? (
                <ul className="space-y-3">
                  {result.recommendations.map((recommendation, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-semibold text-primary">
                          {idx + 1}
                        </span>
                      </div>
                      <p className="text-sm flex-1">{recommendation}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Excellent work! No specific recommendations at this time.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Warnings Summary */}
          {result.finalState.warnings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Warnings Encountered</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.finalState.warnings.map((warning, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Retry Simulation
          </Button>
        )}
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download Report
        </Button>
        {onShare && (
          <Button variant="outline" onClick={onShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share Results
          </Button>
        )}
        {onExit && (
          <Button onClick={onExit} className="ml-auto">
            Continue Learning
          </Button>
        )}
      </div>
    </div>
  );
}
