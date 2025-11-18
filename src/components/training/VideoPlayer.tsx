/**
 * Video Player Component
 *
 * Advanced video player with:
 * - Custom playback controls
 * - Progress tracking and resume
 * - Speed controls and quality selection
 * - Subtitles/captions support
 * - Knowledge check integration
 * - Fullscreen support
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  SkipBack,
  SkipForward,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: string;
  title?: string;
  moduleId: string;
  lessonId: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onKnowledgeCheck?: (timestamp: number) => void;
  knowledgeCheckPoints?: number[]; // Timestamps in seconds
  initialProgress?: number; // Resume from percentage (0-100)
  subtitles?: {
    src: string;
    label: string;
    language: string;
  }[];
}

export function VideoPlayer({
  src,
  title,
  moduleId,
  lessonId,
  onProgress,
  onComplete,
  onKnowledgeCheck,
  knowledgeCheckPoints = [],
  initialProgress = 0,
  subtitles = [],
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  // Knowledge check state
  const [checkedPoints, setCheckedPoints] = useState<Set<number>>(new Set());

  // Initialize video and resume from saved progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);

      // Resume from initial progress
      if (initialProgress > 0 && initialProgress < 100) {
        const resumeTime = (initialProgress / 100) * video.duration;
        video.currentTime = resumeTime;
        setCurrentTime(resumeTime);
      }
    };

    const handleLoadedData = () => {
      setIsLoading(false);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [initialProgress]);

  // Track progress and trigger knowledge checks
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;

    progressIntervalRef.current = setInterval(() => {
      const current = video.currentTime;
      const total = video.duration;
      setCurrentTime(current);

      // Update buffered
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBuffered((bufferedEnd / total) * 100);
      }

      // Report progress
      const progressPercent = (current / total) * 100;
      onProgress?.(progressPercent);

      // Check for knowledge check points
      knowledgeCheckPoints.forEach((timestamp) => {
        if (
          current >= timestamp &&
          current < timestamp + 1 &&
          !checkedPoints.has(timestamp)
        ) {
          video.pause();
          setIsPlaying(false);
          setCheckedPoints((prev) => new Set(prev).add(timestamp));
          onKnowledgeCheck?.(timestamp);
        }
      });

      // Check if video completed (95% threshold to account for buffering)
      if (progressPercent >= 95 && !checkedPoints.has(-1)) {
        setCheckedPoints((prev) => new Set(prev).add(-1));
        onComplete?.();
      }
    }, 1000);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, onProgress, onComplete, onKnowledgeCheck, knowledgeCheckPoints, checkedPoints]);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Auto-hide controls
  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      return;
    }

    const timeout = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [isPlaying, currentTime]);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play();
      setIsPlaying(true);
      setHasStarted(true);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = (value[0] / 100) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = value[0] / 100;
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    video.currentTime = newTime;
    setCurrentTime(newTime);
  }, [currentTime, duration]);

  const changePlaybackRate = useCallback((rate: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }, []);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative bg-black rounded-lg overflow-hidden group',
        isFullscreen && 'rounded-none'
      )}
      onMouseEnter={() => setShowControls(true)}
      onMouseMove={() => setShowControls(true)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full"
        onClick={togglePlayPause}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        {subtitles.map((subtitle) => (
          <track
            key={subtitle.language}
            kind="subtitles"
            src={subtitle.src}
            srcLang={subtitle.language}
            label={subtitle.label}
          />
        ))}
      </video>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="h-12 w-12 text-white animate-spin" />
        </div>
      )}

      {/* Play Button Overlay (before started) */}
      {!hasStarted && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            size="lg"
            className="h-20 w-20 rounded-full"
            onClick={togglePlayPause}
          >
            <Play className="h-10 w-10" fill="currentColor" />
          </Button>
        </div>
      )}

      {/* Controls */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity duration-300',
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Progress Bar */}
        <div className="mb-4">
          {/* Buffered Progress */}
          <div className="relative h-1 bg-white/20 rounded-full mb-2">
            <div
              className="absolute h-full bg-white/40 rounded-full"
              style={{ width: `${buffered}%` }}
            />
          </div>

          {/* Seek Slider */}
          <Slider
            value={[progressPercent]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="cursor-pointer"
          />

          {/* Time Display */}
          <div className="flex justify-between text-xs text-white/80 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlayPause}
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" fill="currentColor" />
              )}
            </Button>

            {/* Skip Backward */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => skip(-10)}
              className="text-white hover:bg-white/20"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            {/* Skip Forward */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => skip(10)}
              className="text-white hover:bg-white/20"
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              <div className="w-24 hidden md:block">
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                />
              </div>
            </div>

            {/* Time */}
            <span className="text-sm text-white/90 ml-2 hidden sm:inline">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Playback Speed */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  {playbackRate}x
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Playback Speed</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                  <DropdownMenuItem
                    key={rate}
                    onClick={() => changePlaybackRate(rate)}
                    className={playbackRate === rate ? 'bg-accent' : ''}
                  >
                    {rate}x {rate === 1 && '(Normal)'}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Title Overlay */}
      {title && (
        <div
          className={cn(
            'absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 transition-opacity duration-300',
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
          )}
        >
          <h3 className="text-white font-semibold">{title}</h3>
        </div>
      )}
    </div>
  );
}
