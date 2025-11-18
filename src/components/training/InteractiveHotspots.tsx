/**
 * Interactive Hotspots Component
 *
 * Equipment visualization with clickable hotspots for:
 * - Interactive equipment diagrams
 * - Labeled component identification
 * - Pop-up information on click/hover
 * - Progress tracking for explored areas
 * - Multiple hotspot types (info, warning, action)
 */

import { useState, useRef, useEffect } from 'react';
import { Info, AlertTriangle, Zap, CheckCircle2, X } from 'lucide-react';

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

export interface Hotspot {
  id: string;
  x: number; // Percentage (0-100)
  y: number; // Percentage (0-100)
  type: 'info' | 'warning' | 'action' | 'success';
  label: string;
  title: string;
  description: string;
  details?: string;
  imageUrl?: string;
  videoUrl?: string;
  requiredForCompletion?: boolean;
}

export interface InteractiveHotspotsProps {
  imageUrl: string;
  title: string;
  description?: string;
  hotspots: Hotspot[];
  onComplete?: () => void;
  showProgress?: boolean;
  requireAllVisited?: boolean;
}

export function InteractiveHotspots({
  imageUrl,
  title,
  description,
  hotspots,
  onComplete,
  showProgress = true,
  requireAllVisited = false,
}: InteractiveHotspotsProps) {
  const [visitedHotspots, setVisitedHotspots] = useState<Set<string>>(new Set());
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLDivElement>(null);

  // Update image size on mount and resize
  useEffect(() => {
    const updateSize = () => {
      if (imageRef.current) {
        const { width, height } = imageRef.current.getBoundingClientRect();
        setImageSize({ width, height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleHotspotClick = (hotspot: Hotspot) => {
    setActiveHotspot(hotspot);
    setVisitedHotspots((prev) => new Set(prev).add(hotspot.id));
  };

  const handleClose = () => {
    setActiveHotspot(null);
  };

  const getHotspotIcon = (type: Hotspot['type']) => {
    switch (type) {
      case 'info':
        return <Info className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'action':
        return <Zap className="h-4 w-4" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  const getHotspotColor = (type: Hotspot['type']) => {
    switch (type) {
      case 'info':
        return 'bg-blue-500 hover:bg-blue-600 border-blue-600';
      case 'warning':
        return 'bg-yellow-500 hover:bg-yellow-600 border-yellow-600';
      case 'action':
        return 'bg-purple-500 hover:bg-purple-600 border-purple-600';
      case 'success':
        return 'bg-green-500 hover:bg-green-600 border-green-600';
    }
  };

  const requiredHotspots = hotspots.filter((h) => h.requiredForCompletion);
  const requiredVisited = requiredHotspots.filter((h) =>
    visitedHotspots.has(h.id)
  ).length;
  const totalVisited = visitedHotspots.size;
  const progress = (totalVisited / hotspots.length) * 100;
  const isComplete = requireAllVisited
    ? totalVisited === hotspots.length
    : requiredVisited === requiredHotspots.length;

  useEffect(() => {
    if (isComplete && onComplete && totalVisited > 0) {
      onComplete();
    }
  }, [isComplete, onComplete, totalVisited]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              {description && <CardDescription className="mt-2">{description}</CardDescription>}
            </div>
            {isComplete && (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Completed
              </Badge>
            )}
          </div>
        </CardHeader>
        {showProgress && (
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Explored: {totalVisited} / {hotspots.length}
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        )}
      </Card>

      {/* Interactive Image with Hotspots */}
      <Card>
        <CardContent className="p-0">
          <div ref={imageRef} className="relative w-full overflow-hidden">
            {/* Background Image */}
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-auto"
              onLoad={() => {
                if (imageRef.current) {
                  const { width, height } =
                    imageRef.current.getBoundingClientRect();
                  setImageSize({ width, height });
                }
              }}
            />

            {/* Hotspots */}
            {hotspots.map((hotspot) => {
              const isVisited = visitedHotspots.has(hotspot.id);
              const isHovered = hoveredHotspot === hotspot.id;
              const left = (hotspot.x / 100) * imageSize.width;
              const top = (hotspot.y / 100) * imageSize.height;

              return (
                <div key={hotspot.id}>
                  {/* Hotspot Marker */}
                  <button
                    className={cn(
                      'absolute rounded-full border-4 transition-all duration-200',
                      'flex items-center justify-center text-white shadow-lg',
                      isVisited
                        ? 'w-10 h-10 opacity-60'
                        : 'w-12 h-12 animate-pulse',
                      isHovered && 'scale-125',
                      getHotspotColor(hotspot.type)
                    )}
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    onClick={() => handleHotspotClick(hotspot)}
                    onMouseEnter={() => setHoveredHotspot(hotspot.id)}
                    onMouseLeave={() => setHoveredHotspot(null)}
                  >
                    {getHotspotIcon(hotspot.type)}
                  </button>

                  {/* Hover Label */}
                  {isHovered && (
                    <div
                      className="absolute bg-black/80 text-white px-3 py-2 rounded-md text-sm font-medium pointer-events-none whitespace-nowrap z-10"
                      style={{
                        left: `${left}px`,
                        top: `${top - 50}px`,
                        transform: 'translateX(-50%)',
                      }}
                    >
                      {hotspot.label}
                    </div>
                  )}

                  {/* Ripple Effect for Unvisited */}
                  {!isVisited && (
                    <div
                      className={cn(
                        'absolute rounded-full border-4 animate-ping pointer-events-none',
                        hotspot.type === 'info' && 'border-blue-500',
                        hotspot.type === 'warning' && 'border-yellow-500',
                        hotspot.type === 'action' && 'border-purple-500',
                        hotspot.type === 'success' && 'border-green-500'
                      )}
                      style={{
                        left: `${left}px`,
                        top: `${top}px`,
                        width: '48px',
                        height: '48px',
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Hotspot Details Modal/Card */}
      {activeHotspot && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-white',
                      getHotspotColor(activeHotspot.type)
                    )}
                  >
                    {getHotspotIcon(activeHotspot.type)}
                  </div>
                  <div>
                    <CardTitle>{activeHotspot.title}</CardTitle>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {activeHotspot.type}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{activeHotspot.description}</p>

              {activeHotspot.details && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">{activeHotspot.details}</p>
                </div>
              )}

              {activeHotspot.imageUrl && (
                <div className="rounded-lg overflow-hidden">
                  <img
                    src={activeHotspot.imageUrl}
                    alt={activeHotspot.title}
                    className="w-full h-auto"
                  />
                </div>
              )}

              {activeHotspot.videoUrl && (
                <div className="aspect-video bg-muted rounded-lg">
                  <video
                    src={activeHotspot.videoUrl}
                    controls
                    className="w-full h-full"
                  />
                </div>
              )}

              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hotspot Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white">
                <Info className="h-3 w-3" />
              </div>
              <span className="text-sm">Information</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-white">
                <AlertTriangle className="h-3 w-3" />
              </div>
              <span className="text-sm">Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white">
                <Zap className="h-3 w-3" />
              </div>
              <span className="text-sm">Action Required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white">
                <CheckCircle2 className="h-3 w-3" />
              </div>
              <span className="text-sm">Success/Best Practice</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
