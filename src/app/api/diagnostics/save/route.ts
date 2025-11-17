import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { diagnosticId, responses, currentStep } = await request.json();

    // Update diagnostic result with progress
    const diagnosticResult = await db.diagnosticResult.update({
      where: { 
        id: diagnosticId,
        userId: session.user.id // Ensure user can only update their own diagnostics
      },
      data: {
        responses: JSON.stringify(responses),
        currentStep,
        progress: (currentStep / Object.keys(responses).length) * 100,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      diagnostic: diagnosticResult
    });
  } catch (error) {
    console.error('Error saving diagnostic progress:', error);
    return NextResponse.json(
      { error: 'Failed to save progress' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const diagnosticId = searchParams.get('diagnosticId');

    if (!diagnosticId) {
      // Return all in-progress diagnostics for the user
      const inProgressDiagnostics = await db.diagnosticResult.findMany({
        where: {
          userId: session.user.id,
          status: 'IN_PROGRESS'
        },
        include: {
          questionnaire: true
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      return NextResponse.json({
        diagnostics: inProgressDiagnostics.map(diagnostic => ({
          ...diagnostic,
          responses: JSON.parse(diagnostic.responses || '{}')
        }))
      });
    }

    // Return specific diagnostic
    const diagnostic = await db.diagnosticResult.findFirst({
      where: {
        id: diagnosticId,
        userId: session.user.id
      },
      include: {
        questionnaire: true
      }
    });

    if (!diagnostic) {
      return NextResponse.json(
        { error: 'Diagnostic not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      diagnostic: {
        ...diagnostic,
        responses: JSON.parse(diagnostic.responses || '{}')
      }
    });
  } catch (error) {
    console.error('Error fetching diagnostic progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}