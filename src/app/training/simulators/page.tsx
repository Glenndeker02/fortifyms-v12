'use client'

import { useState } from 'react'
import DoserCalibrationSimulator from '@/components/simulators/DoserCalibrationSimulator'
import PremixDosingCalculator from '@/components/calculators/PremixDosingCalculator'
import { Calculator, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type SimulatorType = 'calibration' | 'dosing'

export default function SimulatorsPage() {
  const [selectedSimulator, setSelectedSimulator] = useState<SimulatorType>('calibration')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/training"
            className="inline-flex items-center gap-2 text-white hover:text-green-100 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Training Center
          </Link>
          <div className="flex items-center gap-4">
            <Calculator className="h-10 w-10" />
            <div>
              <h1 className="text-3xl font-bold">Interactive Simulators</h1>
              <p className="text-green-100 mt-1">
                Practice calibration and dosing calculations with real-time feedback
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Simulator Selector */}
        <div className="bg-white rounded-lg shadow p-4 mb-8">
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedSimulator('calibration')}
              className={`flex-1 px-6 py-4 rounded-lg font-medium transition-all ${
                selectedSimulator === 'calibration'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">⚙️</div>
                <div className="font-bold">Doser Calibration</div>
                <div className="text-xs opacity-80 mt-1">
                  Calibration verification and adjustment calculator
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedSimulator('dosing')}
              className={`flex-1 px-6 py-4 rounded-lg font-medium transition-all ${
                selectedSimulator === 'dosing'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">🧪</div>
                <div className="font-bold">Premix Dosing</div>
                <div className="text-xs opacity-80 mt-1">
                  Calculate precise premix quantities for batches
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Simulator Display */}
        <div className="mb-8">
          {selectedSimulator === 'calibration' ? (
            <DoserCalibrationSimulator />
          ) : (
            <PremixDosingCalculator />
          )}
        </div>

        {/* Help Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">How to Use</h3>
            {selectedSimulator === 'calibration' ? (
              <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                <li>Select your doser type (volumetric or gravimetric)</li>
                <li>Enter the target flow rate from equipment specifications</li>
                <li>Run a 1-minute test and weigh the actual premix output</li>
                <li>Enter the actual flow rate measured</li>
                <li>Input your batch size and target concentration</li>
                <li>Click "Calculate Calibration" to see results</li>
                <li>Follow the recommendations to adjust your doser settings</li>
              </ol>
            ) : (
              <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                <li>Select the commodity type you're fortifying</li>
                <li>Enter your batch size in kilograms</li>
                <li>Choose the target nutrient you're fortifying with</li>
                <li>Enter the desired concentration in ppm or IU</li>
                <li>Input the premix concentration percentage</li>
                <li>Set an appropriate safety margin (typically 10%)</li>
                <li>Click "Calculate Dosing" to see precise premix requirements</li>
              </ol>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Best Practices</h3>
            {selectedSimulator === 'calibration' ? (
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>
                    Calibrate dosers at the start of each production day
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>
                    Always run at least 3 test cycles and average the results
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>
                    Keep calibration logs with date, time, and operator name
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>
                    Recalibrate if deviation exceeds ±5% tolerance
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>
                    Verify calibration after any equipment maintenance
                  </span>
                </li>
              </ul>
            ) : (
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>
                    Always include a 10-15% safety margin for mixing losses
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>
                    Double-check premix concentration on certificate of analysis
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>
                    Weigh premix on calibrated scales (±0.1g accuracy)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>
                    Record premix lot number on batch production sheet
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>
                    Take QC samples from 5 different points in batch
                  </span>
                </li>
              </ul>
            )}
          </div>
        </div>

        {/* Additional Resources */}
        <div className="mt-8 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg shadow-lg p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-2">Want to Learn More?</h3>
          <p className="text-green-100 mb-6">
            Watch our process animations to see these concepts in action
          </p>
          <Link
            href="/training/animations"
            className="inline-block px-8 py-3 bg-white text-green-600 font-semibold rounded-lg hover:bg-green-50 transition-colors"
          >
            View Process Animations
          </Link>
        </div>
      </div>
    </div>
  )
}
