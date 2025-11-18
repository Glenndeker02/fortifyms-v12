'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Camera, Upload, AlertTriangle, CheckCircle, Save } from 'lucide-react'
import { use } from 'react'

export default function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [audit, setAudit] = useState<any>(null)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({})
  const [score, setScore] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAudit()
  }, [])

  const fetchAudit = async () => {
    try {
      const res = await fetch(`/api/compliance/audits/${resolvedParams.id}`)
      const data = await res.json()
      setAudit(data)
      setResponses(JSON.parse(data.responses || '{}'))
      setLoading(false)
    } catch (error) {
      console.error(error)
    }
  }

  const handleResponse = async (itemId: string, value: any) => {
    const updated = { ...responses, [itemId]: { itemId, value, timestamp: new Date() } }
    setResponses(updated)

    // Save to backend
    await fetch(`/api/compliance/audits/${resolvedParams.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses: updated }),
    })

    // Recalculate score
    calculateScore()
  }

  const calculateScore = async () => {
    const res = await fetch(`/api/compliance/audits/${resolvedParams.id}/calculate-score`, {
      method: 'POST',
    })
    const data = await res.json()
    setScore(data.scoringResult)
  }

  const uploadEvidence = async (itemId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('auditId', resolvedParams.id)
    formData.append('itemId', itemId)
    formData.append('type', 'photo')

    await fetch('/api/compliance/evidence/upload', {
      method: 'POST',
      body: formData,
    })
  }

  const submitAudit = async () => {
    await fetch(`/api/compliance/audits/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auditId: resolvedParams.id }),
    })
    alert('Audit submitted successfully')
  }

  if (loading) return <div className="p-6">Loading...</div>

  const sections = JSON.parse(audit?.template?.sections || '[]')
  const completedItems = Object.keys(responses).length
  const totalItems = sections.reduce((acc: number, s: any) => acc + s.items.length, 0)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Compliance Audit</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{audit?.mill?.name}</span>
            <span>•</span>
            <span>{audit?.template?.name}</span>
            <span>•</span>
            <span>
              Progress: {completedItems}/{totalItems} ({((completedItems / totalItems) * 100).toFixed(0)}%)
            </span>
          </div>

          {score && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-blue-600">
                    {score.overallPercentage.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Current Score - {score.category}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Critical Failures</div>
                  <div className="text-2xl font-bold text-red-600">{score.criticalFailures}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sections */}
        {sections.map((section: any, sectionIndex: number) => {
          const sectionResponses = section.items.filter((item: any) => responses[item.id])
          const sectionProgress = (sectionResponses.length / section.items.length) * 100

          return (
            <div key={section.id} className="bg-white rounded-lg shadow mb-4">
              <button
                onClick={() =>
                  setExpandedSections({
                    ...expandedSections,
                    [sectionIndex]: !expandedSections[sectionIndex],
                  })
                }
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <span className="font-semibold">{section.name}</span>
                  <span className="text-sm text-gray-600">
                    {sectionResponses.length}/{section.items.length}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all"
                      style={{ width: `${sectionProgress}%` }}
                    />
                  </div>
                  {expandedSections[sectionIndex] ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              </button>

              {expandedSections[sectionIndex] && (
                <div className="p-4 border-t space-y-4">
                  {section.items.map((item: any, itemIndex: number) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-sm font-medium text-gray-500">
                          {itemIndex + 1}.
                        </span>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-medium">{item.question}</p>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                item.criticality === 'CRITICAL'
                                  ? 'bg-red-100 text-red-800'
                                  : item.criticality === 'MAJOR'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {item.criticality}
                            </span>
                          </div>

                          {/* Response Input */}
                          {item.responseType === 'YES_NO' && (
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleResponse(item.id, true)}
                                className={`px-6 py-2 rounded-md border-2 transition-all ${
                                  responses[item.id]?.value === true
                                    ? 'bg-green-600 text-white border-green-600'
                                    : 'border-gray-300 hover:border-green-600'
                                }`}
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => handleResponse(item.id, false)}
                                className={`px-6 py-2 rounded-md border-2 transition-all ${
                                  responses[item.id]?.value === false
                                    ? 'bg-red-600 text-white border-red-600'
                                    : 'border-gray-300 hover:border-red-600'
                                }`}
                              >
                                No
                              </button>
                              <button
                                onClick={() => handleResponse(item.id, 'N/A')}
                                className={`px-6 py-2 rounded-md border-2 transition-all ${
                                  responses[item.id]?.value === 'N/A'
                                    ? 'bg-gray-600 text-white border-gray-600'
                                    : 'border-gray-300 hover:border-gray-600'
                                }`}
                              >
                                N/A
                              </button>
                            </div>
                          )}

                          {item.responseType === 'NUMERIC' && (
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                value={responses[item.id]?.value || ''}
                                onChange={(e) => handleResponse(item.id, e.target.value)}
                                className="w-40 px-3 py-2 border border-gray-300 rounded-md"
                                placeholder="Enter value"
                              />
                              {item.unit && (
                                <span className="text-gray-600">{item.unit}</span>
                              )}
                              {item.targetRange && (
                                <span className="text-sm text-gray-500">
                                  (Target: {item.targetRange.min} - {item.targetRange.max})
                                </span>
                              )}
                            </div>
                          )}

                          {/* Evidence Upload */}
                          <div className="mt-3 flex gap-2">
                            <label className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                              <Camera className="h-4 w-4" />
                              Take Photo
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    uploadEvidence(item.id, e.target.files[0])
                                  }
                                }}
                              />
                            </label>
                            <label className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                              <Upload className="h-4 w-4" />
                              Upload
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    uploadEvidence(item.id, e.target.files[0])
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            onClick={calculateScore}
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Calculate Score
          </button>
          <button
            onClick={submitAudit}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <CheckCircle className="h-5 w-5" />
            Submit Audit
          </button>
        </div>
      </div>
    </div>
  )
}
