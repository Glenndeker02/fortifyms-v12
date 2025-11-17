import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Singleton
 *
 * This file exports a single instance of PrismaClient to be used throughout the application.
 * In development, it prevents multiple instances from being created due to hot reloading.
 * In production, it creates a single optimized instance.
 *
 * Reference: TODO.md Phase 1, rules.md Rule 1 (Database First)
 */

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Create Prisma Client instance with logging configuration
 */
const createPrismaClient = () => {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    errorFormat: 'pretty',
  });

  // Add query logging for development
  if (process.env.NODE_ENV === 'development') {
    client.$on('query' as never, (e: unknown) => {
      const event = e as { query: string; duration: number };
      console.log(`Query: ${event.query}`);
      console.log(`Duration: ${event.duration}ms`);
    });
  }

  return client;
};

/**
 * Export singleton Prisma Client instance
 *
 * Usage:
 * ```typescript
 * import { db } from '@/lib/db';
 *
 * const users = await db.user.findMany();
 * ```
 */
export const db = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = db;
}

/**
 * Utility function to handle Prisma errors
 */
export function handlePrismaError(error: unknown): {
  message: string;
  code?: string;
} {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const prismaError = error as { code: string; meta?: { target?: string[] } };

    switch (prismaError.code) {
      case 'P2002':
        return {
          message: 'A record with this value already exists',
          code: prismaError.code,
        };
      case 'P2025':
        return {
          message: 'Record not found',
          code: prismaError.code,
        };
      case 'P2003':
        return {
          message: 'Foreign key constraint failed',
          code: prismaError.code,
        };
      default:
        return {
          message: 'Database error occurred',
          code: prismaError.code,
        };
    }
  }

  return {
    message: 'An unexpected error occurred',
  };
}

/**
 * Gracefully disconnect from database
 * Used in serverless environments and during shutdown
 */
export async function disconnectDatabase(): Promise<void> {
  await db.$disconnect();
}

// Handle graceful shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await disconnectDatabase();
  });
}
