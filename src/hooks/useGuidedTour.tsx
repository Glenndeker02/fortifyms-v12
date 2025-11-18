/**
 * Guided Tour System Hook
 *
 * Manages guided tours throughout the application with:
 * - Multiple tour definitions
 * - Tour state persistence
 * - Tour completion tracking
 * - Auto-trigger on first visit
 */

import { useState, useEffect, useCallback } from 'react';
import { WalkthroughStep } from '@/components/training/WalkthroughOverlay';

export interface Tour {
  id: string;
  name: string;
  description: string;
  steps: WalkthroughStep[];
  triggerOnFirstVisit?: boolean;
}

// Predefined tours for different pages
export const TOURS: Record<string, Tour> = {
  dashboard: {
    id: 'dashboard-tour',
    name: 'Dashboard Overview',
    description: 'Learn how to navigate your dashboard',
    triggerOnFirstVisit: true,
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to FortifyMS!',
        content: 'This quick tour will show you around the dashboard and key features.',
        placement: 'center',
      },
      {
        id: 'nav-menu',
        title: 'Navigation Menu',
        content:
          'Access all major sections of the application from this sidebar menu.',
        targetSelector: '[data-tour="nav-menu"]',
        placement: 'right',
      },
      {
        id: 'diagnostics',
        title: 'Diagnostics Module',
        content:
          'Run interactive diagnostic assessments to identify equipment issues.',
        targetSelector: '[data-tour="diagnostics-link"]',
        placement: 'right',
      },
      {
        id: 'training',
        title: 'Training & Learning',
        content:
          'Access video courses, quizzes, and earn certificates for completed training.',
        targetSelector: '[data-tour="training-link"]',
        placement: 'right',
      },
      {
        id: 'profile',
        title: 'Your Profile',
        content: 'View your progress, achievements, and account settings here.',
        targetSelector: '[data-tour="user-profile"]',
        placement: 'bottom',
      },
    ],
  },

  training: {
    id: 'training-tour',
    name: 'Training Library Tour',
    description: 'Discover how to use the training system',
    triggerOnFirstVisit: true,
    steps: [
      {
        id: 'welcome',
        title: 'Training Library',
        content:
          'Browse and enroll in interactive courses to improve your skills.',
        placement: 'center',
      },
      {
        id: 'search',
        title: 'Search Courses',
        content: 'Use the search bar to quickly find courses by keyword.',
        targetSelector: '[data-tour="course-search"]',
        placement: 'bottom',
      },
      {
        id: 'filters',
        title: 'Filter Options',
        content: 'Filter courses by category and skill level to find what you need.',
        targetSelector: '[data-tour="course-filters"]',
        placement: 'bottom',
      },
      {
        id: 'tabs',
        title: 'Course Tabs',
        content:
          'Switch between All Courses, My Courses, and Completed courses.',
        targetSelector: '[data-tour="course-tabs"]',
        placement: 'bottom',
      },
      {
        id: 'progress-link',
        title: 'Track Your Progress',
        content: 'View your learning statistics and earned certificates here.',
        targetSelector: '[data-tour="progress-link"]',
        placement: 'bottom',
      },
    ],
  },

  diagnostics: {
    id: 'diagnostics-tour',
    name: 'Diagnostics Wizard Tour',
    description: 'Learn how to run diagnostic assessments',
    triggerOnFirstVisit: true,
    steps: [
      {
        id: 'welcome',
        title: 'Diagnostic Wizard',
        content:
          'Run systematic troubleshooting assessments to identify equipment issues.',
        placement: 'center',
      },
      {
        id: 'categories',
        title: 'Select Category',
        content: 'Choose the type of diagnostic you want to run.',
        targetSelector: '[data-tour="diagnostic-categories"]',
        placement: 'top',
      },
      {
        id: 'progress',
        title: 'Track Progress',
        content:
          'The progress bar shows how far you are through the assessment.',
        targetSelector: '[data-tour="diagnostic-progress"]',
        placement: 'top',
      },
      {
        id: 'photo-upload',
        title: 'Photo Evidence',
        content: 'Upload photos as evidence for diagnostic questions.',
        targetSelector: '[data-tour="photo-upload"]',
        placement: 'top',
      },
      {
        id: 'results',
        title: 'View Results',
        content:
          'After completing a diagnostic, view detailed results and recommendations.',
        targetSelector: '[data-tour="results-link"]',
        placement: 'bottom',
      },
    ],
  },

  simulation: {
    id: 'simulation-tour',
    name: 'Interactive Simulations Tour',
    description: 'Learn how to use interactive simulations',
    triggerOnFirstVisit: true,
    steps: [
      {
        id: 'welcome',
        title: 'Interactive Simulations',
        content:
          'Practice real-world scenarios in a safe, simulated environment.',
        placement: 'center',
      },
      {
        id: 'scenario',
        title: 'Scenario Description',
        content: 'Read the scenario carefully to understand the situation.',
        targetSelector: '[data-tour="scenario-description"]',
        placement: 'top',
      },
      {
        id: 'actions',
        title: 'Available Actions',
        content: 'Choose from available actions based on the scenario.',
        targetSelector: '[data-tour="available-actions"]',
        placement: 'top',
      },
      {
        id: 'feedback',
        title: 'Instant Feedback',
        content: 'Receive immediate feedback on your decisions.',
        targetSelector: '[data-tour="feedback-area"]',
        placement: 'top',
      },
      {
        id: 'score',
        title: 'Score Tracking',
        content: 'Your score reflects the quality of your decisions.',
        targetSelector: '[data-tour="simulation-score"]',
        placement: 'bottom',
      },
    ],
  },
};

