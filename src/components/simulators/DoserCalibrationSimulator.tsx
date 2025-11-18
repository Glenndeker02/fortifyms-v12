'use client'

import { useState } from 'react'
import { Calculator, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react'

interface CalibrationData {
  doserType: 'volumetric' | 'gravimetric'
  targetFlowRate: number // grams per minute
  actualFlowRate: number
  batchSize: number // kg
  targetConcentration: number // ppm
  premixConcentration: number // % active ingredient
}

export default function DoserCalibrationSimulator() {
  const [data, setData] = useState<CalibrationData>({
    doserType: 'volumetric',
    targetFlowRate: 100,
    actualFlowRate: 95,
    batchSize: 1000,
    targetConcentration: 30,
    premixConcentration: 0.5,
  })

  const [showResults, setShowResults] = useState(false)

  const calculateCalibration = () => {
    const deviation = ((data.actualFlowRate - data.targetFlowRate) / data.targetFlowRate) * 100
    const isWithinTolerance = Math.abs(deviation) <= 5 // 5% tolerance

    // Calculate required premix amount
    const premixRequired = (data.targetConcentration * data.batchSize) / (data.premixConcentration * 1000)

    // Calculate mixing time based on flow rate
    const mixingTime = (premixRequired * 1000) / data.actualFlowRate // minutes

    // Calculate adjustment factor
    const adjustmentFactor = data.targetFlowRate / data.actualFlowRate

    return {
      deviation,
      isWithinTolerance,
      premixRequired,
      mixingTime,
      adjustmentFactor,
    }
  }

  const results = showResults ? calculateCalibration() : null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowResults(true)
  }

  const handleReset = () => {
    setData({
      doserType: 'volumetric',
      targetFlowRate: 100,
      actualFlowRate: 95,
      batchSize: 1000,
      targetConcentration: 30,
      premixConcentration: 0.5,
    })
    setShowResults(false)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="h-8 w-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Doser Calibration Simulator
          </h2>
          <p className="text-sm text-gray-600">
            Interactive tool for doser calibration and adjustment calculations
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Doser Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Doser Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="volumetric"
                checked={data.doserType === 'volumetric'}
                onChange={(e) =>
                  setData({ ...data, doserType: e.target.value as 'volumetric' })
                }
                className="mr-2"
              />
              <span className="text-sm">Volumetric</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="gravimetric"
                checked={data.doserType === 'gravimetric'}
                onChange={(e) =>
                  setData({ ...data, doserType: e.target.value as 'gravimetric' })
                }
                className="mr-2"
              />
              <span className="text-sm">Gravimetric</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target Flow Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Flow Rate (g/min)
            </label>
            <input
              type="number"
              value={data.targetFlowRate}
              onChange={(e) =>
                setData({ ...data, targetFlowRate: parseFloat(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              step="0.1"
              min="0"
            />
          </div>

          {/* Actual Flow Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Actual Flow Rate (g/min)
            </label>
            <input
              type="number"
              value={data.actualFlowRate}
              onChange={(e) =>
                setData({ ...data, actualFlowRate: parseFloat(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              step="0.1"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Measure actual output over 1 minute test run
            </p>
          </div>

          {/* Batch Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batch Size (kg)
            </label>
            <input
              type="number"
              value={data.batchSize}
              onChange={(e) =>
                setData({ ...data, batchSize: parseFloat(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              step="1"
              min="1"
            />
          </div>

          {/* Target Concentration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Concentration (ppm)
            </label>
            <input
              type="number"
              value={data.targetConcentration}
              onChange={(e) =>
                setData({ ...data, targetConcentration: parseFloat(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              step="0.1"
              min="0"
            />
          </div>

          {/* Premix Concentration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Premix Concentration (%)
            </label>
            <input
              type="number"
              value={data.premixConcentration}
              onChange={(e) =>
                setData({ ...data, premixConcentration: parseFloat(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              step="0.01"
              min="0"
              max="100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Active ingredient concentration in premix
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Calculate Calibration
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Results Section */}
      {showResults && results && (
        <div className="mt-8 space-y-6">
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Calibration Results
            </h3>

            {/* Status Card */}
            <div
              className={`p-4 rounded-lg mb-6 ${
                results.isWithinTolerance
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-orange-50 border border-orange-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {results.isWithinTolerance ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                )}
                <div>
                  <p
                    className={`font-semibold ${
                      results.isWithinTolerance ? 'text-green-900' : 'text-orange-900'
                    }`}
                  >
                    {results.isWithinTolerance
                      ? 'Calibration Within Tolerance'
                      : 'Calibration Adjustment Required'}
                  </p>
                  <p
                    className={`text-sm ${
                      results.isWithinTolerance ? 'text-green-700' : 'text-orange-700'
                    }`}
                  >
                    Deviation: {results.deviation.toFixed(2)}% (Tolerance: ±5%)
                  </p>
                </div>
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600 font-medium mb-1">
                  Premix Required
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {results.premixRequired.toFixed(2)} kg
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-purple-600 font-medium mb-1">
                  Dosing Time
                </p>
                <p className="text-2xl font-bold text-purple-900">
                  {results.mixingTime.toFixed(1)} min
                </p>
              </div>

              <div className="bg-indigo-50 rounded-lg p-4">
                <p className="text-sm text-indigo-600 font-medium mb-1">
                  Adjustment Factor
                </p>
                <p className="text-2xl font-bold text-indigo-900">
                  {results.adjustmentFactor.toFixed(3)}
                </p>
              </div>

              <div
                className={`rounded-lg p-4 ${
                  results.isWithinTolerance ? 'bg-green-50' : 'bg-orange-50'
                }`}
              >
                <p
                  className={`text-sm font-medium mb-1 ${
                    results.isWithinTolerance ? 'text-green-600' : 'text-orange-600'
                  }`}
                >
                  Deviation
                </p>
                <p
                  className={`text-2xl font-bold ${
                    results.isWithinTolerance ? 'text-green-900' : 'text-orange-900'
                  }`}
                >
                  {Math.abs(results.deviation).toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recommendations
              </h4>
              <ul className="space-y-2 text-sm text-gray-700">
                {!results.isWithinTolerance && (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold">•</span>
                      <span>
                        Adjust doser settings by multiplying current setting by{' '}
                        <strong>{results.adjustmentFactor.toFixed(3)}</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold">•</span>
                      <span>
                        Run a verification test after adjustment and record results
                      </span>
                    </li>
                  </>
                )}
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>
                    For this batch, you will need <strong>{results.premixRequired.toFixed(2)} kg</strong> of
                    premix
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>
                    Expected dosing time: <strong>{results.mixingTime.toFixed(1)} minutes</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>
                    Document this calibration check in your maintenance log
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
