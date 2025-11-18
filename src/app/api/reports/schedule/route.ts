import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { scheduledReportsManager } from '@/lib/scheduledReports';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reportName, frequency, recipients, format, sections } = body;

    // Create schedule
    const schedule = {
      id: `schedule-${Date.now()}`,
      reportName,
      frequency,
      recipients,
      format,
      sections,
      enabled: true,
    };

    scheduledReportsManager.scheduleReport(schedule);

    return NextResponse.json({
      success: true,
      scheduleId: schedule.id,
      message: 'Report scheduled successfully',
    });
  } catch (error) {
    console.error('Schedule report error:', error);
    return NextResponse.json(
      { error: 'Failed to schedule report' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schedules = await scheduledReportsManager.listSchedules();
    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Get schedules error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('id');

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID required' }, { status: 400 });
    }

    scheduledReportsManager.cancelSchedule(scheduleId);

    return NextResponse.json({
      success: true,
      message: 'Schedule cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel schedule error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel schedule' },
      { status: 500 }
    );
  }
}
