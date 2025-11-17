import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistance, formatDistanceToNow } from 'date-fns';
import { DATE_FORMATS } from './constants';

/**
 * Utility Functions
 *
 * Common utility functions used throughout the FortifyMIS Portal application.
 *
 * Reference: TODO.md Phase 1, rules.md (Code Standards)
 */

/**
 * Merge Tailwind CSS classes with clsx
 * Used extensively with shadcn/ui components
 *
 * @param inputs - Class values to merge
 * @returns Merged className string
 *
 * Usage:
 * ```typescript
 * <div className={cn('p-4', isActive && 'bg-blue-500', className)} />
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format date for display
 *
 * @param date - Date to format
 * @param formatString - Format string (defaults to DISPLAY format)
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number,
  formatString: string = DATE_FORMATS.DISPLAY
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return format(dateObj, formatString);
}

/**
 * Format date relative to now (e.g., "2 hours ago")
 *
 * @param date - Date to format
 * @returns Relative date string
 */
export function formatRelativeDate(date: Date | string | number): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Format number with thousands separators
 *
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format currency value
 *
 * @param value - Number to format
 * @param currency - Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format percentage
 *
 * @param value - Number to format (0-1 or 0-100)
 * @param isDecimal - Whether input is decimal (0-1) or percentage (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number,
  isDecimal: boolean = true,
  decimals: number = 1
): string {
  const percentage = isDecimal ? value * 100 : value;
  return `${formatNumber(percentage, decimals)}%`;
}

/**
 * Format file size in human-readable format
 *
 * @param bytes - Size in bytes
 * @returns Formatted size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Truncate string to specified length
 *
 * @param str - String to truncate
 * @param length - Maximum length
 * @param suffix - Suffix to add when truncated (default: "...")
 * @returns Truncated string
 */
export function truncate(str: string, length: number, suffix: string = '...'): string {
  if (str.length <= length) return str;
  return str.substring(0, length - suffix.length) + suffix;
}

/**
 * Capitalize first letter of string
 *
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert string to title case
 *
 * @param str - String to convert
 * @returns Title cased string
 */
export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ');
}

/**
 * Generate random ID
 *
 * @param length - Length of ID (default: 16)
 * @returns Random ID string
 */
export function generateId(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Sleep/delay function
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Debounce function
 *
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 *
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 *
 * @param value - Value to check
 * @returns True if empty
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Safe JSON parse with fallback
 *
 * @param str - JSON string to parse
 * @param fallback - Fallback value if parse fails
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

/**
 * Get initials from name
 *
 * @param name - Full name
 * @returns Initials (e.g., "John Doe" => "JD")
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Calculate variance percentage between two numbers
 *
 * @param actual - Actual value
 * @param expected - Expected value
 * @returns Variance as decimal (e.g., 0.15 for 15% variance)
 */
export function calculateVariance(actual: number, expected: number): number {
  if (expected === 0) return 0;
  return (actual - expected) / expected;
}

/**
 * Calculate percentage of target
 *
 * @param actual - Actual value
 * @param target - Target value
 * @returns Percentage as decimal (e.g., 0.95 for 95%)
 */
export function calculatePercentageOfTarget(actual: number, target: number): number {
  if (target === 0) return 0;
  return actual / target;
}

/**
 * Clamp number between min and max
 *
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate color based on value and thresholds
 * Used for QC results, compliance scores, etc.
 *
 * @param value - Value to evaluate
 * @param thresholds - Threshold configuration
 * @returns Color string (Tailwind color class)
 */
export function getColorByThreshold(
  value: number,
  thresholds: { excellent: number; good: number; warning: number }
): string {
  if (value >= thresholds.excellent) return 'green';
  if (value >= thresholds.good) return 'blue';
  if (value >= thresholds.warning) return 'yellow';
  return 'red';
}

/**
 * Extract error message from unknown error
 *
 * @param error - Error object
 * @returns Error message string
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }
  return 'An unexpected error occurred';
}

/**
 * Create query string from object
 *
 * @param params - Parameters object
 * @returns Query string (e.g., "?foo=bar&baz=qux")
 */
export function createQueryString(params: Record<string, string | number | boolean>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, String(value));
  });
  return searchParams.toString();
}

/**
 * Parse query string to object
 *
 * @param queryString - Query string to parse
 * @returns Parameters object
 */
export function parseQueryString(queryString: string): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(queryString);
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

/**
 * Check if code is running on server
 *
 * @returns True if server-side
 */
export function isServer(): boolean {
  return typeof window === 'undefined';
}

/**
 * Check if code is running on client
 *
 * @returns True if client-side
 */
export function isClient(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Get browser locale
 *
 * @returns Browser locale string (e.g., "en-US")
 */
export function getBrowserLocale(): string {
  if (isServer()) return 'en-US';
  return navigator.language || 'en-US';
}
