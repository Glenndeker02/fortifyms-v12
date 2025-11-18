/**
 * Recommendation Card Component
 *
 * Displays a single recommendation with priority, action, and training link
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lightbulb,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface Recommendation {
  issue: string;
  action: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  trainingModule?: string;
  details?: string;
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  onMarkComplete?: (issue: string) => void;
  isCompleted?: boolean;
}

export function RecommendationCard({
  recommendation,
  onMarkComplete,
  isCompleted = false,
}: RecommendationCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return {
          variant: 'destructive' as const,
          icon: AlertCircle,
          className: 'border-red-500 bg-red-50',
        };
      case 'HIGH':
        return {
          variant: 'destructive' as const,
          icon: AlertTriangle,
          className: 'border-orange-500 bg-orange-50',
        };
      case 'MEDIUM':
        return {
          variant: 'default' as const,
          icon: Info,
          className: 'border-yellow-500 bg-yellow-50',
        };
      case 'LOW':
        return {
          variant: 'secondary' as const,
          icon: Info,
          className: 'border-blue-500 bg-blue-50',
        };
      default:
        return {
          variant: 'outline' as const,
          icon: Info,
          className: '',
        };
    }
  };

  const config = getPriorityConfig(recommendation.priority);
  const PriorityIcon = config.icon;

  const handleTrainingClick = () => {
    if (recommendation.trainingModule) {
      // TODO: Find course by module name and navigate
      // For now, navigate to training library
      router.push(`/training?search=${encodeURIComponent(recommendation.trainingModule)}`);
    }
  };

  return (
    <Card className={`${config.className} ${isCompleted ? 'opacity-60' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <PriorityIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Recommended Action</CardTitle>
                {isCompleted && (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
              </div>

              <p className="font-medium text-base">{recommendation.action}</p>

              {/* Priority Badge */}
              <Badge variant={config.variant} className="mt-2">
                {recommendation.priority} Priority
              </Badge>
            </div>
          </div>

          {/* Mark Complete Checkbox */}
          {onMarkComplete && (
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={() => onMarkComplete(recommendation.issue)}
                  id={`recommendation-${recommendation.issue}`}
                />
                <label
                  htmlFor={`recommendation-${recommendation.issue}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  Done
                </label>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Details (Collapsible) */}
        {recommendation.details && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span>View Details</span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
                {recommendation.details}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Training Module Link */}
        {recommendation.trainingModule && (
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lightbulb className="h-4 w-4" />
              <span>Related training available</span>
            </div>

            <Button variant="outline" size="sm" onClick={handleTrainingClick}>
              <BookOpen className="mr-2 h-4 w-4" />
              View Training
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
