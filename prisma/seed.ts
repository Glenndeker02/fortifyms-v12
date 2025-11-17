import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // Create sample users
  const hashedPassword = await bcrypt.hash('password123', 12)

  // Create system admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fortifymis.org' },
    update: {},
    create: {
      email: 'admin@fortifymis.org',
      name: 'System Administrator',
      password: hashedPassword,
      role: UserRole.SYSTEM_ADMIN,
    },
  })

  // Create mill manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@mill1.com' },
    update: {},
    create: {
      email: 'manager@mill1.com',
      name: 'John Manager',
      password: hashedPassword,
      role: UserRole.MILL_MANAGER,
    },
  })

  // Create mill operator
  const operator = await prisma.user.upsert({
    where: { email: 'operator@mill1.com' },
    update: {},
    create: {
      email: 'operator@mill1.com',
      name: 'Jane Operator',
      password: hashedPassword,
      role: UserRole.MILL_OPERATOR,
    },
  })

  // Create FWGA inspector
  const inspector = await prisma.user.upsert({
    where: { email: 'inspector@fwga.org' },
    update: {},
    create: {
      email: 'inspector@fwga.org',
      name: 'Robert Inspector',
      password: hashedPassword,
      role: UserRole.FWGA_INSPECTOR,
    },
  })

  // Create FWGA program manager
  const programManager = await prisma.user.upsert({
    where: { email: 'pm@fwga.org' },
    update: {},
    create: {
      email: 'pm@fwga.org',
      name: 'Sarah Program Manager',
      password: hashedPassword,
      role: UserRole.FWGA_PROGRAM_MANAGER,
    },
  })

  // Create institutional buyer
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@school.edu' },
    update: {},
    create: {
      email: 'buyer@school.edu',
      name: 'Michael Buyer',
      password: hashedPassword,
      role: UserRole.INSTITUTIONAL_BUYER,
    },
  })

  // Create logistics planner
  const logistics = await prisma.user.upsert({
    where: { email: 'logistics@transport.com' },
    update: {},
    create: {
      email: 'logistics@transport.com',
      name: 'David Logistics',
      password: hashedPassword,
      role: UserRole.LOGISTICS_PLANNER,
    },
  })

  // Create user profiles
  await prisma.userProfile.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      phone: '+1234567890',
      department: 'IT',
      position: 'System Administrator',
      employeeId: 'ADMIN001',
    },
  })

  await prisma.userProfile.upsert({
    where: { userId: manager.id },
    update: {},
    create: {
      userId: manager.id,
      phone: '+1234567891',
      department: 'Operations',
      position: 'Mill Manager',
      employeeId: 'MGR001',
    },
  })

  // Create sample mill
  const mill = await prisma.mill.upsert({
    where: { code: 'KEN001' },
    update: {},
    create: {
      name: 'Nairobi Fortified Foods Mill',
      code: 'KEN001',
      registrationNumber: 'KE-MILL-001',
      country: 'Kenya',
      region: 'Nairobi',
      address: '123 Industrial Area, Nairobi',
      phone: '+254-123-456789',
      email: 'info@nairobimill.com',
      certificationStatus: 'CERTIFIED',
      certificationDate: new Date('2024-01-15'),
    },
  })

  // Update manager and operator with mill
  await prisma.user.update({
    where: { id: manager.id },
    data: { millId: mill.id },
  })

  await prisma.user.update({
    where: { id: operator.id },
    data: { millId: mill.id },
  })

  // Create sample equipment
  await prisma.equipment.createMany({
    data: [
      {
        millId: mill.id,
        name: 'Doser Unit 1',
        type: 'Volumetric Doser',
        manufacturer: 'FortiTech',
        model: 'FT-2000',
        serialNumber: 'FT2000-001',
        installationDate: new Date('2023-06-15'),
        location: 'Line 1',
        lastCalibration: new Date('2024-10-01'),
        nextCalibrationDue: new Date('2025-01-01'),
      },
      {
        millId: mill.id,
        name: 'Mixer Unit 1',
        type: 'Batch Mixer',
        manufacturer: 'MixPro',
        model: 'MP-500',
        serialNumber: 'MP500-001',
        installationDate: new Date('2023-06-15'),
        location: 'Line 1',
        lastCalibration: new Date('2024-10-15'),
        nextCalibrationDue: new Date('2025-01-15'),
      },
    ],
  })

  // Create sample training course
  const course = await prisma.trainingCourse.create({
    data: {
      title: 'Introduction to Food Fortification',
      description: 'Basic principles and practices of food fortification',
      category: 'Process Training',
      difficulty: 'Beginner',
      duration: 30,
      language: 'en',
    },
  })

  // Create training module
  await prisma.trainingModule.create({
    data: {
      courseId: course.id,
      title: 'Module 1: Understanding Fortification',
      content: 'This module covers the basics of food fortification...',
      order: 1,
    },
  })

  // Create sample compliance template
  await prisma.complianceTemplate.create({
    data: {
      name: 'Kenya Rice Fortification Standard',
      version: '1.0',
      commodity: 'Rice',
      country: 'Kenya',
      standardReference: 'KS 05-2023',
      sections: JSON.stringify([
        {
          id: 'premix',
          title: 'Premix Storage & Handling',
          items: [
            {
              id: 'premix_1',
              question: 'Is the premix stored in a cool, dry location away from direct sunlight?',
              type: 'YES_NO',
              criticality: 'CRITICAL',
              points: 10,
            },
          ],
        },
      ]),
      scoringRules: JSON.stringify({
        passingScore: 75,
        criticalFailure: 'any_critical_no',
      }),
    },
  })

  // Create sample batch
  const batch = await prisma.batchLog.create({
    data: {
      millId: mill.id,
      operatorId: operator.id,
      batchId: 'KEN001-L1-20250105-0001',
      productionLine: 'Line 1',
      cropType: 'Parboiled Rice',
      productType: 'Fortified Parboiled Rice',
      inputWeight: 10000,
      outputWeight: 9500,
      premixType: 'Rice Premix Standard',
      premixBatchNumber: 'PM-2025-001',
      targetFortification: JSON.stringify({
        iron: 30,
        vitaminA: 750,
        vitaminB1: 15,
      }),
      actualPremixUsed: 20,
      expectedPremix: 20,
      variance: 0,
      status: 'QC_PENDING',
    },
  })

  // Create sample QC test
  await prisma.qCTest.create({
    data: {
      batchId: batch.id,
      testerId: operator.id,
      testType: 'Iron Content',
      result: 29.5,
      unit: 'ppm',
      target: 30,
      tolerance: 3,
      status: 'PASS',
    },
  })

  // Create sample maintenance task
  const equipment = await prisma.equipment.findFirst({
    where: { millId: mill.id },
  })

  if (equipment) {
    await prisma.maintenanceTask.create({
      data: {
        equipmentId: equipment.id,
        millId: mill.id,
        assignedTo: operator.id,
        type: 'CALIBRATION',
        frequency: 'QUARTERLY',
        scheduledDate: new Date('2025-01-15'),
        status: 'SCHEDULED',
        notes: 'Quarterly calibration of doser unit',
      },
    })
  }

  // Create sample notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: operator.id,
        type: 'MAINTENANCE_DUE',
        title: 'Equipment Calibration Due',
        message: 'Doser Unit 1 calibration is due on January 15, 2025',
        priority: 'MEDIUM',
      },
      {
        userId: manager.id,
        type: 'QC_PENDING',
        title: 'QC Test Pending',
        message: 'Batch KEN001-L1-20250105-0001 requires QC testing',
        priority: 'HIGH',
      },
      {
        userId: inspector.id,
        type: 'AUDIT_SUBMITTED',
        title: 'Audit Submitted for Review',
        message: 'Mill KEN001 has submitted their monthly audit',
        priority: 'MEDIUM',
      },
    ],
  })

  // Create sample procurement request
  await prisma.procurementRequest.create({
    data: {
      buyerId: buyer.id,
      title: 'Q4 2025 School Feeding Program - Maize Flour',
      commodity: 'Fortified Maize Flour',
      quantity: 500,
      unit: 'tons',
      specifications: JSON.stringify({
        iron: 30,
        vitaminA: 750,
        vitaminB1: 15,
        packaging: '50kg bags',
        deliveryLocation: 'Nairobi Schools',
      }),
      budget: 250000,
      deadline: new Date('2025-02-01'),
      status: 'OPEN',
    },
  })

  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })