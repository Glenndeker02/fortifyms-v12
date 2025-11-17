import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"
import { ZAI } from "z-ai-web-dev-sdk"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role } = await request.json()

    // Validate input
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      )
    }

    // Validate role
    if (!Object.values(UserRole).includes(role as UserRole)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as UserRole
      }
    })

    // Create user profile
    await db.userProfile.create({
      data: {
        userId: user.id,
        timezone: "UTC",
        language: "en"
      }
    })

    // Log the registration
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "USER_REGISTER",
        resourceType: "USER",
        resourceId: user.id,
        newValues: JSON.stringify({
          name,
          email,
          role,
          createdAt: user.createdAt
        }),
        ipAddress: request.ip || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown"
      }
    })

    // Send welcome notification
    await db.notification.create({
      data: {
        userId: user.id,
        type: "WELCOME",
        title: "Welcome to FortifyMIS Portal",
        message: `Welcome ${name}! Your account has been created successfully. Please complete your profile to get started.`,
        priority: "MEDIUM"
      }
    })

    return NextResponse.json({
      message: "User created successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })

  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}