'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface Batch {
  id: string
  batchId: string
  batchDateTime: string
  cropType: string
  productType: string
  inputWeight: number
  status: string
  qcStatus?: string
  variance?: number
  mill: {
    name: string
    code: string
  }
  operator: {
    name: string
  }
  qcTests: Array<{
    testType: string
    status: string
  }>
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [cropTypeFilter, setCropTypeFilter] = useState('')

  useEffect(() => {
    fetchBatches()
  }, [statusFilter, cropTypeFilter])

  const fetchBatches = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.append('status', statusFilter)
    if (cropTypeFilter) params.append('cropType', cropTypeFilter)

    const res = await fetch(`/api/batches?${params.toString()}`)
    const data = await res.json()
    setBatches(data.batches || [])
    setLoading(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASSED':
        return (
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            PASSED
          </span>
        )
      case 'QUARANTINED':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold flex items-center gap-1">
            <XCircle className="h-4 w-4" />
            QUARANTINED
          </span>
        )
      case 'QC_PENDING':
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold flex items-center gap-1">
            <Clock className="h-4 w-4" />
            QC PENDING
          </span>
        )
      case 'IN_PROGRESS':
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold flex items-center gap-1">
            <Clock className="h-4 w-4" />
            IN PROGRESS
          </span>
        )
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">{status}</span>
    }
  }

  const getQCStatusBadge = (qcStatus?: string) => {
    if (!qcStatus) return null

    switch (qcStatus) {
      case 'PASS':
      case 'EXCELLENT':
        return <span className="text-green-600 font-semibold">✓ PASS</span>
      case 'FAIL':
        return <span className="text-red-600 font-semibold">✗ FAIL</span>
      case 'MARGINAL':
      case 'CONDITIONAL_PASS':
      case 'PASS_WITH_NOTES':
        return <span className="text-yellow-600 font-semibold">⚠ {qcStatus}</span>
      default:
        return <span className="text-gray-600">-</span>
    }
  }

  const getVarianceBadge = (variance?: number) => {
    if (variance === undefined || variance === null) return null

    const absVariance = Math.abs(variance)
    if (absVariance > 10) {
      return <span className="text-red-600 font-semibold">{variance.toFixed(1)}%</span>
    } else if (absVariance > 5) {
      return <span className="text-yellow-600 font-semibold">{variance.toFixed(1)}%</span>
    } else {
      return <span className="text-green-600">{variance.toFixed(1)}%</span>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Production Batches</h1>
            <p className="text-gray-600 mt-1">Track and manage all production batches with full traceability</p>
          </div>
          <Link
            href="/production/batches/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            New Batch
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-400" />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">All Statuses</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="QC_PENDING">QC Pending</option>
            <option value="PASSED">Passed</option>
            <option value="QUARANTINED">Quarantined</option>
          </select>

          <select
            value={cropTypeFilter}
            onChange={(e) => setCropTypeFilter(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">All Crop Types</option>
            <option value="Parboiled rice">Parboiled rice</option>
            <option value="Raw rice">Raw rice</option>
            <option value="Whole grain maize">Whole grain maize</option>
            <option value="Refined maize flour">Refined maize flour</option>
            <option value="Wheat flour">Wheat flour</option>
          </select>

          <button
            onClick={() => {
              setStatusFilter('')
              setCropTypeFilter('')
            }}
            className="px-3 py-2 text-gray-600 hover:text-gray-800"
          >
            Clear
          </button>
        </div>

        {/* Batch Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Batch ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date/Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Crop Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Input (kg)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Variance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  QC Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    Loading batches...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No batches found
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/production/batches/${batch.id}`}
                        className="text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        {batch.batchId}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(batch.batchDateTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {batch.cropType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {batch.productType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {batch.inputWeight.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getVarianceBadge(batch.variance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getQCStatusBadge(batch.qcStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(batch.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
