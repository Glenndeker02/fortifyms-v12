'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

interface DashboardData {
  todaysFocus: {
    batches: number
    pendingQCTests: number
    maintenanceTasks: number
    activeAlerts: number
  }
  currentShift: {
    shift: string
    production: {
      totalBatches: number
      totalOutput: number
      passedBatches: number
      failedBatches: number
    }
  }
  todaysBatches: any[]
  pendingQCTests: any[]
  maintenanceTasks: {
    today: any[]
    overdue: any[]
  }
  alerts: any[]
  equipmentStatus: {
    total: number
    operational: number
    maintenance: number
    calibrationDue: number
    outOfService: number
  }
  recentActivity: any[]
}

export default function OperatorDashboard() {
  const { data: session } = useSession()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user?.id) return

    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `/api/dashboard/mill-operator?userId=${session.user.id}&millId=${session.user.millId}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
    // Refresh every 60 seconds
    const interval = setInterval(fetchDashboardData, 60000)

    return () => clearInterval(interval)
  }, [session])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading dashboard: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Mill Operator Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Current Shift: <span className="font-semibold">{data.currentShift.shift}</span>
        </p>
      </div>

      {/* Today's Focus Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <FocusCard
          title="Batches Today"
          value={data.todaysFocus.batches}
          icon="📦"
          color="blue"
        />
        <FocusCard
          title="Pending QC Tests"
          value={data.todaysFocus.pendingQCTests}
          icon="🧪"
          color="yellow"
        />
        <FocusCard
          title="Maintenance Tasks"
          value={data.todaysFocus.maintenanceTasks}
          icon="🔧"
          color="purple"
        />
        <FocusCard
          title="Active Alerts"
          value={data.todaysFocus.activeAlerts}
          icon="⚠️"
          color={data.todaysFocus.activeAlerts > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Current Shift Production */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Current Shift Production
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricBox
            label="Total Batches"
            value={data.currentShift.production.totalBatches}
          />
          <MetricBox
            label="Total Output"
            value={`${Math.round(data.currentShift.production.totalOutput)} kg`}
          />
          <MetricBox
            label="Passed"
            value={data.currentShift.production.passedBatches}
            valueColor="text-green-600"
          />
          <MetricBox
            label="Failed"
            value={data.currentShift.production.failedBatches}
            valueColor="text-red-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Today's Batches */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Batches</h2>
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
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.todaysBatches.slice(0, 5).map((batch: any) => (
                  <tr key={batch.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{batch.batchId}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{batch.productType}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={batch.qcStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.todaysBatches.length === 0 && (
              <p className="text-center py-8 text-gray-500">No batches recorded today</p>
            )}
          </div>
        </div>

        {/* Equipment Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Equipment Status</h2>
          <div className="space-y-3">
            <EquipmentStatusBar
              label="Operational"
              count={data.equipmentStatus.operational}
              total={data.equipmentStatus.total}
              color="green"
            />
            <EquipmentStatusBar
              label="Under Maintenance"
              count={data.equipmentStatus.maintenance}
              total={data.equipmentStatus.total}
              color="yellow"
            />
            <EquipmentStatusBar
              label="Calibration Due"
              count={data.equipmentStatus.calibrationDue}
              total={data.equipmentStatus.total}
              color="orange"
            />
            <EquipmentStatusBar
              label="Out of Service"
              count={data.equipmentStatus.outOfService}
              total={data.equipmentStatus.total}
              color="red"
            />
          </div>
        </div>
      </div>

      {/* Pending Tasks and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Tasks */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Maintenance Tasks</h2>
          {data.maintenanceTasks.overdue.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-red-600 mb-2">Overdue</h3>
              <div className="space-y-2">
                {data.maintenanceTasks.overdue.map((task: any) => (
                  <TaskCard key={task.id} task={task} isOverdue />
                ))}
              </div>
            </div>
          )}
          <h3 className="text-sm font-medium text-gray-700 mb-2">Today's Tasks</h3>
          <div className="space-y-2">
            {data.maintenanceTasks.today.slice(0, 5).map((task: any) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
          {data.maintenanceTasks.today.length === 0 && (
            <p className="text-center py-4 text-gray-500">No tasks scheduled for today</p>
          )}
        </div>

        {/* Active Alerts */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Alerts</h2>
          <div className="space-y-3">
            {data.alerts.map((alert: any) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
          {data.alerts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-green-600 font-medium">✓ No active alerts</p>
              <p className="text-gray-500 text-sm mt-1">All systems running smoothly</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FocusCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: number
  icon: string
  color: string
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    purple: 'bg-purple-50 border-purple-200',
    red: 'bg-red-50 border-red-200',
    green: 'bg-green-50 border-green-200',
  }

  return (
    <div className={`${colorClasses[color as keyof typeof colorClasses]} border rounded-lg p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <span className="text-4xl">{icon}</span>
      </div>
    </div>
  )
}

function MetricBox({
  label,
  value,
  valueColor = 'text-gray-900',
}: {
  label: string
  value: string | number
  valueColor?: string
}) {
  return (
    <div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`text-2xl font-bold ${valueColor} mt-1`}>{value}</p>
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

function EquipmentStatusBar({
  label,
  count,
  total,
  color,
}: {
  label: string
  count: number
  total: number
  color: string
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0

  const colorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  }

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700">{label}</span>
        <span className="text-gray-900 font-medium">
          {count} / {total}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${colorClasses[color as keyof typeof colorClasses]} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  )
}

function TaskCard({ task, isOverdue = false }: { task: any; isOverdue?: boolean }) {
  return (
    <div
      className={`p-3 rounded-lg border ${
        isOverdue ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
      }`}
    >
      <p className="font-medium text-sm text-gray-900">{task.equipment.name}</p>
      <p className="text-xs text-gray-600 mt-1">{task.equipment.equipmentType}</p>
      <p className="text-xs text-gray-500 mt-1">
        {new Date(task.scheduledDate).toLocaleDateString()}
      </p>
    </div>
  )
}

function AlertCard({ alert }: { alert: any }) {
  const severityColors = {
    CRITICAL: 'bg-red-50 border-red-300',
    HIGH: 'bg-orange-50 border-orange-300',
    MEDIUM: 'bg-yellow-50 border-yellow-300',
    LOW: 'bg-blue-50 border-blue-300',
  }

  return (
    <div
      className={`p-4 rounded-lg border ${
        severityColors[alert.severity as keyof typeof severityColors]
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium text-sm text-gray-900">{alert.title}</p>
          <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
          <p className="text-xs text-gray-500 mt-2">
            {new Date(alert.createdAt).toLocaleString()}
          </p>
        </div>
        <span className="text-xs font-semibold px-2 py-1 rounded bg-white">
          {alert.severity}
        </span>
      </div>
    </div>
  )
}
