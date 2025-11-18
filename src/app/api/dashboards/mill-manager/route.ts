import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Redirect to the actual analytics endpoint
    const analyticsResponse = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/analytics/mill-manager`,
      {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      }
    );

    const data = await analyticsResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Mill manager dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mill manager dashboard data' },
      { status: 500 }
    );
  }
}