/**
 * Scenario-Based Simulation Engine
 *
 * Interactive simulation framework with:
 * - Branching scenarios and decision trees
 * - State management for equipment/variables
 * - Real-time feedback
 * - Score tracking
 * - Multiple outcome paths
 * - Consequence system
 */

import { useState, useCallback, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

export interface SimulationState {
  variables: Record<string, number | string | boolean>;
  score: number;
  timeElapsed: number; // seconds
  actionsCount: number;
  correctActions: number;
  incorrectActions: number;
  warnings: string[];
  achievements: string[];
}

export interface SimulationAction {
  id: string;
  label: string;
  description?: string;
  icon?: 'check' | 'warning' | 'error' | 'info';
  disabled?: boolean;
  disabledReason?: string;
}

export interface SimulationConsequence {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  stateChanges?: Partial<SimulationState['variables']>;
  scoreChange?: number;
  achievements?: string[];
}

export interface SimulationScenario {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  currentState: string; // Description of current situation
  availableActions: SimulationAction[];
  evaluateAction: (
    actionId: string,
    state: SimulationState
  ) => {
    consequence: SimulationConsequence;
    nextScenarioId?: string;
    isComplete?: boolean;
  };
}

export interface SimulationEngineProps {
  scenarios: SimulationScenario[];
  initialScenarioId: string;
  initialState?: Partial<SimulationState['variables']>;
  timeLimit?: number; // seconds, optional
  passingScore?: number;
  onComplete: (state: SimulationState, passed: boolean) => void;
  onExit?: () => void;
}

export function SimulationEngine({
  scenarios,
  initialScenarioId,
  initialState = {},
  timeLimit,
  passingScore = 70,
  onComplete,
  onExit,
}: SimulationEngineProps) {
  const [currentScenarioId, setCurrentScenarioId] = useState(initialScenarioId);
  const [state, setState] = useState<SimulationState>({
    variables: initialState,
    score: 0,
    timeElapsed: 0,
    actionsCount: 0,
    correctActions: 0,
    incorrectActions: 0,
    warnings: [],
    achievements: [],
  });
  const [history, setHistory] = useState<
    Array<{
      scenarioId: string;
      actionId: string;
      consequence: SimulationConsequence;
      timestamp: number;
    }>
  >([]);
  const [lastConsequence, setLastConsequence] = useState<SimulationConsequence | null>(
    null
  );
  const [isComplete, setIsComplete] = useState(false);

  const currentScenario = scenarios.find((s) => s.id === currentScenarioId);

  // Timer
  useEffect(() => {
    if (isComplete) return;

    const interval = setInterval(() => {
      setState((prev) => ({
        ...prev,
        timeElapsed: prev.timeElapsed + 1,
      }));

      // Check time limit
      if (timeLimit && state.timeElapsed >= timeLimit) {
        handleComplete();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isComplete, timeLimit, state.timeElapsed]);

  const handleAction = useCallback(
    (actionId: string) => {
      if (!currentScenario) return;

      const result = currentScenario.evaluateAction(actionId, state);
      const { consequence, nextScenarioId, isComplete: actionComplete } = result;

      // Update state
      setState((prev) => {
        const newState = { ...prev };

        // Apply state changes
        if (consequence.stateChanges) {
          newState.variables = {
            ...prev.variables,
            ...consequence.stateChanges,
          };
        }

        // Update score
        if (consequence.scoreChange) {
          newState.score = Math.max(
            0,
            Math.min(100, prev.score + consequence.scoreChange)
          );
        }

        // Update action counters
        newState.actionsCount += 1;
        if (consequence.type === 'success') {
          newState.correctActions += 1;
        } else if (consequence.type === 'error') {
          newState.incorrectActions += 1;
        }

        // Add warnings
        if (consequence.type === 'warning' || consequence.type === 'error') {
          newState.warnings = [...prev.warnings, consequence.message];
        }

        // Add achievements
        if (consequence.achievements) {
          newState.achievements = [
            ...prev.achievements,
            ...consequence.achievements,
          ];
        }

        return newState;
      });

      // Record in history
      setHistory((prev) => [
        ...prev,
        {
          scenarioId: currentScenarioId,
          actionId,
          consequence,
          timestamp: state.timeElapsed,
        },
      ]);

      // Show consequence
      setLastConsequence(consequence);

      // Move to next scenario or complete
      if (actionComplete) {
        handleComplete();
      } else if (nextScenarioId) {
        setTimeout(() => {
          setCurrentScenarioId(nextScenarioId);
          setLastConsequence(null);
        }, 2000);
      }
    },
    [currentScenario, currentScenarioId, state]
  );

  const handleComplete = useCallback(() => {
    setIsComplete(true);
    const passed = state.score >= passingScore;
    onComplete(state, passed);
  }, [state, passingScore, onComplete]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getConsequenceIcon = (type: SimulationConsequence['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getActionIcon = (icon?: string) => {
    switch (icon) {
      case 'check':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5" />;
      case 'error':
        return <XCircle className="h-5 w-5" />;
      case 'info':
        return <Info className="h-5 w-5" />;
      default:
        return <Zap className="h-5 w-5" />;
    }
  };

  if (!currentScenario) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-2xl font-bold mb-2">Scenario Not Found</h2>
          <p className="text-muted-foreground mb-6">
            Unable to load the simulation scenario.
          </p>
          {onExit && (
            <Button onClick={onExit} variant="outline">
              Exit Simulation
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Score</p>
                <p className="text-2xl font-bold">{state.score}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Actions</p>
                <p className="text-2xl font-bold">{state.actionsCount}</p>
              </div>
              <Zap className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Time</p>
                <p className="text-2xl font-bold">{formatTime(state.timeElapsed)}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accuracy</p>
                <p className="text-2xl font-bold">
                  {state.actionsCount > 0
                    ? Math.round((state.correctActions / state.actionsCount) * 100)
                    : 0}
                  %
                </p>
              </div>
              {state.actionsCount > 0 &&
              state.correctActions / state.actionsCount >= 0.7 ? (
                <TrendingUp className="h-8 w-8 text-green-600" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Scenario Card */}
      <Card>
        <CardHeader>
          <CardTitle>{currentScenario.title}</CardTitle>
          <CardDescription>{currentScenario.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scenario Image */}
          {currentScenario.imageUrl && (
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <img
                src={currentScenario.imageUrl}
                alt={currentScenario.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Current State */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Current Situation</AlertTitle>
            <AlertDescription>{currentScenario.currentState}</AlertDescription>
          </Alert>

          {/* Last Consequence Feedback */}
          {lastConsequence && (
            <Alert
              variant={
                lastConsequence.type === 'error' ||
                lastConsequence.type === 'warning'
                  ? 'destructive'
                  : 'default'
              }
            >
              {getConsequenceIcon(lastConsequence.type)}
              <AlertTitle>{lastConsequence.title}</AlertTitle>
              <AlertDescription>{lastConsequence.message}</AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Available Actions */}
          <div className="space-y-3">
            <h3 className="font-semibold">What do you do?</h3>
            <div className="grid gap-3">
              {currentScenario.availableActions.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  className="h-auto p-4 justify-start text-left"
                  onClick={() => handleAction(action.id)}
                  disabled={action.disabled}
                >
                  <div className="flex items-start gap-3 w-full">
                    {getActionIcon(action.icon)}
                    <div className="flex-1">
                      <p className="font-medium">{action.label}</p>
                      {action.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {action.description}
                        </p>
                      )}
                      {action.disabled && action.disabledReason && (
                        <p className="text-xs text-destructive mt-1">
                          {action.disabledReason}
                        </p>
                      )}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variable Display (Debug/State Viewer) */}
      {Object.keys(state.variables).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Equipment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {Object.entries(state.variables).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <p className="text-muted-foreground capitalize">
                    {key.replace(/_/g, ' ')}
                  </p>
                  <p className="font-semibold">
                    {typeof value === 'boolean'
                      ? value
                        ? 'Yes'
                        : 'No'
                      : value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievements */}
      {state.achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Achievements Unlocked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {state.achievements.map((achievement, idx) => (
                <Badge key={idx} variant="secondary">
                  {achievement}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exit Button */}
      {onExit && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onExit}>
            Exit Simulation
          </Button>
        </div>
      )}
    </div>
  );
}
