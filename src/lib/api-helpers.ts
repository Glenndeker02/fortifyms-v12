import { NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions, ExtendedSession } from '@/lib/auth';
import { handlePrismaError } from '@/lib/db';
import { PAGINATION } from '@/lib/constants';

/**
 * API Helper Functions
 *
 * Reusable utilities for API routes to reduce boilerplate and ensure consistency.
 *
 * Reference: TODO.md Phase 1, rules.md (API Standards, Error Handling)
 */

/**
 * API Error Classes
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(404, message, 'NOT_FOUND');
  }
}

export class ValidationError extends ApiError {
  constructor(message: string = 'Validation failed', public errors?: unknown) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Resource already exists') {
    super(409, message, 'CONFLICT');
  }
}

/**
 * Success Response Helper
 *
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with success format
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * Created Response Helper (201)
 *
 * @param data - Created resource data
 * @returns NextResponse with 201 status
 */
export function createdResponse<T>(data: T): NextResponse {
  return successResponse(data, 201);
}

/**
 * No Content Response Helper (204)
 *
 * @returns NextResponse with 204 status
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Error Response Helper
 *
 * @param message - Error message
 * @param status - HTTP status code (default: 500)
 * @param code - Error code
 * @param details - Additional error details
 * @returns NextResponse with error format
 */
export function errorResponse(
  message: string,
  status: number = 500,
  code?: string,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(code && { code }),
      ...(details && { details }),
    },
    { status }
  );
}

/**
 * Handle API Error
 * Converts various error types to appropriate API responses
 *
 * @param error - Error object
 * @returns NextResponse with appropriate error format
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  // Zod validation errors
  if (error instanceof ZodError) {
    return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', error.errors);
  }

  // Custom API errors
  if (error instanceof ApiError) {
    return errorResponse(error.message, error.statusCode, error.code);
  }

  // Prisma errors
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const prismaError = handlePrismaError(error);
    return errorResponse(prismaError.message, 400, prismaError.code);
  }

  // Generic errors
  if (error instanceof Error) {
    return errorResponse(
      process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      500,
      'INTERNAL_ERROR'
    );
  }

  // Unknown errors
  return errorResponse('An unexpected error occurred', 500, 'UNKNOWN_ERROR');
}

/**
 * Get Authenticated Session
 * Throws UnauthorizedError if no session
 *
 * @returns Session object
 */
export async function requireAuth(): Promise<ExtendedSession> {
  const session = await getServerSession(authOptions);

  if (!session) {
    throw new UnauthorizedError('Authentication required');
  }

  return session as ExtendedSession;
}

/**
 * Validate Request Body with Zod Schema
 *
 * @param request - NextRequest object
 * @param schema - Zod schema
 * @returns Validated and typed data
 */
export async function validateRequest<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<T> {
  const body = await request.json();
  return schema.parse(body);
}

/**
 * Pagination Parameters
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Parse Pagination Parameters from URL
 *
 * @param searchParams - URL search parameters
 * @returns Pagination parameters
 */
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(
    PAGINATION.MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get('pageSize') || String(PAGINATION.DEFAULT_PAGE_SIZE), 10))
  );

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

/**
 * Create Paginated Response
 *
 * @param data - Array of data items
 * @param total - Total count of items
 * @param params - Pagination parameters
 * @returns Paginated response object
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.pageSize);

  return {
    data,
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages,
      hasMore: params.page < totalPages,
    },
  };
}

/**
 * Sort Order Type
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Parse Sort Parameters from URL
 *
 * @param searchParams - URL search parameters
 * @param allowedFields - Allowed sort fields
 * @param defaultField - Default sort field
 * @returns Sort parameters object
 */
export function parseSortParams(
  searchParams: URLSearchParams,
  allowedFields: string[],
  defaultField: string = 'createdAt'
): { field: string; order: SortOrder } {
  const sortBy = searchParams.get('sortBy') || defaultField;
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  // Validate sort field
  const field = allowedFields.includes(sortBy) ? sortBy : defaultField;
  const order: SortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

  return { field, order };
}

