'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Trash2, Save, AlertCircle } from 'lucide-react'

interface Measurement {
  testPoint: number
  expectedValue: number
  actualValue: number
  unit: string
  tolerance: number
}

export default function CalibrationFormPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string

  const [measurements, setMeasurements] = useState<Measurement[]>([
    { testPoint: 1, expectedValue: 0, actualValue: 0, unit: 'ppm', tolerance: 5 },
  ])
  const [notes, setNotes] = useState('')
  const [performedBy, setPerformedBy] = useState('')
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([])
  const [temperature, setTemperature] = useState('')
  const [humidity, setHumidity] = useState('')
  const [pressure, setPressure] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const addMeasurement = () => {
    setMeasurements([
      ...measurements,
      {
        testPoint: measurements.length + 1,
        expectedValue: 0,
        actualValue: 0,
        unit: 'ppm',
        tolerance: 5,
      },
    ])
  }

  const removeMeasurement = (index: number) => {
    setMeasurements(measurements.filter((_, i) => i !== index))
  }

  const updateMeasurement = (index: number, field: keyof Measurement, value: any) => {
    const updated = [...measurements]
    updated[index] = { ...updated[index], [field]: value }
    setMeasurements(updated)
  }

  const calculateDeviation = (expected: number, actual: number): string => {
    if (expected === 0) return '0.00'
    const deviation = ((actual - expected) / expected) * 100
    return deviation.toFixed(2)
  }

  const isWithinTolerance = (expected: number, actual: number, tolerance: number): boolean => {
    if (expected === 0) return true
    const deviation = Math.abs(((actual - expected) / expected) * 100)
    return deviation <= tolerance
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/maintenance/calibration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          equipmentId: 'default-equipment', // TODO: Get from task
          performedBy,
          measurements,
          notes,
          evidenceUrls,
          environmentalConditions: {
            temperature: temperature ? parseFloat(temperature) : undefined,
            humidity: humidity ? parseFloat(humidity) : undefined,
            pressure: pressure ? parseFloat(pressure) : undefined,
          },
        }),
      })

      const data = await res.json()
      setResult(data)

      if (data.success) {
        alert(
          `Calibration ${data.validation.isValid ? 'passed' : 'failed'}! ${data.message}`
        )
        router.push(`/maintenance/tasks/${taskId}`)
      }
    } catch (error) {
      console.error('Error submitting calibration:', error)
      alert('Failed to submit calibration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Equipment Calibration</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Calibration Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Performed By *
                </label>
                <input
                  type="text"
                  value={performedBy}
                  onChange={(e) => setPerformedBy(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Technician name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={new Date().toISOString().split('T')[0]}
                  disabled
                  className="w-full px-3 py-2 border rounded-md bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Environmental Conditions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Environmental Conditions (Optional)
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Humidity (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={humidity}
                  onChange={(e) => setHumidity(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pressure (kPa)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={pressure}
                  onChange={(e) => setPressure(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Measurements */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Calibration Measurements</h2>
              <button
                type="button"
                onClick={addMeasurement}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Point
              </button>
            </div>

            <div className="space-y-4">
              {measurements.map((measurement, index) => {
                const deviation = calculateDeviation(measurement.expectedValue, measurement.actualValue)
                const withinTolerance = isWithinTolerance(
                  measurement.expectedValue,
                  measurement.actualValue,
                  measurement.tolerance
                )

                return (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${!withinTolerance && measurement.expectedValue !== 0 ? 'border-red-300 bg-red-50' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-gray-900">
                        Test Point {measurement.testPoint}
                      </div>
                      {measurements.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMeasurement(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-5 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Expected
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={measurement.expectedValue}
                          onChange={(e) =>
                            updateMeasurement(index, 'expectedValue', parseFloat(e.target.value))
                          }
                          className="w-full px-2 py-1 border rounded text-sm"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Actual
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={measurement.actualValue}
                          onChange={(e) =>
                            updateMeasurement(index, 'actualValue', parseFloat(e.target.value))
                          }
                          className="w-full px-2 py-1 border rounded text-sm"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Unit
                        </label>
                        <select
                          value={measurement.unit}
                          onChange={(e) => updateMeasurement(index, 'unit', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="ppm">ppm</option>
                          <option value="mg/kg">mg/kg</option>
                          <option value="IU/kg">IU/kg</option>
                          <option value="%">%</option>
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Tolerance (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={measurement.tolerance}
                          onChange={(e) =>
                            updateMeasurement(index, 'tolerance', parseFloat(e.target.value))
                          }
                          className="w-full px-2 py-1 border rounded text-sm"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Deviation
                        </label>
                        <div
                          className={`px-2 py-1 text-sm font-semibold rounded ${
                            withinTolerance ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {deviation}%
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Any additional observations or issues..."
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Submitting...' : 'Submit Calibration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
