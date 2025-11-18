'use client'

import { useState } from 'react'
import { Beaker, AlertCircle, Info } from 'lucide-react'

interface DosingData {
  batchSize: number // kg
  targetNutrient: 'iron' | 'vitaminA' | 'folicAcid' | 'zinc' | 'custom'
  targetConcentration: number // ppm or IU
  premixConcentration: number // %
  safetyMargin: number // %
  commodityType: 'rice' | 'maize' | 'wheat' | 'flour'
}

const NUTRIENT_INFO = {
  iron: {
    name: 'Iron (Fe)',
    unit: 'ppm',
    typical: '28-42',
    description: 'Ferrous fumarate or sodium iron EDTA',
  },
  vitaminA: {
    name: 'Vitamin A',
    unit: 'IU/kg',
    typical: '6000-10000',
    description: 'Retinyl palmitate or acetate',
  },
  folicAcid: {
    name: 'Folic Acid',
    unit: 'ppm',
    typical: '1.2-2.6',
    description: 'Synthetic folate',
  },
  zinc: {
    name: 'Zinc (Zn)',
    unit: 'ppm',
    typical: '50-80',
    description: 'Zinc oxide',
  },
  custom: {
    name: 'Custom Nutrient',
    unit: 'ppm',
    typical: 'N/A',
    description: 'Custom fortification',
  },
}

