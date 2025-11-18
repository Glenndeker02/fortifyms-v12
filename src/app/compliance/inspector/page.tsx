'use client'

import { useState, useEffect } from 'react'
import { Eye, CheckCircle, XCircle, MessageSquare, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function InspectorDashboardPage() {
  const [queue, setQueue] = useState<any[]>([])
  const [filter, setFilter] = useState('pending')
  const [selectedAudit, setSelectedAudit] = useState<any>(null)
  const [reviewAction, setReviewAction] = useState('')
  const [comments, setComments] = useState('')

  useEffect(() => {
    fetchQueue()
  }, [filter])

  const fetchQueue = async () => {
    const res = await fetch(`/api/compliance/audits?status=${filter === 'pending' ? 'SUBMITTED' : ''}`)
    const data = await res.json()
    setQueue(data)
  }

  const handleReview = async () => {
    if (!selectedAudit || !reviewAction) return

    await fetch(`/api/compliance/audits/${selectedAudit.id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: reviewAction,
        comments,
        reviewerId: 'current-user-id', // Get from session
      }),
    })

    alert('Review submitted successfully')
    setSelectedAudit(null)
    fetchQueue()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Inspector Review Dashboard</h1>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4">
            {['pending', 'reviewed', 'all'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-md ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Review Queue ({queue.length})</h2>
            {queue.map((audit) => (
              <div
                key={audit.id}
                onClick={() => setSelectedAudit(audit)}
                className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-lg transition-shadow ${
                  selectedAudit?.id === audit.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{audit.mill?.name}</h3>
                    <p className="text-sm text-gray-600">{audit.template?.name}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      audit.score >= 75 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {audit.score?.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{new Date(audit.auditDate).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{audit.auditType}</span>
                </div>
                {JSON.parse(audit.flaggedIssues || '[]').length > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-orange-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{JSON.parse(audit.flaggedIssues).length} issues</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Review Panel */}
          {selectedAudit && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Review Audit</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Decision
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'APPROVE', label: 'Approve', icon: CheckCircle, color: 'green' },
                      {
                        value: 'APPROVE_WITH_CONDITIONS',
                        label: 'Approve with Conditions',
                        icon: CheckCircle,
                        color: 'blue',
                      },
                      {
                        value: 'REQUEST_REVISION',
                        label: 'Request Revision',
                        icon: MessageSquare,
                        color: 'yellow',
                      },
                      { value: 'REJECT', label: 'Reject', icon: XCircle, color: 'red' },
                    ].map(({ value, label, icon: Icon, color }) => (
                      <button
                        key={value}
                        onClick={() => setReviewAction(value)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-md border-2 transition-all ${
                          reviewAction === value
                            ? `bg-${color}-50 border-${color}-500`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`h-5 w-5 text-${color}-600`} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comments
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter review comments..."
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedAudit(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReview}
                  disabled={!reviewAction}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Submit Review
                </button>
              </div>

              <Link
                href={`/compliance/audits/${selectedAudit.id}`}
                className="block mt-4 text-center text-blue-600 hover:text-blue-800"
              >
                <Eye className="inline h-4 w-4 mr-1" />
                View Full Audit
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
