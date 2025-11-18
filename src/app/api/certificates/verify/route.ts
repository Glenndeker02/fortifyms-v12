import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const verifySchema = z.object({
  verificationCode: z.string().min(1, 'Verification code is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { verificationCode } = verifySchema.parse(body)

    // Clean the verification code (remove spaces and dashes)
    const cleanCode = verificationCode.replace(/[\s-]/g, '').toUpperCase()

    // Find certificate by verification code
    const certificate = await prisma.trainingCertificate.findFirst({
      where: {
        verificationCode: {
          contains: cleanCode,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            duration: true,
          },
        },
        progress: {
          select: {
            score: true,
            completedAt: true,
          },
        },
      },
    })

    if (!certificate) {
      return NextResponse.json(
        {
          valid: false,
          message: 'Certificate not found. Please check the verification code.',
        },
        { status: 404 }
      )
    }

    // Check if certificate is expired
    const isExpired = certificate.expiresAt
      ? new Date(certificate.expiresAt) < new Date()
      : false

    if (isExpired) {
      return NextResponse.json(
        {
          valid: false,
          message: 'This certificate has expired.',
          certificate: {
            userName: certificate.user.name,
            courseName: certificate.course.title,
            issuedDate: certificate.issuedDate,
            expiresAt: certificate.expiresAt,
          },
        },
        { status: 200 }
      )
    }

    // Return valid certificate details
    return NextResponse.json(
      {
        valid: true,
        message: 'Certificate is valid and authentic.',
        certificate: {
          id: certificate.id,
          verificationCode: certificate.verificationCode,
          userName: certificate.user.name || certificate.user.email,
          userEmail: certificate.user.email,
          courseName: certificate.course.title,
          courseDescription: certificate.course.description,
          courseDuration: certificate.course.duration,
          issuedDate: certificate.issuedDate,
          expiresAt: certificate.expiresAt,
          score: certificate.progress?.score || 0,
          completedAt: certificate.progress?.completedAt,
          certificateUrl: certificate.certificateUrl,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error verifying certificate:', error)
    return NextResponse.json(
      { error: 'Failed to verify certificate' },
      { status: 500 }
    )
  }
}

// GET method for quick verification via URL params
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const verificationCode = searchParams.get('code')

    if (!verificationCode) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      )
    }

    // Use POST logic by creating a mock request
    return POST(
      new NextRequest(request.url, {
        method: 'POST',
        body: JSON.stringify({ verificationCode }),
      })
    )
  } catch (error) {
    console.error('Error verifying certificate:', error)
    return NextResponse.json(
      { error: 'Failed to verify certificate' },
      { status: 500 }
    )
  }
}
