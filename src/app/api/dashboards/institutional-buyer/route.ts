import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { generateMockInstitutionalBuyerDashboard } from '@/lib/mockData';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, return mock data
    const dashboardData = generateMockInstitutionalBuyerDashboard();
    return NextResponse.json(dashboardData);

    // TODO: Implement real data fetching when database is properly set up
  } catch (error) {
    console.error('Institutional buyer dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch institutional buyer dashboard data' },
      { status: 500 }
    );
  }
}
