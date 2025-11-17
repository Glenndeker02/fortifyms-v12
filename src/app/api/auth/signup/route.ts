import { NextRequest, NextResponse } from 'next/server';
import { AuthManager, User } from '@/lib/auth';
import { z } from 'zod';

// Mock user database - in production, this would be a real database
let users: User[] = [
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

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  role: z.enum(['operator', 'mill_manager']),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, role } = signupSchema.parse(body);

    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Create new user
    const newUser: User = {
      id: (users.length + 1).toString(),
      name,
      email,
      role,
      millId: role === 'operator' || role === 'mill_manager' ? 'mill-1' : undefined,
    };

    // Add to users array (in production, save to database)
    users.push(newUser);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please login to continue.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}