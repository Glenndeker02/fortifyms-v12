import { NextRequest, NextResponse } from 'next/server';
import { AuthManager, User } from '@/lib/auth';
import { z } from 'zod';

// Mock user database - in production, this would be a real database
const users: User[] = [
  {
    id: '1',
    email: 'admin@fortifymis.com',
    name: 'Admin User',
    role: 'admin',
    millId: undefined,
  },
  {
    id: '2',
    email: 'manager@mill.com',
    name: 'Mill Manager',
    role: 'mill_manager',
    millId: 'mill-1',
  },
  {
    id: '3',
    email: 'operator@mill.com',
    name: 'Mill Operator',
    role: 'operator',
    millId: 'mill-1',
  },
  {
    id: '4',
    email: 'inspector@fwga.com',
    name: 'FWGA Inspector',
    role: 'inspector',
    millId: undefined,
  },
];

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // Find user by email (in production, verify password hash)
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Mock password verification (in production, use bcrypt)
    // For demo purposes, any password with 6+ characters works
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create session
    const token = AuthManager.createSession(user);

    // Set authentication cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        millId: user.millId,
      },
      message: 'Login successful',
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}