interface TourState {
  completedTours: string[];
  tourInProgress: string | null;
  currentStep: number;
}

const STORAGE_KEY = 'fortifyms-guided-tours';

export function useGuidedTour(tourId?: string) {
  const [tourState, setTourState] = useState<TourState>({
    completedTours: [],
    tourInProgress: null,
    currentStep: 0,
  });
  const [isActive, setIsActive] = useState(false);

  // Load tour state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTourState(parsed);
      } catch (error) {
        console.error('Failed to parse tour state:', error);
      }
    }
  }, []);

  // Save tour state to localStorage
  const saveTourState = useCallback((newState: TourState) => {
    setTourState(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  }, []);

  // Auto-trigger tour on first visit
  useEffect(() => {
    if (!tourId) return;

    const tour = TOURS[tourId];
    if (!tour) return;

    const isCompleted = tourState.completedTours.includes(tour.id);
    const shouldTrigger = tour.triggerOnFirstVisit && !isCompleted;

    if (shouldTrigger && !tourState.tourInProgress) {
      // Delay slightly to ensure DOM is ready
      setTimeout(() => {
        startTour(tourId);
      }, 1000);
    }
  }, [tourId, tourState.completedTours, tourState.tourInProgress]);

  const startTour = useCallback(
    (id: string) => {
      const tour = TOURS[id];
      if (!tour) {
        console.error(`Tour not found: ${id}`);
        return;
      }

      saveTourState({
        ...tourState,
        tourInProgress: tour.id,
        currentStep: 0,
      });
      setIsActive(true);
    },
    [tourState, saveTourState]
  );

  const completeTour = useCallback(() => {
    if (!tourState.tourInProgress) return;

    saveTourState({
      completedTours: [...tourState.completedTours, tourState.tourInProgress],
      tourInProgress: null,
      currentStep: 0,
    });
    setIsActive(false);
  }, [tourState, saveTourState]);

  const skipTour = useCallback(() => {
    saveTourState({
      ...tourState,
      tourInProgress: null,
      currentStep: 0,
    });
    setIsActive(false);
  }, [tourState, saveTourState]);

  const restartTour = useCallback(
    (id?: string) => {
      const tourToRestart = id || tourState.tourInProgress;
      if (!tourToRestart) return;

      saveTourState({
        ...tourState,
        tourInProgress: tourToRestart,
        currentStep: 0,
      });
      setIsActive(true);
    },
    [tourState, saveTourState]
  );

  const handleStepChange = useCallback(
    (stepIndex: number) => {
      saveTourState({
        ...tourState,
        currentStep: stepIndex,
      });
    },
    [tourState, saveTourState]
  );

  const resetAllTours = useCallback(() => {
    saveTourState({
      completedTours: [],
      tourInProgress: null,
      currentStep: 0,
    });
    setIsActive(false);
  }, [saveTourState]);

  const currentTour = tourState.tourInProgress
    ? TOURS[tourState.tourInProgress]
    : null;

  const isTourCompleted = useCallback(
    (id: string) => {
      return tourState.completedTours.includes(id);
    },
    [tourState.completedTours]
  );

  return {
    // State
    isActive,
    currentTour,
    currentStep: tourState.currentStep,
    completedTours: tourState.completedTours,

    // Actions
    startTour,
    completeTour,
    skipTour,
    restartTour,
    resetAllTours,
    handleStepChange,
    isTourCompleted,

    // Available tours
    availableTours: Object.values(TOURS),
  };
}
