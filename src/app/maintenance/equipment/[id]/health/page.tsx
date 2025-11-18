'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AlertTriangle, TrendingUp, TrendingDown, Minus, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface HealthReport {
  equipmentId: string
  equipmentName: string
  equipmentType: string
  location?: string
  status: string
  health: {
    score: number
    status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL'
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    recommendations: string[]
  }
  metrics: {
    ageInYears: number
    avgCalibrationOffset: number
    activeAlerts: number
    overdueTasks: number
    totalMaintenanceCount: number
    reliabilityScore: number
    lastMaintenanceDate?: string
    daysSinceLastMaintenance?: number
    nextMaintenanceDue?: string
    daysUntilMaintenance?: number
  }
  activeSchedules: number
  lastCalibrationDate?: string
}

export default function EquipmentHealthPage() {
  const params = useParams()
  const equipmentId = params.id as string
  const [health, setHealth] = useState<HealthReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHealth()
  }, [equipmentId])

  const fetchHealth = async () => {
    setLoading(true)
    const res = await fetch(`/api/maintenance/equipment/health?equipmentId=${equipmentId}`)
    const data = await res.json()
    if (data.equipment && data.equipment.length > 0) {
      setHealth(data.equipment[0])
    }
    setLoading(false)
  }

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-blue-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW':
        return 'bg-green-100 text-green-800'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800'
      case 'CRITICAL':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'EXCELLENT':
      case 'GOOD':
        return <CheckCircle className="h-8 w-8 text-green-500" />
      case 'FAIR':
        return <Minus className="h-8 w-8 text-yellow-500" />
      case 'POOR':
        return <TrendingDown className="h-8 w-8 text-orange-500" />
      case 'CRITICAL':
        return <AlertTriangle className="h-8 w-8 text-red-500" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-gray-600">Loading equipment health...</div>
      </div>
    )
  }

  if (!health) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            Equipment not found or no health data available.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href="/maintenance/equipment" className="text-blue-600 hover:underline">
            ← Back to Equipment
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{health.equipmentName}</h1>
            <div className="text-gray-600 mt-1">
              {health.equipmentType}
              {health.location && ` • ${health.location}`}
            </div>
          </div>
          <Link
            href={`/maintenance/equipment/${equipmentId}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            View Details
          </Link>
        </div>

        {/* Health Score Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon(health.health.status)}
              <div>
                <div className="text-sm text-gray-600">Overall Health Score</div>
                <div className={`text-5xl font-bold ${getHealthColor(health.health.score)}`}>
                  {health.health.score}/100
                </div>
                <div className="text-lg font-semibold text-gray-700 mt-1">
                  {health.health.status}
                </div>
              </div>
            </div>
            <div>
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getRiskBadge(health.health.riskLevel)}`}>
                {health.health.riskLevel} RISK
              </span>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {health.health.recommendations.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Recommendations
            </h2>
            <ul className="space-y-2">
              {health.health.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-yellow-600">•</span>
                  <span className="text-gray-800">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Equipment Age</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {health.metrics.ageInYears} years
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Avg Calibration Offset</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {health.metrics.avgCalibrationOffset.toFixed(2)}%
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Reliability Score</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {health.metrics.reliabilityScore.toFixed(1)}%
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Total Maintenance</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {health.metrics.totalMaintenanceCount}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Active Alerts</div>
            <div className={`text-2xl font-bold mt-1 ${health.metrics.activeAlerts > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {health.metrics.activeAlerts}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Overdue Tasks</div>
            <div className={`text-2xl font-bold mt-1 ${health.metrics.overdueTasks > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {health.metrics.overdueTasks}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Last Maintenance</div>
            <div className="text-sm font-medium text-gray-900 mt-1">
              {health.metrics.lastMaintenanceDate
                ? `${health.metrics.daysSinceLastMaintenance} days ago`
                : 'Never'}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Next Maintenance</div>
            <div className="text-sm font-medium text-gray-900 mt-1">
              {health.metrics.nextMaintenanceDue
                ? health.metrics.daysUntilMaintenance! >= 0
                  ? `In ${health.metrics.daysUntilMaintenance} days`
                  : `${Math.abs(health.metrics.daysUntilMaintenance!)} days overdue`
                : 'Not scheduled'}
            </div>
          </div>
        </div>

        {/* Active Schedules */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Maintenance Overview</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Active Schedules</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{health.activeSchedules}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Last Calibration</div>
              <div className="text-sm font-medium text-gray-900 mt-1">
                {health.lastCalibrationDate
                  ? new Date(health.lastCalibrationDate).toLocaleDateString()
                  : 'Never'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Equipment Status</div>
              <div className="text-sm font-medium text-gray-900 mt-1">{health.status}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
