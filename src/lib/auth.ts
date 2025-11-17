import { NextAuthOptions, User as NextAuthUser, Session } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { USER_ROLES, UserRole } from '@/lib/constants';

/**
 * NextAuth Configuration
 *
 * Authentication system for FortifyMIS Portal using NextAuth.js
 * Implements credentials-based authentication with bcrypt password hashing.
 *
 * Reference: TODO.md Phase 0, newprd.md Section 2 (User Roles), rules.md Rule 6 (Security)
 */

/**
 * Extended User type with role and millId
 */
export interface ExtendedUser extends NextAuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  millId: string | null;
}

/**
 * Extended JWT type
 */
interface ExtendedJWT extends JWT {
  id: string;
  email: string;
  role: UserRole;
  millId: string | null;
}

/**
 * Extended Session type
 */
export interface ExtendedSession extends Session {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    millId: string | null;
  };
}

/**
 * NextAuth Configuration Options
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          // Find user by email
          const user = await db.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              role: true,
              millId: true,
              isActive: true,
            },
          });

          if (!user) {
            throw new Error('Invalid email or password');
          }

          // Check if user is active
          if (!user.isActive) {
            throw new Error('Account is deactivated. Please contact support.');
          }

          // Verify password
          if (!user.password) {
            throw new Error('Invalid account configuration');
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordValid) {
            throw new Error('Invalid email or password');
          }

          // Return user object (password excluded)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as UserRole,
            millId: user.millId,
          };
        } catch (error) {
          console.error('Auth error:', error);
          throw error;
        }
      },
    }),
  ],

  callbacks: {
    /**
     * JWT callback - Called when JWT is created or updated
     */
    async jwt({ token, user, trigger, session }): Promise<ExtendedJWT> {
      // Initial sign in
      if (user) {
        const extendedUser = user as ExtendedUser;
        token.id = extendedUser.id;
        token.email = extendedUser.email;
        token.role = extendedUser.role;
        token.millId = extendedUser.millId;
      }

      // Handle session updates
      if (trigger === 'update' && session) {
        token.name = session.name;
        token.email = session.email;
      }

      return token as ExtendedJWT;
    },

    /**
     * Session callback - Called when session is checked
     */
    async session({ session, token }): Promise<ExtendedSession> {
      const extendedToken = token as ExtendedJWT;

      return {
        ...session,
        user: {
          id: extendedToken.id,
          email: extendedToken.email,
          name: extendedToken.name || null,
          role: extendedToken.role,
          millId: extendedToken.millId,
        },
      };
    },
  },

  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // Update session every 1 hour
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === 'development',
};

/**
 * Hash password using bcrypt
 *
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify password against hash
 *
 * @param password - Plain text password
 * @param hash - Hashed password
 * @returns True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Role-Based Access Control (RBAC) Helpers
 */

/**
 * Check if user has required role
 *
 * @param userRole - User's role
 * @param requiredRole - Required role(s)
 * @returns True if user has required role
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole | UserRole[]): boolean {
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userRole);
  }
  return userRole === requiredRole;
}

/**
 * Check if user is mill staff (operator or manager)
 *
 * @param userRole - User's role
 * @returns True if user is mill staff
 */
export function isMillStaff(userRole: UserRole): boolean {
  return hasRole(userRole, [USER_ROLES.MILL_OPERATOR, USER_ROLES.MILL_MANAGER]);
}

/**
 * Check if user is FWGA staff (inspector or program manager)
 *
 * @param userRole - User's role
 * @returns True if user is FWGA staff
 */
export function isFWGAStaff(userRole: UserRole): boolean {
  return hasRole(userRole, [
    USER_ROLES.FWGA_INSPECTOR,
    USER_ROLES.FWGA_PROGRAM_MANAGER,
  ]);
}

/**
 * Check if user is mill manager
 *
 * @param userRole - User's role
 * @returns True if user is mill manager
 */
export function isMillManager(userRole: UserRole): boolean {
  return userRole === USER_ROLES.MILL_MANAGER;
}

/**
 * Check if user is mill operator
 *
 * @param userRole - User's role
 * @returns True if user is mill operator
 */
export function isMillOperator(userRole: UserRole): boolean {
  return userRole === USER_ROLES.MILL_OPERATOR;
}

/**
 * Check if user is FWGA inspector
 *
 * @param userRole - User's role
 * @returns True if user is FWGA inspector
 */
export function isFWGAInspector(userRole: UserRole): boolean {
  return userRole === USER_ROLES.FWGA_INSPECTOR;
}

/**
 * Check if user is FWGA program manager
 *
 * @param userRole - User's role
 * @returns True if user is FWGA program manager
 */
export function isFWGAProgramManager(userRole: UserRole): boolean {
  return userRole === USER_ROLES.FWGA_PROGRAM_MANAGER;
}

/**
 * Check if user is institutional buyer
 *
 * @param userRole - User's role
 * @returns True if user is institutional buyer
 */
export function isInstitutionalBuyer(userRole: UserRole): boolean {
  return userRole === USER_ROLES.INSTITUTIONAL_BUYER;
}

