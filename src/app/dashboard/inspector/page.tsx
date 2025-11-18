'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

interface InspectorDashboardData {
  summary: {
    assignedMills: number
    pendingReviews: number
    pendingInspections: number
    upcomingInspections: number
    criticalAlerts: number
    pendingCorrectiveActions: number
    highRiskMills: number
  }
  assignedMills: any[]
  pendingReviews: {
    complianceChecklists: any[]
    failedBatches: any[]
    correctiveActions: any[]
  }
  inspections: {
    pending: any[]
    upcoming: any[]
  }
  alerts: any[]
  geographicData: any[]
  recentActivity: any[]
}

export default function InspectorDashboard() {
  const { data: session } = useSession()
  const [data, setData] = useState<InspectorDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')
  const [selectedTab, setSelectedTab] = useState<'overview' | 'mills' | 'reviews' | 'inspections'>(
    'overview'
  )

  useEffect(() => {
    if (!session?.user?.id) return

    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `/api/dashboard/fwga-inspector?userId=${session.user.id}&period=${period}`
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
            {[...Array(4)].map((_, i) => (
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
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">FWGA Inspector Dashboard</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <SummaryCard
          title="Assigned Mills"
          value={data.summary.assignedMills}
          icon="🏭"
          color="blue"
        />
        <SummaryCard
          title="Pending Reviews"
          value={data.summary.pendingReviews}
          icon="📋"
          color="yellow"
        />
        <SummaryCard
          title="Pending Inspections"
          value={data.summary.pendingInspections}
          icon="🔍"
          color="purple"
        />
        <SummaryCard
          title="Upcoming Inspections"
          value={data.summary.upcomingInspections}
          icon="📅"
          color="blue"
        />
        <SummaryCard
          title="Critical Alerts"
          value={data.summary.criticalAlerts}
          icon="⚠️"
          color={data.summary.criticalAlerts > 0 ? 'red' : 'green'}
        />
        <SummaryCard
          title="Pending Actions"
          value={data.summary.pendingCorrectiveActions}
          icon="🔧"
          color="orange"
        />
        <SummaryCard
          title="High Risk Mills"
          value={data.summary.highRiskMills}
          icon="⚡"
          color={data.summary.highRiskMills > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 px-6" aria-label="Tabs">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`py-4 px-3 border-b-2 font-medium text-sm ${
                selectedTab === 'overview'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedTab('mills')}
              className={`py-4 px-3 border-b-2 font-medium text-sm ${
                selectedTab === 'mills'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Assigned Mills
            </button>
            <button
              onClick={() => setSelectedTab('reviews')}
              className={`py-4 px-3 border-b-2 font-medium text-sm ${
                selectedTab === 'reviews'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Reviews
            </button>
            <button
              onClick={() => setSelectedTab('inspections')}
              className={`py-4 px-3 border-b-2 font-medium text-sm ${
                selectedTab === 'inspections'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Inspections
            </button>
          </nav>
        </div>

        <div className="p-6">
          {selectedTab === 'overview' && <OverviewTab data={data} />}
          {selectedTab === 'mills' && <MillsTab mills={data.assignedMills} />}
          {selectedTab === 'reviews' && <ReviewsTab reviews={data.pendingReviews} />}
          {selectedTab === 'inspections' && <InspectionsTab inspections={data.inspections} />}
        </div>
      </div>

      {/* Critical Alerts */}
      {data.alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Critical Alerts</h2>
          <div className="space-y-3">
            {data.alerts.map((alert: any) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function OverviewTab({ data }: { data: InspectorDashboardData }) {
  return (
    <div className="space-y-6">
      {/* Geographic Heat Map */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Mills Geographic Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.geographicData.map((mill: any, idx: number) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border-2 ${getRiskBorderColor(mill.riskLevel)}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{mill.millName}</p>
                  <p className="text-sm text-gray-600">{mill.country} - {mill.region}</p>
                </div>
                <RiskBadge level={mill.riskLevel} />
              </div>
              {mill.criticalAlerts > 0 && (
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ {mill.criticalAlerts} critical alert{mill.criticalAlerts > 1 ? 's' : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-2">
          {data.recentActivity.slice(0, 10).map((activity: any) => (
            <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">{activity.batch.batchId}</p>
                <p className="text-xs text-gray-600">{activity.batch.mill.name}</p>
              </div>
              <p className="text-xs text-gray-500">
                {new Date(activity.eventTime).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MillsTab({ mills }: { mills: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mill</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Certification</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batches</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">QC Pass Rate</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Critical Issues</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {mills.map((mill: any) => (
            <tr key={mill.millId}>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{mill.millName}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{mill.country} - {mill.region}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  mill.certificationStatus === 'CERTIFIED'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {mill.certificationStatus}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{mill.batches}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{mill.qcPassRate}%</td>
              <td className="px-4 py-3 text-sm text-gray-600">{mill.criticalIssues}</td>
              <td className="px-4 py-3">
                <RiskBadge level={mill.riskLevel} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReviewsTab({ reviews }: { reviews: any }) {
  return (
    <div className="space-y-6">
      {/* Failed Batches */}
      {reviews.failedBatches.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Failed Batches Requiring Review</h3>
          <div className="space-y-2">
            {reviews.failedBatches.map((batch: any) => (
              <div key={batch.id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{batch.batchId}</p>
                    <p className="text-sm text-gray-600">{batch.mill.name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {batch.qcTests.length} failed test{batch.qcTests.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                    Requires Review
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Corrective Actions */}
      {reviews.correctiveActions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Pending Corrective Actions</h3>
          <div className="space-y-2">
            {reviews.correctiveActions.map((action: any) => (
              <div key={action.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{action.batch.batchId}</p>
                    <p className="text-sm text-gray-600">{action.batch.mill.name}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    action.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {action.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function InspectionsTab({ inspections }: { inspections: any }) {
  return (
    <div className="space-y-6">
      {/* Pending Inspections */}
      {inspections.pending.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Pending Inspections</h3>
          <div className="space-y-2">
            {inspections.pending.map((inspection: any) => (
              <div key={inspection.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{inspection.mill.name}</p>
                    <p className="text-sm text-gray-600">Scheduled: {new Date(inspection.scheduledDate).toLocaleDateString()}</p>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                    {inspection.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Inspections */}
      {inspections.upcoming.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Upcoming Inspections (Next 30 Days)</h3>
          <div className="space-y-2">
            {inspections.upcoming.map((inspection: any) => (
              <div key={inspection.id} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{inspection.mill.name}</p>
                    <p className="text-sm text-gray-600">Scheduled: {new Date(inspection.scheduledDate).toLocaleDateString()}</p>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    Upcoming
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
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
    orange: 'bg-orange-50 border-orange-200',
  }

  return (
    <div className={`${colorClasses[color as keyof typeof colorClasses]} border rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-600 font-medium">{title}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function RiskBadge({ level }: { level: string }) {
  const config: Record<string, { className: string }> = {
    LOW: { className: 'bg-green-100 text-green-800' },
    MEDIUM: { className: 'bg-yellow-100 text-yellow-800' },
    HIGH: { className: 'bg-orange-100 text-orange-800' },
    CRITICAL: { className: 'bg-red-100 text-red-800' },
  }

  const badge = config[level] || config.MEDIUM

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.className}`}>
      {level}
    </span>
  )
}

function getRiskBorderColor(level: string): string {
  const colors: Record<string, string> = {
    LOW: 'border-green-300 bg-green-50',
    MEDIUM: 'border-yellow-300 bg-yellow-50',
    HIGH: 'border-orange-300 bg-orange-50',
    CRITICAL: 'border-red-300 bg-red-50',
  }
  return colors[level] || colors.MEDIUM
}

function AlertCard({ alert }: { alert: any }) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium text-sm text-gray-900">{alert.title}</p>
          <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
          <p className="text-xs text-gray-600 mt-1">{alert.mill.name}</p>
          <p className="text-xs text-gray-500 mt-2">
            {new Date(alert.createdAt).toLocaleString()}
          </p>
        </div>
        <span className="text-xs font-semibold px-2 py-1 rounded bg-red-100 text-red-800">
          {alert.severity}
        </span>
      </div>
    </div>
  )
}
