import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@/lib/db'
import { TrainingCertificatePDF } from '@/components/certificates/TrainingCertificatePDF'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const certificateId = params.id

    // Fetch certificate with related data
    const certificate = await prisma.trainingCertificate.findUnique({
      where: { id: certificateId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        course: {
          select: {
            title: true,
            duration: true,
          },
        },
        progress: {
          select: {
            score: true,
          },
        },
      },
    })

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      )
    }

    // Generate PDF
    const pdfStream = await renderToBuffer(
      TrainingCertificatePDF({
        userName: certificate.user.name || certificate.user.email,
        courseName: certificate.course.title,
        completionDate: certificate.issuedDate.toISOString(),
        score: certificate.progress?.score || 0,
        verificationCode: certificate.verificationCode,
        courseId: certificate.courseId,
        duration: certificate.course.duration ? `${certificate.course.duration} minutes` : undefined,
      })
    )

    // Return PDF as response
    return new NextResponse(pdfStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificate-${certificate.verificationCode}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating certificate PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate certificate' },
      { status: 500 }
    )
  }
}