/**
 * Check if user is logistics planner
 *
 * @param userRole - User's role
 * @returns True if user is logistics planner
 */
export function isLogisticsPlanner(userRole: UserRole): boolean {
  return userRole === USER_ROLES.LOGISTICS_PLANNER;
}

/**
 * Check if user is system admin
 *
 * @param userRole - User's role
 * @returns True if user is system admin
 */
export function isSystemAdmin(userRole: UserRole): boolean {
  return userRole === USER_ROLES.SYSTEM_ADMIN;
}

/**
 * Check if user can access mill data
 *
 * @param userRole - User's role
 * @param userMillId - User's mill ID
 * @param targetMillId - Target mill ID
 * @returns True if user can access mill data
 */
export function canAccessMillData(
  userRole: UserRole,
  userMillId: string | null,
  targetMillId: string
): boolean {
  // System admin and FWGA staff can access all mills
  if (isSystemAdmin(userRole) || isFWGAStaff(userRole)) {
    return true;
  }

  // Mill staff can only access their own mill
  if (isMillStaff(userRole)) {
    return userMillId === targetMillId;
  }

  return false;
}

/**
 * Check if user can edit mill data
 *
 * @param userRole - User's role
 * @param userMillId - User's mill ID
 * @param targetMillId - Target mill ID
 * @returns True if user can edit mill data
 */
export function canEditMillData(
  userRole: UserRole,
  userMillId: string | null,
  targetMillId: string
): boolean {
  // System admin can edit all mills
  if (isSystemAdmin(userRole)) {
    return true;
  }

  // Mill manager can edit their own mill
  if (isMillManager(userRole)) {
    return userMillId === targetMillId;
  }

  return false;
}

/**
 * Check if user can approve compliance audits
 *
 * @param userRole - User's role
 * @returns True if user can approve audits
 */
export function canApproveAudits(userRole: UserRole): boolean {
  return hasRole(userRole, [
    USER_ROLES.FWGA_INSPECTOR,
    USER_ROLES.FWGA_PROGRAM_MANAGER,
    USER_ROLES.SYSTEM_ADMIN,
  ]);
}

/**
 * Check if user can manage users
 *
 * @param userRole - User's role
 * @returns True if user can manage users
 */
export function canManageUsers(userRole: UserRole): boolean {
  return hasRole(userRole, [USER_ROLES.MILL_MANAGER, USER_ROLES.SYSTEM_ADMIN]);
}

/**
 * Check if user can view analytics
 *
 * @param userRole - User's role
 * @returns True if user can view analytics
 */
export function canViewAnalytics(userRole: UserRole): boolean {
  return hasRole(userRole, [
    USER_ROLES.MILL_MANAGER,
    USER_ROLES.FWGA_INSPECTOR,
    USER_ROLES.FWGA_PROGRAM_MANAGER,
    USER_ROLES.SYSTEM_ADMIN,
  ]);
}

/**
 * Get user permissions based on role
 *
 * @param userRole - User's role
 * @returns Object with permission flags
 */
export function getUserPermissions(userRole: UserRole): {
  canEditMill: boolean;
  canApproveBatches: boolean;
  canApproveAudits: boolean;
  canManageUsers: boolean;
  canViewAnalytics: boolean;
  canAccessProcurement: boolean;
  canManageLogistics: boolean;
} {
  return {
    canEditMill: hasRole(userRole, [USER_ROLES.MILL_MANAGER, USER_ROLES.SYSTEM_ADMIN]),
    canApproveBatches: hasRole(userRole, [USER_ROLES.MILL_MANAGER, USER_ROLES.SYSTEM_ADMIN]),
    canApproveAudits: canApproveAudits(userRole),
    canManageUsers: canManageUsers(userRole),
    canViewAnalytics: canViewAnalytics(userRole),
    canAccessProcurement: hasRole(userRole, [
      USER_ROLES.MILL_MANAGER,
      USER_ROLES.INSTITUTIONAL_BUYER,
      USER_ROLES.SYSTEM_ADMIN,
    ]),
    canManageLogistics: hasRole(userRole, [
      USER_ROLES.LOGISTICS_PLANNER,
      USER_ROLES.SYSTEM_ADMIN,
    ]),
  };
}

/**
 * Get default redirect path based on user role
 *
 * @param userRole - User's role
 * @returns Redirect path
 */
export function getDefaultRedirectPath(userRole: UserRole): string {
  switch (userRole) {
    case USER_ROLES.MILL_OPERATOR:
      return '/dashboard/operator';
    case USER_ROLES.MILL_MANAGER:
      return '/dashboard/manager';
    case USER_ROLES.FWGA_INSPECTOR:
      return '/dashboard/inspector';
    case USER_ROLES.FWGA_PROGRAM_MANAGER:
      return '/dashboard/program-manager';
    case USER_ROLES.INSTITUTIONAL_BUYER:
      return '/dashboard/buyer';
    case USER_ROLES.LOGISTICS_PLANNER:
      return '/dashboard/logistics';
    case USER_ROLES.SYSTEM_ADMIN:
      return '/dashboard/admin';
    default:
      return '/dashboard';
  }
}
