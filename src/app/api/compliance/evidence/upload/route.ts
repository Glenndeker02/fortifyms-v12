import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const auditId = formData.get('auditId') as string
    const itemId = formData.get('itemId') as string
    const type = formData.get('type') as string // 'photo' or 'document'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = type === 'photo'
      ? ['image/jpeg', 'image/png', 'image/jpg']
      : ['application/pdf', 'image/jpeg', 'image/png']

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()
    const filename = `${uuidv4()}.${ext}`
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'compliance', auditId)

    // Create directory if it doesn't exist (in production, use cloud storage)
    // For now, we'll return a simulated path
    const filePath = `/uploads/compliance/${auditId}/${filename}`

    // In production, upload to S3/Cloud Storage
    // const bytes = await file.arrayBuffer()
    // const buffer = Buffer.from(bytes)
    // await writeFile(join(uploadDir, filename), buffer)

    // Store file metadata in database
    // await prisma.complianceEvidence.create({
    //   data: {
    //     auditId,
    //     itemId,
    //     type,
    //     filename: file.name,
    //     filepath: filePath,
    //     filesize: file.size,
    //     mimetype: file.type,
    //   },
    // })

    return NextResponse.json({
      success: true,
      file: {
        filename,
        path: filePath,
        size: file.size,
        type: file.type,
      },
    })
  } catch (error) {
    console.error('Error uploading evidence:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const auditId = searchParams.get('auditId')
    const itemId = searchParams.get('itemId')

    // Build filter
    const where: any = {}
    if (auditId) where.auditId = auditId
    if (itemId) where.itemId = itemId

    // In production, fetch from database
    // const evidence = await prisma.complianceEvidence.findMany({
    //   where,
    //   orderBy: { createdAt: 'desc' },
    // })

    // Mock response
    return NextResponse.json([])
  } catch (error) {
    console.error('Error fetching evidence:', error)
    return NextResponse.json(
      { error: 'Failed to fetch evidence' },
      { status: 500 }
    )
  }
}
