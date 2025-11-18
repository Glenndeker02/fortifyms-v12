'use client'

import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { AlertTriangle, TrendingUp, CheckCircle, Clock } from 'lucide-react'

interface AnalyticsData {
  summary: {
    totalDiagnostics: number
    completedDiagnostics: number
    avgResponseTimeMinutes: number
    totalIssuesIdentified: number
  }
  categoryStats: Record<
    string,
    {
      count: number
      issuesIdentified: number
      avgIssuesPerDiagnostic: number
    }
  >
  topIssues: Array<{
    issue: string
    count: number
    percentage: number
  }>
  millStats: Array<{
    millName: string
    country: string
    diagnosticsCount: number
    issuesCount: number
  }>
  trendData: Array<{
    date: string
    count: number
    issues: number
  }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export default function DiagnosticAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (dateRange.startDate) params.append('startDate', dateRange.startDate)
      if (dateRange.endDate) params.append('endDate', dateRange.endDate)

      const response = await fetch(`/api/diagnostics/analytics?${params}`)
      const analyticsData = await response.json()
      setData(analyticsData)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    )
  }

  const categoryData = Object.entries(data.categoryStats).map(([name, stats]) => ({
    name,
    count: stats.count,
    issues: stats.issuesIdentified,
    avgIssues: Math.round(stats.avgIssuesPerDiagnostic * 10) / 10,
  }))

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          FWGA Diagnostic Analytics Dashboard
        </h1>
        <p className="text-gray-600">
          Comprehensive insights into fortification diagnostics across all mills
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
              }
              className="border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <button
            onClick={() => setDateRange({ startDate: '', endDate: '' })}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Diagnostics</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {data.summary.totalDiagnostics}
              </p>
            </div>
            <CheckCircle className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {data.summary.completedDiagnostics}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {Math.round(
                  (data.summary.completedDiagnostics / data.summary.totalDiagnostics) * 100
                )}
                % completion rate
              </p>
            </div>
            <TrendingUp className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Issues</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {data.summary.totalIssuesIdentified}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {(data.summary.totalIssuesIdentified / data.summary.totalDiagnostics).toFixed(
                  1
                )}{' '}
                per diagnostic
              </p>
            </div>
            <AlertTriangle className="h-12 w-12 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {data.summary.avgResponseTimeMinutes}m
              </p>
              <p className="text-xs text-gray-500 mt-1">Time to complete</p>
            </div>
            <Clock className="h-12 w-12 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Category Statistics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Diagnostics by Category
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="Total Diagnostics" />
              <Bar dataKey="issues" fill="#f59e0b" name="Issues Found" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Issues */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top 10 Issues</h2>
          <div className="space-y-3">
            {data.topIssues.map((issue, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <span className="text-sm font-medium text-gray-700 mr-2">
                    {index + 1}.
                  </span>
                  <span className="text-sm text-gray-900 flex-1 truncate">
                    {issue.issue}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {issue.count}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({issue.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">30-Day Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              name="Diagnostics"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="issues"
              stroke="#f59e0b"
              name="Issues"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Mill Performance Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Mill Performance</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mill Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Country
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diagnostics Run
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issues Found
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issues per Diagnostic
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.millStats.map((mill, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {mill.millName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {mill.country}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {mill.diagnosticsCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {mill.issuesCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(mill.issuesCount / mill.diagnosticsCount).toFixed(2)}
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
