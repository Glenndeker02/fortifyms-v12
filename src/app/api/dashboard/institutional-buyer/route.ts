import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const buyerId = searchParams.get('buyerId')
    const period = searchParams.get('period') || '90' // days

    if (!buyerId) {
      return NextResponse.json({ error: 'buyerId is required' }, { status: 400 })
    }

    const periodDays = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    // Get all procurements for this buyer
    const procurements = await prisma.procurement.findMany({
      where: {
        buyerId,
        orderDate: { gte: startDate },
      },
      include: {
        mill: {
          select: {
            name: true,
            code: true,
            country: true,
            region: true,
            certificationStatus: true,
          },
        },
        supplier: {
          select: {
            name: true,
            supplierType: true,
          },
        },
      },
      orderBy: { orderDate: 'desc' },
    })

    // Procurement KPIs
    const totalOrders = procurements.length
    const totalValue = procurements.reduce((sum, p) => sum + (p.totalCost || 0), 0)
    const totalQuantity = procurements.reduce((sum, p) => sum + (p.quantity || 0), 0)

    const completedOrders = procurements.filter((p) => p.status === 'DELIVERED').length
    const pendingOrders = procurements.filter(
      (p) => p.status === 'ORDERED' || p.status === 'IN_TRANSIT'
    ).length
    const orderFulfillmentRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0

    // Delivery performance
    const deliveredOnTime = procurements.filter(
      (p) =>
        p.status === 'DELIVERED' &&
        p.deliveryDate &&
        p.expectedDeliveryDate &&
        p.deliveryDate <= p.expectedDeliveryDate
    ).length
    const onTimeDeliveryRate = completedOrders > 0 ? (deliveredOnTime / completedOrders) * 100 : 0

    const avgDeliveryTime = procurements
      .filter((p) => p.deliveryDate && p.orderDate)
      .reduce((sum, p) => {
        const days =
          (p.deliveryDate!.getTime() - p.orderDate.getTime()) / (1000 * 60 * 60 * 24)
        return sum + days
      }, 0) / (completedOrders || 1)

    // Quality metrics for procured items
    const premixProcurements = procurements.filter(
      (p) => p.itemType === 'PREMIX' || p.itemName?.toLowerCase().includes('premix')
    )

    const certifiedSuppliers = new Set(
      procurements
        .filter((p) => p.mill.certificationStatus === 'CERTIFIED')
        .map((p) => p.supplierId)
    ).size

    const totalSuppliers = new Set(procurements.map((p) => p.supplierId)).size

    // Cost analysis
    const avgOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0
    const avgUnitCost = totalQuantity > 0 ? totalValue / totalQuantity : 0

    // Supplier performance
    const supplierPerformance = await Promise.all(
      Array.from(new Set(procurements.map((p) => p.supplierId))).map(async (supplierId) => {
        const supplierOrders = procurements.filter((p) => p.supplierId === supplierId)
        const supplier = supplierOrders[0].supplier

        const delivered = supplierOrders.filter((p) => p.status === 'DELIVERED').length
        const onTime = supplierOrders.filter(
          (p) =>
            p.status === 'DELIVERED' &&
            p.deliveryDate &&
            p.expectedDeliveryDate &&
            p.deliveryDate <= p.expectedDeliveryDate
        ).length

        const totalCost = supplierOrders.reduce((sum, p) => sum + (p.totalCost || 0), 0)
        const totalQty = supplierOrders.reduce((sum, p) => sum + (p.quantity || 0), 0)

        const qualityIssues = supplierOrders.filter((p) => p.status === 'REJECTED').length

        const performanceScore =
          (delivered / supplierOrders.length) * 40 +
          (onTime / (delivered || 1)) * 40 +
          ((supplierOrders.length - qualityIssues) / supplierOrders.length) * 20

        return {
          supplierId,
          supplierName: supplier?.name || 'Unknown',
          supplierType: supplier?.supplierType,
          totalOrders: supplierOrders.length,
          deliveredOrders: delivered,
          onTimeDelivery: onTime,
          onTimeRate: delivered > 0 ? (onTime / delivered) * 100 : 0,
          totalSpend: totalCost,
          totalQuantity: totalQty,
          avgUnitPrice: totalQty > 0 ? totalCost / totalQty : 0,
          qualityIssues,
          performanceScore: Math.round(performanceScore * 100) / 100,
        }
      })
    )

    // Inventory insights (related batches using procured items)
    const relatedBatches = await prisma.batchLog.findMany({
      where: {
        millId: {
          in: procurements.map((p) => p.millId),
        },
        batchDateTime: { gte: startDate },
      },
      include: {
        qcTests: true,
      },
    })

    const batchQuality = {
      totalBatches: relatedBatches.length,
      passedBatches: relatedBatches.filter(
        (b) => b.qcStatus === 'PASS' || b.qcStatus === 'EXCELLENT'
      ).length,
      qcPassRate:
        relatedBatches.length > 0
          ? (relatedBatches.filter((b) => b.qcStatus === 'PASS' || b.qcStatus === 'EXCELLENT')
              .length /
              relatedBatches.length) *
            100
          : 0,
    }

    // Spending trends (monthly)
    const monthlySpending = procurements.reduce((acc, p) => {
      const month = p.orderDate.toISOString().substring(0, 7) // YYYY-MM
      if (!acc[month]) {
        acc[month] = { month, orders: 0, value: 0, quantity: 0 }
      }
      acc[month].orders++
      acc[month].value += p.totalCost || 0
      acc[month].quantity += p.quantity || 0
      return acc
    }, {} as Record<string, any>)

    // Item type distribution
    const itemDistribution = procurements.reduce((acc, p) => {
      const itemType = p.itemType || 'OTHER'
      if (!acc[itemType]) {
        acc[itemType] = { itemType, orders: 0, quantity: 0, value: 0 }
      }
      acc[itemType].orders++
      acc[itemType].quantity += p.quantity || 0
      acc[itemType].value += p.totalCost || 0
      return acc
    }, {} as Record<string, any>)

    // Upcoming deliveries
    const upcomingDeliveries = procurements.filter(
      (p) =>
        (p.status === 'ORDERED' || p.status === 'IN_TRANSIT') &&
        p.expectedDeliveryDate &&
        p.expectedDeliveryDate >= new Date()
    ).slice(0, 10)

    // Overdue deliveries
    const overdueDeliveries = procurements.filter(
      (p) =>
        p.status !== 'DELIVERED' &&
        p.status !== 'CANCELLED' &&
        p.expectedDeliveryDate &&
        p.expectedDeliveryDate < new Date()
    )

    // Top spending categories
    const topCategories = Object.values(itemDistribution)
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 5)

    return NextResponse.json({
      procurementSummary: {
        totalOrders,
        totalValue: Math.round(totalValue * 100) / 100,
        totalQuantity: Math.round(totalQuantity * 100) / 100,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        avgUnitCost: Math.round(avgUnitCost * 100) / 100,
        completedOrders,
        pendingOrders,
        orderFulfillmentRate: Math.round(orderFulfillmentRate * 100) / 100,
      },
      deliveryPerformance: {
        onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 100) / 100,
        avgDeliveryTime: Math.round(avgDeliveryTime * 10) / 10,
        upcomingDeliveries: upcomingDeliveries.length,
        overdueDeliveries: overdueDeliveries.length,
      },
      quality: {
        certifiedSuppliers,
        totalSuppliers,
        certificationRate:
          totalSuppliers > 0 ? Math.round((certifiedSuppliers / totalSuppliers) * 100 * 100) / 100 : 0,
        premixOrders: premixProcurements.length,
        batchQuality,
      },
      suppliers: {
        performance: supplierPerformance.sort((a, b) => b.performanceScore - a.performanceScore),
        topSuppliers: supplierPerformance
          .sort((a, b) => b.totalSpend - a.totalSpend)
          .slice(0, 5),
      },
      trends: {
        monthlySpending: Object.values(monthlySpending).sort((a: any, b: any) =>
          a.month.localeCompare(b.month)
        ),
        itemDistribution: Object.values(itemDistribution),
        topCategories,
      },
      recentOrders: procurements.slice(0, 10).map((p) => ({
        id: p.id,
        orderId: p.orderId,
        itemName: p.itemName,
        quantity: p.quantity,
        totalCost: p.totalCost,
        status: p.status,
        orderDate: p.orderDate,
        expectedDeliveryDate: p.expectedDeliveryDate,
        supplier: p.supplier?.name,
        mill: p.mill.name,
      })),
      upcomingDeliveries: upcomingDeliveries.map((p) => ({
        id: p.id,
        orderId: p.orderId,
        itemName: p.itemName,
        quantity: p.quantity,
        expectedDeliveryDate: p.expectedDeliveryDate,
        supplier: p.supplier?.name,
      })),
      overdueDeliveries: overdueDeliveries.map((p) => ({
        id: p.id,
        orderId: p.orderId,
        itemName: p.itemName,
        quantity: p.quantity,
        expectedDeliveryDate: p.expectedDeliveryDate,
        daysOverdue: Math.floor(
          (Date.now() - p.expectedDeliveryDate!.getTime()) / (1000 * 60 * 60 * 24)
        ),
        supplier: p.supplier?.name,
      })),
    })
  } catch (error) {
    console.error('Error fetching institutional buyer dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
