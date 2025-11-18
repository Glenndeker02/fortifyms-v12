import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create National Tenant
  console.log('Creating National Tenant...');
  const nationalTenant = await prisma.tenant.upsert({
    where: { id: 'national-ke' },
    update: {},
    create: {
      id: 'national-ke',
      name: 'Kenya National Food Fortification Program',
      type: 'NATIONAL',
      settings: {
        minimumFortificationLevel: 30,
        qcPassThreshold: 95,
        complianceScoreThreshold: 80,
        maxBatchRetentionDays: 365,
        requireDualApproval: false,
        enableGeotagging: true,
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        criticalAlertEscalationMinutes: 30,
        highAlertEscalationMinutes: 120,
        timezone: 'Africa/Nairobi',
        locale: 'en-KE',
        currency: 'KES',
        measurementSystem: 'metric',
      },
      features: {
        batchManagement: true,
        qcTesting: true,
        complianceAudits: true,
        equipmentTracking: true,
        trainingManagement: true,
        orderManagement: true,
        deliveryTracking: true,
        analytics: true,
        reporting: true,
        advancedAnalytics: true,
        customReports: true,
        apiAccess: true,
        bulkOperations: true,
        multiLanguage: true,
        offlineMode: false,
      },
    },
  });

  // Create Regional Tenant
  console.log('Creating Regional Tenant...');
  const nairobiRegion = await prisma.tenant.upsert({
    where: { id: 'regional-nairobi' },
    update: {},
    create: {
      id: 'regional-nairobi',
      name: 'Nairobi Regional Office',
      type: 'REGIONAL',
      parentId: nationalTenant.id,
      settings: {
        minimumFortificationLevel: 30,
        qcPassThreshold: 95,
        complianceScoreThreshold: 80,
        maxBatchRetentionDays: 365,
        requireDualApproval: false,
        enableGeotagging: true,
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        criticalAlertEscalationMinutes: 30,
        highAlertEscalationMinutes: 120,
        timezone: 'Africa/Nairobi',
        locale: 'en-KE',
        currency: 'KES',
        measurementSystem: 'metric',
      },
      features: {
        batchManagement: true,
        qcTesting: true,
        complianceAudits: true,
        equipmentTracking: true,
        trainingManagement: true,
        orderManagement: true,
        deliveryTracking: true,
        analytics: true,
        reporting: true,
        advancedAnalytics: true,
        customReports: true,
        bulkOperations: true,
        multiLanguage: false,
        apiAccess: false,
        offlineMode: false,
      },
    },
  });

  // Create Mills
  console.log('Creating Mills...');
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
      latitude: -1.2864,
      longitude: 36.8172,
      tenantId: nairobiRegion.id,
      certificationStatus: 'CERTIFIED',
      certificationDate: new Date('2024-01-15'),
    },
  });

  const mill2 = await prisma.mill.upsert({
    where: { code: 'KEN002' },
    update: {},
    create: {
      name: 'Unga Group Mill',
      code: 'KEN002',
      registrationNumber: 'KE-MILL-002',
      country: 'Kenya',
      region: 'Nairobi',
      address: 'Mombasa Road, Nairobi',
      phone: '+254-700-234567',
      email: 'info@ungagroup.com',
      latitude: -1.3293,
      longitude: 36.9152,
      tenantId: nairobiRegion.id,
      certificationStatus: 'CERTIFIED',
      certificationDate: new Date('2024-02-20'),
    },
  });

  // Create Institutional Buyer Tenant
  console.log('Creating Institutional Buyer Tenant...');
  const wfpTenant = await prisma.tenant.upsert({
    where: { id: 'institutional-wfp' },
    update: {},
    create: {
      id: 'institutional-wfp',
      name: 'World Food Programme - Kenya',
      type: 'INSTITUTIONAL',
      parentId: nationalTenant.id,
      settings: {
        minimumFortificationLevel: 30,
        qcPassThreshold: 98,
        complianceScoreThreshold: 85,
        maxBatchRetentionDays: 180,
        requireDualApproval: true,
        enableGeotagging: true,
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        criticalAlertEscalationMinutes: 15,
        highAlertEscalationMinutes: 60,
        timezone: 'Africa/Nairobi',
        locale: 'en',
        currency: 'USD',
        measurementSystem: 'metric',
      },
      features: {
        batchManagement: false,
        qcTesting: true,
        complianceAudits: false,
        equipmentTracking: false,
        trainingManagement: false,
        orderManagement: true,
        deliveryTracking: true,
        analytics: true,
        reporting: true,
        advancedAnalytics: false,
        customReports: false,
        apiAccess: false,
        bulkOperations: false,
        multiLanguage: false,
        offlineMode: false,
      },
    },
  });

  // Create Users with Different Roles
  console.log('Creating Users...');
  const hashedPassword = await bcrypt.hash('password123', 12);

  // System Administrator
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fortifyms.com' },
    update: {},
    create: {
      email: 'admin@fortifyms.com',
      name: 'System Administrator',
      password: hashedPassword,
      role: UserRole.SYSTEM_ADMIN,
      tenantId: nationalTenant.id,
      isActive: true,
      emailVerified: new Date(),
    },
  });

  // FWGA Program Manager
  const programManager = await prisma.user.upsert({
    where: { email: 'pm@fwga.org' },
    update: {},
    create: {
      email: 'pm@fwga.org',
      name: 'James Mwangi - Program Manager',
      password: hashedPassword,
      role: UserRole.FWGA_PROGRAM_MANAGER,
      tenantId: nationalTenant.id,
      isActive: true,
      emailVerified: new Date(),
    },
  });

  // FWGA Inspector
  const inspector = await prisma.user.upsert({
    where: { email: 'inspector@fwga.org' },
    update: {},
    create: {
      email: 'inspector@fwga.org',
      name: 'Sarah Njeri - Inspector',
      password: hashedPassword,
      role: UserRole.FWGA_INSPECTOR,
      tenantId: nairobiRegion.id,
      isActive: true,
      emailVerified: new Date(),
    },
  });

  // Mill Manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@mill1.com' },
    update: {},
    create: {
      email: 'manager@mill1.com',
      name: 'John Kamau - Mill Manager',
      password: hashedPassword,
      role: UserRole.MILL_MANAGER,
      millId: mill.id,
      tenantId: nairobiRegion.id,
      isActive: true,
      emailVerified: new Date(),
    },
  });

  // Mill Technician
  const technician = await prisma.user.upsert({
    where: { email: 'technician@mill1.com' },
    update: {},
    create: {
      email: 'technician@mill1.com',
      name: 'Peter Ochieng - Technician',
      password: hashedPassword,
      role: UserRole.MILL_TECHNICIAN,
      millId: mill.id,
      tenantId: nairobiRegion.id,
      isActive: true,
      emailVerified: new Date(),
    },
  });

  // Mill Operator
  const operator = await prisma.user.upsert({
    where: { email: 'operator@mill1.com' },
    update: {},
    create: {
      email: 'operator@mill1.com',
      name: 'Mary Wanjiku - Operator',
      password: hashedPassword,
      role: UserRole.MILL_OPERATOR,
      millId: mill.id,
      tenantId: nairobiRegion.id,
      isActive: true,
      emailVerified: new Date(),
    },
  });

  // Institutional Buyer
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@school.edu' },
    update: {},
    create: {
      email: 'buyer@school.edu',
      name: 'Alice Mutua - Buyer',
      password: hashedPassword,
      role: UserRole.INSTITUTIONAL_BUYER,
      tenantId: wfpTenant.id,
      isActive: true,
      emailVerified: new Date(),
    },
  });

  // Driver/Logistics
  const driver = await prisma.user.upsert({
    where: { email: 'driver@logistics.com' },
    update: {},
    create: {
      email: 'driver@logistics.com',
      name: 'Michael Otieno - Driver',
      password: hashedPassword,
      role: UserRole.DRIVER_LOGISTICS,
      tenantId: nairobiRegion.id,
      isActive: true,
      emailVerified: new Date(),
    },
  });

  // Create User Profiles
  await prisma.userProfile.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      phone: '+254-700-000001',
      department: 'IT',
      position: 'System Administrator',
      employeeId: 'ADMIN001',
    },
  });

  await prisma.userProfile.upsert({
    where: { userId: manager.id },
    update: {},
    create: {
      userId: manager.id,
      phone: '+254-700-000002',
      department: 'Operations',
      position: 'Mill Manager',
      employeeId: 'MGR001',
    },
  });

  // Create sample equipment
  const equipment1 = await prisma.equipment.create({
    data: {
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
  });

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
  });

  // Create training module
  await prisma.trainingModule.create({
    data: {
      courseId: course.id,
      title: 'Module 1: Understanding Fortification',
      content: 'This module covers the basics of food fortification...',
      order: 1,
    },
  });

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
  });

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
  });

  console.log('✅ Seed data created successfully!');
  console.log('\n📊 Created:');
  console.log(`  - 1 National Tenant`);
  console.log(`  - 1 Regional Tenant`);
  console.log(`  - 1 Institutional Tenant`);
  console.log(`  - 2 Mills`);
  console.log(`  - 8 Users with different roles`);
  console.log('\n🔐 Test User Credentials (all passwords: password123):');
  console.log('  System Admin: admin@fortifyms.com');
  console.log('  Program Manager: pm@fwga.org');
  console.log('  Inspector: inspector@fwga.org');
  console.log('  Mill Manager: manager@mill1.com');
  console.log('  Mill Technician: technician@mill1.com');
  console.log('  Mill Operator: operator@mill1.com');
  console.log('  Buyer: buyer@school.edu');
  console.log('  Driver: driver@logistics.com');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error during seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
