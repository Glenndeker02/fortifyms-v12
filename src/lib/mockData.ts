// Mock data generators for dashboards

export function generateMockProgramManagerDashboard() {
  return {
    overview: {
      totalFortifiedOutput: 2450000, // kg
      activeCertifiedMills: 47,
      averageComplianceRate: 87.5,
      institutionalDeliveries: 234,
      peopleReached: 145000,
      monthlyChange: {
        output: 8.5,
        mills: 4.4,
        compliance: 2.1,
        deliveries: 12.3,
      },
    },
    productionTrends: Array.from({ length: 12 }, (_, i) => ({
      name: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
      rice: Math.floor(Math.random() * 50000) + 80000,
      maize: Math.floor(Math.random() * 40000) + 60000,
      wheat: Math.floor(Math.random() * 30000) + 40000,
    })),
    complianceTrend: Array.from({ length: 6 }, (_, i) => ({
      name: `Month ${i + 1}`,
      compliance: 75 + Math.random() * 20,
      qcPassRate: 80 + Math.random() * 15,
    })),
    millPerformance: {
      topPerformers: [
        { id: 1, name: 'Kenya Premium Mills', compliance: 98, production: 125000, rating: 4.9 },
        { id: 2, name: 'Uganda Fortify Co.', compliance: 96, production: 110000, rating: 4.8 },
        { id: 3, name: 'Tanzania Quality Mills', compliance: 94, production: 98000, rating: 4.7 },
      ],
      atRiskMills: [
        { id: 4, name: 'Rural Mills Ltd', compliance: 65, issues: 12, trend: 'declining' },
        { id: 5, name: 'City Grain Processors', compliance: 68, issues: 9, trend: 'stable' },
      ],
    },
    commodityDistribution: [
      { name: 'Rice', value: 45, color: '#3b82f6' },
      { name: 'Maize', value: 35, color: '#10b981' },
      { name: 'Wheat', value: 20, color: '#f59e0b' },
    ],
    geographicData: {
      countries: [
        { country: 'Kenya', mills: 18, output: 980000, compliance: 89 },
        { country: 'Uganda', mills: 15, output: 750000, compliance: 85 },
        { country: 'Tanzania', mills: 14, output: 720000, compliance: 88 },
      ],
    },
    institutionalSupply: {
      procurementVolume: 567000,
      contractsAwarded: 89,
      onTimeDeliveryRate: 92.5,
      qualityIssueRate: 3.2,
      buyerSatisfaction: 4.6,
    },
  };
}