export default function PremixDosingCalculator() {
  const [data, setData] = useState<DosingData>({
    batchSize: 1000,
    targetNutrient: 'iron',
    targetConcentration: 30,
    premixConcentration: 0.5,
    safetyMargin: 10,
    commodityType: 'rice',
  })

  const [showResults, setShowResults] = useState(false)

  const calculateDosing = () => {
    // Calculate base premix requirement
    const basePremix = (data.targetConcentration * data.batchSize) / (data.premixConcentration * 1000)

    // Apply safety margin
    const premixWithMargin = basePremix * (1 + data.safetyMargin / 100)

    // Calculate concentration with margin
    const actualConcentration = (premixWithMargin * data.premixConcentration * 1000) / data.batchSize

    // Calculate cost estimates (example rates)
    const estimatedCostPerKg = 50 // USD per kg of premix (example)
    const totalCost = premixWithMargin * estimatedCostPerKg
    const costPerKgProduct = totalCost / data.batchSize

    // Mixing ratio
    const mixingRatio = (premixWithMargin / data.batchSize) * 1000 // grams per kg

    return {
      basePremix,
      premixWithMargin,
      actualConcentration,
      totalCost,
      costPerKgProduct,
      mixingRatio,
    }
  }

  const results = showResults ? calculateDosing() : null
  const nutrientInfo = NUTRIENT_INFO[data.targetNutrient]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowResults(true)
  }

  const handleReset = () => {
    setData({
      batchSize: 1000,
      targetNutrient: 'iron',
      targetConcentration: 30,
      premixConcentration: 0.5,
      safetyMargin: 10,
      commodityType: 'rice',
    })
    setShowResults(false)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Beaker className="h-8 w-8 text-green-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Premix Dosing Calculator</h2>
          <p className="text-sm text-gray-600">
            Calculate precise premix quantities for fortification
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Commodity Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commodity Type
            </label>
            <select
              value={data.commodityType}
              onChange={(e) =>
                setData({
                  ...data,
                  commodityType: e.target.value as DosingData['commodityType'],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="rice">Rice (Parboiled)</option>
              <option value="maize">Maize (Whole Grain)</option>
              <option value="wheat">Wheat</option>
              <option value="flour">Flour (Refined)</option>
            </select>
          </div>

          {/* Batch Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batch Size (kg)
            </label>
            <input
              type="number"
              value={data.batchSize}
              onChange={(e) => setData({ ...data, batchSize: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
              step="1"
              min="1"
            />
          </div>

          {/* Target Nutrient */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Nutrient
            </label>
            <select
              value={data.targetNutrient}
              onChange={(e) =>
                setData({
                  ...data,
                  targetNutrient: e.target.value as DosingData['targetNutrient'],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="iron">Iron (Fe)</option>
              <option value="vitaminA">Vitamin A</option>
              <option value="folicAcid">Folic Acid</option>
              <option value="zinc">Zinc (Zn)</option>
              <option value="custom">Custom Nutrient</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Typical: {nutrientInfo.typical} {nutrientInfo.unit}
            </p>
          </div>

          {/* Target Concentration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Concentration ({nutrientInfo.unit})
            </label>
            <input
              type="number"
              value={data.targetConcentration}
              onChange={(e) =>
                setData({ ...data, targetConcentration: parseFloat(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
              step="0.1"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">{nutrientInfo.description}</p>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
              step="0.01"
              min="0"
              max="100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Active ingredient % in premix blend
            </p>
          </div>

          {/* Safety Margin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Safety Margin (%)
            </label>
            <input
              type="number"
              value={data.safetyMargin}
              onChange={(e) =>
                setData({ ...data, safetyMargin: parseFloat(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
              step="1"
              min="0"
              max="50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Overage to account for mixing losses
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Calculation Method</p>
              <p>
                Premix Required = (Target Concentration × Batch Size) / (Premix
                Concentration × 1000) × (1 + Safety Margin)
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Calculate Dosing
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
            <h3 className="text-xl font-bold text-gray-900 mb-4">Dosing Results</h3>

            {/* Main Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                <p className="text-sm text-green-600 font-medium mb-1">
                  Premix Required
                </p>
                <p className="text-3xl font-bold text-green-900">
                  {results.premixWithMargin.toFixed(3)} kg
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Includes {data.safetyMargin}% safety margin
                </p>
              </div>

              <div className="bg-indigo-50 rounded-lg p-4">
                <p className="text-sm text-indigo-600 font-medium mb-1">
                  Actual Concentration
                </p>
                <p className="text-3xl font-bold text-indigo-900">
                  {results.actualConcentration.toFixed(2)}
                </p>
                <p className="text-xs text-indigo-700 mt-1">{nutrientInfo.unit}</p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-purple-600 font-medium mb-1">Mixing Ratio</p>
                <p className="text-3xl font-bold text-purple-900">
                  {results.mixingRatio.toFixed(2)}
                </p>
                <p className="text-xs text-purple-700 mt-1">grams per kg of product</p>
              </div>
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 font-medium mb-2">Base Requirement</p>
                <p className="text-lg font-semibold text-gray-900">
                  {results.basePremix.toFixed(3)} kg
                </p>
                <p className="text-xs text-gray-500">Without safety margin</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 font-medium mb-2">
                  Estimated Cost per kg
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  ${results.costPerKgProduct.toFixed(4)}
                </p>
                <p className="text-xs text-gray-500">
                  Total: ${results.totalCost.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-900">
                  <p className="font-medium mb-2">Dosing Instructions</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>
                      Weigh exactly <strong>{results.premixWithMargin.toFixed(3)} kg</strong> of
                      premix
                    </li>
                    <li>Ensure doser is calibrated and set to correct flow rate</li>
                    <li>
                      Add premix uniformly during mixing stage for{' '}
                      <strong>{data.commodityType}</strong>
                    </li>
                    <li>
                      Ensure minimum mixing time of{' '}
                      <strong>
                        {data.commodityType === 'flour' ? '5-7' : '8-10'} minutes
                      </strong>
                    </li>
                    <li>Take QC samples from 5 different points in the batch</li>
                    <li>Document batch details and premix lot number</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* QC Targets */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <p className="font-medium text-green-900 mb-2">Quality Control Targets</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-green-700">Target Range</p>
                  <p className="font-semibold text-green-900">
                    {(results.actualConcentration * 0.9).toFixed(1)} -{' '}
                    {(results.actualConcentration * 1.1).toFixed(1)} {nutrientInfo.unit}
                  </p>
                </div>
                <div>
                  <p className="text-green-700">Min Acceptable</p>
                  <p className="font-semibold text-green-900">
                    {(results.actualConcentration * 0.8).toFixed(1)} {nutrientInfo.unit}
                  </p>
                </div>
                <div>
                  <p className="text-green-700">Max Acceptable</p>
                  <p className="font-semibold text-green-900">
                    {(results.actualConcentration * 1.2).toFixed(1)} {nutrientInfo.unit}
                  </p>
                </div>
                <div>
                  <p className="text-green-700">Samples Required</p>
                  <p className="font-semibold text-green-900">5 per batch</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
