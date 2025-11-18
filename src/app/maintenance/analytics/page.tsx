'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, CheckCircle, Clock, AlertCircle, Wrench, BarChart3 } from 'lucide-react'

interface Analytics {
  period: {
    start: string
    end: string
    days: number
  }
  summary: {
    totalTasks: number
    completedTasks: number
    pendingTasks: number
    inProgressTasks: number
    cancelledTasks: number
    overdueTasks: number
    completionRate: string
    onTimeRate: string
    avgCompletionTime: string
    complianceRate: string
    issueRate: string
    partsReplacementRate: string
    calibrationSuccessRate: string
  }
  taskDistribution: {
    byType: { [key: string]: number }
    byPriority: { [key: string]: number }
  }
  equipment: {
    total: number
    withOverdueMaintenace: number
    topMaintenance: Array<{
      equipmentId: string
      equipmentName: string
      equipmentType: string
      count: number
      completed: number
      issues: number
    }>
  }
  schedules: {
    active: number
  }
  alerts: {
    active: number
  }
  trends: {
    monthly: Array<{
      month: string
      total: number
      completed: number
      onTime: number
      withIssues: number
    }>
  }
}

export default function MaintenanceAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [period, setPeriod] = useState('30')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    setLoading(true)
    const res = await fetch(`/api/maintenance/analytics?period=${period}`)
    const data = await res.json()
    setAnalytics(data)
    setLoading(false)
  }

  if (loading || !analytics) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-gray-600">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Maintenance Analytics</h1>

          {/* Period Selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border rounded-md"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Total Tasks</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">
                  {analytics.summary.totalTasks}
                </div>
              </div>
              <Wrench className="h-10 w-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Completion Rate</div>
                <div className="text-3xl font-bold text-green-600 mt-1">
                  {analytics.summary.completionRate}%
                </div>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">On-Time Rate</div>
                <div className="text-3xl font-bold text-blue-600 mt-1">
                  {analytics.summary.onTimeRate}%
                </div>
              </div>
              <Clock className="h-10 w-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Compliance Rate</div>
                <div className="text-3xl font-bold text-purple-600 mt-1">
                  {analytics.summary.complianceRate}%
                </div>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Task Status Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Task Status</h2>
          <div className="grid grid-cols-5 gap-4">
            <div>
              <div className="text-sm text-gray-600">Completed</div>
              <div className="text-2xl font-bold text-green-600">
                {analytics.summary.completedTasks}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">In Progress</div>
              <div className="text-2xl font-bold text-blue-600">
                {analytics.summary.inProgressTasks}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">
                {analytics.summary.pendingTasks}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Overdue</div>
              <div className="text-2xl font-bold text-red-600">
                {analytics.summary.overdueTasks}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Cancelled</div>
              <div className="text-2xl font-bold text-gray-600">
                {analytics.summary.cancelledTasks}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-600">Avg Completion Time</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {analytics.summary.avgCompletionTime} days
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Issue Rate</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {analytics.summary.issueRate}%
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Parts Replacement</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {analytics.summary.partsReplacementRate}%
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Calibration Success</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {analytics.summary.calibrationSuccessRate}%
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Task Distribution by Type */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Tasks by Type</h2>
            <div className="space-y-3">
              {Object.entries(analytics.taskDistribution.byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-gray-700">{type}</span>
                  <span className="font-semibold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Task Distribution by Priority */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Tasks by Priority</h2>
            <div className="space-y-3">
              {Object.entries(analytics.taskDistribution.byPriority).map(([priority, count]) => (
                <div key={priority} className="flex items-center justify-between">
                  <span className={`font-medium ${
                    priority === 'CRITICAL' ? 'text-red-600' :
                    priority === 'HIGH' ? 'text-orange-600' :
                    priority === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600'
                  }`}>{priority}</span>
                  <span className="font-semibold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Equipment Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Equipment Overview</h2>
          <div className="grid grid-cols-3 gap-6 mb-4">
            <div>
              <div className="text-sm text-gray-600">Total Equipment</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {analytics.equipment.total}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">With Overdue Maintenance</div>
              <div className="text-2xl font-bold text-red-600 mt-1">
                {analytics.equipment.withOverdueMaintenace}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Active Schedules</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {analytics.schedules.active}
              </div>
            </div>
          </div>

          {/* Top Maintenance Equipment */}
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Top Equipment by Maintenance Count
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-sm text-gray-600">Equipment</th>
                  <th className="text-left py-2 text-sm text-gray-600">Type</th>
                  <th className="text-right py-2 text-sm text-gray-600">Total</th>
                  <th className="text-right py-2 text-sm text-gray-600">Completed</th>
                  <th className="text-right py-2 text-sm text-gray-600">Issues</th>
                </tr>
              </thead>
              <tbody>
                {analytics.equipment.topMaintenance.map((eq) => (
                  <tr key={eq.equipmentId} className="border-b">
                    <td className="py-2 text-sm text-gray-900">{eq.equipmentName}</td>
                    <td className="py-2 text-sm text-gray-600">{eq.equipmentType}</td>
                    <td className="py-2 text-sm text-gray-900 text-right">{eq.count}</td>
                    <td className="py-2 text-sm text-green-600 text-right">{eq.completed}</td>
                    <td className="py-2 text-sm text-red-600 text-right">{eq.issues}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Trends */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">6-Month Trend</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-sm text-gray-600">Month</th>
                  <th className="text-right py-2 text-sm text-gray-600">Total</th>
                  <th className="text-right py-2 text-sm text-gray-600">Completed</th>
                  <th className="text-right py-2 text-sm text-gray-600">On Time</th>
                  <th className="text-right py-2 text-sm text-gray-600">With Issues</th>
                </tr>
              </thead>
              <tbody>
                {analytics.trends.monthly.map((trend) => (
                  <tr key={trend.month} className="border-b">
                    <td className="py-2 text-sm text-gray-900">{trend.month}</td>
                    <td className="py-2 text-sm text-gray-900 text-right">{trend.total}</td>
                    <td className="py-2 text-sm text-green-600 text-right">
                      {trend.completed}
                    </td>
                    <td className="py-2 text-sm text-blue-600 text-right">{trend.onTime}</td>
                    <td className="py-2 text-sm text-red-600 text-right">
                      {trend.withIssues}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