/**
 * Parse Filter Parameters from URL
 *
 * @param searchParams - URL search parameters
 * @param allowedFilters - Allowed filter keys
 * @returns Filter parameters object
 */
export function parseFilterParams(
  searchParams: URLSearchParams,
  allowedFilters: string[]
): Record<string, string> {
  const filters: Record<string, string> = {};

  allowedFilters.forEach((key) => {
    const value = searchParams.get(key);
    if (value) {
      filters[key] = value;
    }
  });

  return filters;
}

/**
 * Build Prisma Where Clause from Filters
 *
 * @param filters - Filter parameters
 * @returns Prisma where clause
 */
export function buildWhereClause(filters: Record<string, string>): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  Object.entries(filters).forEach(([key, value]) => {
    // Handle different filter types
    if (value === 'true' || value === 'false') {
      // Boolean filters
      where[key] = value === 'true';
    } else if (!isNaN(Number(value))) {
      // Numeric filters
      where[key] = Number(value);
    } else if (value.includes(',')) {
      // Array filters (e.g., "status=ACTIVE,PENDING")
      where[key] = { in: value.split(',') };
    } else {
      // String filters (case-insensitive contains)
      where[key] = { contains: value, mode: 'insensitive' };
    }
  });

  return where;
}

/**
 * Rate Limit Helper
 * Simple in-memory rate limiting (use Redis in production)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    // New window or expired window
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: limit - 1, resetTime: now + windowMs };
  }

  if (record.count >= limit) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  // Increment count
  record.count++;
  rateLimitMap.set(identifier, record);
  return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime };
}

/**
 * Rate Limit Error Response
 *
 * @param resetTime - Reset timestamp
 * @returns NextResponse with 429 status
 */
export function rateLimitErrorResponse(resetTime: number): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      resetTime,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)),
      },
    }
  );
}

/**
 * Parse Request ID from Headers or Generate New
 *
 * @param request - Request object
 * @returns Request ID string
 */
export function getRequestId(request: Request): string {
  return request.headers.get('x-request-id') || crypto.randomUUID();
}

/**
 * Add CORS Headers to Response
 *
 * @param response - NextResponse object
 * @param origin - Allowed origin (default: *)
 * @returns NextResponse with CORS headers
 */
export function addCorsHeaders(response: NextResponse, origin: string = '*'): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}

/**
 * Handle OPTIONS Request (CORS Preflight)
 *
 * @returns NextResponse with CORS headers
 */
export function handleOptionsRequest(): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response);
}

/**
 * Log API Request (for debugging/monitoring)
 *
 * @param request - Request object
 * @param duration - Request duration in ms
 * @param status - Response status code
 */
export function logApiRequest(request: Request, duration: number, status: number): void {
  if (process.env.NODE_ENV === 'development') {
    const url = new URL(request.url);
    console.log({
      method: request.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      duration: `${duration}ms`,
      status,
    });
  }
}

/**
 * Sanitize Object for Response
 * Removes sensitive fields like passwords
 *
 * @param obj - Object to sanitize
 * @param fieldsToRemove - Fields to remove
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fieldsToRemove: string[] = ['password', 'passwordHash']
): Partial<T> {
  const sanitized = { ...obj };

  fieldsToRemove.forEach((field) => {
    if (field in sanitized) {
      delete sanitized[field];
    }
  });

  return sanitized;
}

/**
 * Alias for parsePaginationParams for backward compatibility
 */
export function getPaginationParams(request: Request): PaginationParams {
  const url = new URL(request.url);
  return parsePaginationParams(url.searchParams);
}

/**
 * Alias for parseSortParams for backward compatibility
 */
export function getSortingParams(
  request: Request,
  allowedFields: string[],
  defaultField: string = 'createdAt'
): { field: string; order: SortOrder } {
  const url = new URL(request.url);
  return parseSortParams(url.searchParams, allowedFields, defaultField);
}