export function generateMockInstitutionalBuyerDashboard() {
  return {
    overview: {
      activeProcurements: 8,
      totalSpendMTD: 234500,
      totalSpendYTD: 2845000,
      costPerKg: 1.85,
      budgetUtilization: 67.3,
      onTimeDeliveryRate: 91.5,
      monthlyChange: {
        spend: 15.2,
        costPerKg: -3.5,
        deliveries: 8.7,
      },
    },
    myProcurements: [
      {
        id: 'RFP-2024-001',
        commodity: 'Fortified Rice',
        quantity: 5000,
        status: 'awarded',
        supplier: 'Kenya Premium Mills',
        deliveryDate: '2024-12-15',
        qualityScore: 98,
      },
      {
        id: 'RFP-2024-002',
        commodity: 'Fortified Maize',
        quantity: 8000,
        status: 'in-transit',
        supplier: 'Uganda Fortify Co.',
        deliveryDate: '2024-12-20',
        qualityScore: 96,
      },
      {
        id: 'RFP-2024-003',
        commodity: 'Fortified Wheat',
        quantity: 3000,
        status: 'bidding',
        bidsReceived: 7,
        dueDate: '2024-12-10',
      },
    ],
    spendingTrends: Array.from({ length: 12 }, (_, i) => ({
      name: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
      spend: Math.floor(Math.random() * 100000) + 200000,
      quantity: Math.floor(Math.random() * 50000) + 100000,
    })),
    supplierPerformance: [
      {
        id: 1,
        name: 'Kenya Premium Mills',
        ordersCompleted: 12,
        onTimeRate: 95,
        qualityScore: 98,
        rating: 4.9,
      },
      {
        id: 2,
        name: 'Uganda Fortify Co.',
        ordersCompleted: 10,
        onTimeRate: 92,
        qualityScore: 96,
        rating: 4.7,
      },
      {
        id: 3,
        name: 'Tanzania Quality Mills',
        ordersCompleted: 8,
        onTimeRate: 88,
        qualityScore: 94,
        rating: 4.5,
      },
    ],
    commodityBreakdown: [
      { name: 'Rice', value: 42, color: '#3b82f6' },
      { name: 'Maize', value: 38, color: '#10b981' },
      { name: 'Wheat', value: 20, color: '#f59e0b' },
    ],
    qualityMetrics: {
      averageQualityScore: 96.5,
      batchesReceived: 45,
      issuesReported: 2,
      issuesResolved: 2,
    },
    upcomingDeliveries: [
      {
        id: 1,
        orderId: 'RFP-2024-001',
        supplier: 'Kenya Premium Mills',
        commodity: 'Rice',
        quantity: 5000,
        expectedDate: '2024-12-15',
        status: 'on-track',
      },
      {
        id: 2,
        orderId: 'RFP-2024-002',
        supplier: 'Uganda Fortify Co.',
        commodity: 'Maize',
        quantity: 8000,
        expectedDate: '2024-12-20',
        status: 'on-track',
      },
    ],
  };
}

export function generateMockMillOperatorDashboard() {
  return {
    todaysFocus: {
      shift: 'Day Shift',
      batchesScheduled: 12,
      batchesCompleted: 8,
      calibrationsDue: 2,
      pendingActions: 3,
    },
    myPerformance: {
      batchesLogged: 156,
      qcPassRate: 94.5,
      trainingCompleted: 8,
      safetyIncidents: 0,
    },
    recentBatches: [
      { id: 'B-001', commodity: 'Rice', quantity: 500, qcStatus: 'passed', timestamp: '2024-11-18 08:30' },
      { id: 'B-002', commodity: 'Maize', quantity: 750, qcStatus: 'passed', timestamp: '2024-11-18 10:15' },
      { id: 'B-003', commodity: 'Rice', quantity: 600, qcStatus: 'pending', timestamp: '2024-11-18 12:00' },
    ],
  };
}

export function generateMockMillManagerDashboard() {
  return {
    overview: {
      productionVolume: 125000,
      qcPassRate: 95.5,
      complianceScore: 92,
      activeOrders: 15,
      revenue: 245000,
      monthlyChange: {
        production: 12.5,
        qcPassRate: 3.2,
        compliance: 5.1,
        revenue: 18.4,
      },
    },
    production: Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      produced: Math.floor(Math.random() * 2000) + 3000,
    })),
    qualityTrend: Array.from({ length: 12 }, (_, i) => ({
      week: `W${i + 1}`,
      passRate: 88 + Math.random() * 10,
    })),
  };
}

export function generateMockInspectorDashboard() {
  return {
    overview: {
      millsAssigned: 23,
      auditsCompleted: 12,
      auditsPending: 8,
      complianceIssues: 5,
    },
    recentAudits: [
      { id: 1, mill: 'Kenya Premium Mills', date: '2024-11-15', score: 98, status: 'approved' },
      { id: 2, mill: 'Uganda Fortify Co.', date: '2024-11-14', score: 96, status: 'approved' },
      { id: 3, mill: 'City Grain Processors', date: '2024-11-13', score: 68, status: 'revision-required' },
    ],
    complianceTrend: Array.from({ length: 6 }, (_, i) => ({
      month: `Month ${i + 1}`,
      average: 75 + Math.random() * 20,
    })),
  };
}
