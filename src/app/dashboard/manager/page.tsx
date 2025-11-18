'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface ManagerDashboardData {
  kpis: {
    production: {
      totalBatches: number
      totalOutput: number
      avgYield: number
      qcPassRate: number
      varianceIssues: number
    }
    quality: {
      totalTests: number
      testPassRate: number
      criticalFailures: number
      correctiveActions: number
      pendingActions: number
      actionCompletionRate: number
    }
    equipment: {
      totalEquipment: number
      operational: number
      utilizationRate: number
      maintenanceTasks: number
      maintenanceCompletionRate: number
      overdueMaintenance: number
    }
    procurement: {
      totalOrders: number
      totalValue: number
      onTimeDeliveryRate: number
    }
    alerts: {
      total: number
      critical: number
      resolutionRate: number
    }
  }
  trends: {
    dailyProduction: any[]
    productDistribution: any[]
  }
  performance: {
    operators: any[]
    topFailureReasons: any[]
  }
  recentBatches: any[]
}

export default function ManagerDashboard() {
  const { data: session } = useSession()
  const [data, setData] = useState<ManagerDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    if (!session?.user?.millId) return

    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `/api/dashboard/mill-manager?millId=${session.user.millId}&period=${period}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [session, period])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <p className="text-red-600">Error loading dashboard data</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header with Period Selector */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Mill Manager Dashboard</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
          <option value="365">Last Year</option>
        </select>
      </div>

      {/* Production KPIs */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Production Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <KPICard
            title="Total Batches"
            value={data.kpis.production.totalBatches}
            icon="📦"
            color="blue"
          />
          <KPICard
            title="Total Output"
            value={`${Math.round(data.kpis.production.totalOutput / 1000)} tons`}
            icon="⚖️"
            color="green"
          />
          <KPICard
            title="Avg Yield"
            value={`${data.kpis.production.avgYield}%`}
            icon="📈"
            color="purple"
          />
          <KPICard
            title="QC Pass Rate"
            value={`${data.kpis.production.qcPassRate}%`}
            icon="✓"
            color={data.kpis.production.qcPassRate >= 90 ? 'green' : 'yellow'}
          />
          <KPICard
            title="Variance Issues"
            value={data.kpis.production.varianceIssues}
            icon="⚠️"
            color={data.kpis.production.varianceIssues > 5 ? 'red' : 'green'}
          />
        </div>
      </div>

      {/* Quality & Compliance KPIs */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quality & Compliance</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <KPICard
            title="Total Tests"
            value={data.kpis.quality.totalTests}
            icon="🧪"
            color="blue"
          />
          <KPICard
            title="Test Pass Rate"
            value={`${data.kpis.quality.testPassRate}%`}
            icon="✓"
            color={data.kpis.quality.testPassRate >= 90 ? 'green' : 'yellow'}
          />
          <KPICard
            title="Critical Failures"
            value={data.kpis.quality.criticalFailures}
            icon="❌"
            color={data.kpis.quality.criticalFailures > 0 ? 'red' : 'green'}
          />
          <KPICard
            title="Corrective Actions"
            value={data.kpis.quality.correctiveActions}
            icon="🔧"
            color="orange"
          />
          <KPICard
            title="Pending Actions"
            value={data.kpis.quality.pendingActions}
            icon="⏱"
            color={data.kpis.quality.pendingActions > 5 ? 'red' : 'blue'}
          />
          <KPICard
            title="Action Completion"
            value={`${data.kpis.quality.actionCompletionRate}%`}
            icon="✔️"
            color="green"
          />
        </div>
      </div>

      {/* Equipment & Maintenance KPIs */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Equipment & Maintenance</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <KPICard
            title="Total Equipment"
            value={data.kpis.equipment.totalEquipment}
            icon="🏭"
            color="blue"
          />
          <KPICard
            title="Operational"
            value={data.kpis.equipment.operational}
            icon="✓"
            color="green"
          />
          <KPICard
            title="Utilization Rate"
            value={`${data.kpis.equipment.utilizationRate}%`}
            icon="⚡"
            color={data.kpis.equipment.utilizationRate >= 80 ? 'green' : 'yellow'}
          />
          <KPICard
            title="Maintenance Tasks"
            value={data.kpis.equipment.maintenanceTasks}
            icon="🔧"
            color="purple"
          />
          <KPICard
            title="Completion Rate"
            value={`${data.kpis.equipment.maintenanceCompletionRate}%`}
            icon="✔️"
            color={data.kpis.equipment.maintenanceCompletionRate >= 90 ? 'green' : 'yellow'}
          />
          <KPICard
            title="Overdue Tasks"
            value={data.kpis.equipment.overdueMaintenance}
            icon="⚠️"
            color={data.kpis.equipment.overdueMaintenance > 0 ? 'red' : 'green'}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Production Trend */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Production Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trends.dailyProduction}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="output"
                stroke="#059669"
                name="Output (kg)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="passed"
                stroke="#3b82f6"
                name="Passed Batches"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Product Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.trends.productDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="productType" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalOutput" fill="#059669" name="Output (kg)" />
              <Bar dataKey="count" fill="#3b82f6" name="Batches" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Team Performance and Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Operator Performance */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Operator Performance</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Operator
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Batches
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Output (kg)
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Avg Yield
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.performance.operators.slice(0, 5).map((op: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm text-gray-900">{op.operatorName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{op.batchCount}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {Math.round(op.totalOutput)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{op.avgYield}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Failure Reasons */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Failure Reasons</h2>
          <div className="space-y-3">
            {data.performance.topFailureReasons.map((reason: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-gray-900">{reason.reason}</span>
                <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                  {reason.count}
                </span>
              </div>
            ))}
            {data.performance.topFailureReasons.length === 0 && (
              <p className="text-center py-4 text-green-600 font-medium">
                ✓ No failure reasons recorded
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Batches */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Batches</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Batch ID
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Output
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  QC Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.recentBatches.map((batch: any) => (
                <tr key={batch.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {batch.batchId}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{batch.productType}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {Math.round(batch.outputWeight)} kg
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={batch.qcStatus} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(batch.batchDateTime).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KPICard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: string | number
  icon: string
  color: string
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    purple: 'bg-purple-50 border-purple-200',
    red: 'bg-red-50 border-red-200',
    orange: 'bg-orange-50 border-orange-200',
  }

  return (
    <div className={`${colorClasses[color as keyof typeof colorClasses]} border rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-600 font-medium">{title}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    PASS: { label: 'Pass', className: 'bg-green-100 text-green-800' },
    EXCELLENT: { label: 'Excellent', className: 'bg-green-100 text-green-800' },
    FAIL: { label: 'Fail', className: 'bg-red-100 text-red-800' },
    PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
    QUARANTINED: { label: 'Quarantined', className: 'bg-orange-100 text-orange-800' },
  }

  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
      {config.label}
    </span>
  )
}
