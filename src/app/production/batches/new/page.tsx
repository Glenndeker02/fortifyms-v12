'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, AlertCircle, Calculator } from 'lucide-react'

export default function NewBatchPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    // Basic Info
    millId: 'default-mill',
    operatorId: 'default-operator',
    productionLine: '',
    shift: '',
    batchDateTime: new Date().toISOString().slice(0, 16),

    // Crop & Product
    cropType: '',
    productType: '',
    grade: '',
    rawMaterialLot: '',
    rawMaterialSource: '',

    // Production Volume
    inputWeight: '',
    expectedOutputWeight: '',
    outputWeight: '',

    // Fortification
    premixType: '',
    premixBatchNumber: '',
    premixManufacturer: '',
    premixExpiryDate: '',
    targetFortification: '',
    dosingRate: '',
    actualPremixUsed: '',
    varianceExplanation: '',

    // Equipment
    doserId: '',
    mixerId: '',
    mixingTime: '',
    mixerSpeed: '',

    // Process Parameters (for parboiled rice)
    soakingTime: '',
    soakingTemp: '',
    steamingPressure: '',
    steamingDuration: '',
    dryingTemp: '',

    // Storage
    storageLocation: '',
    packagingDate: '',
    packagingType: '',
    numberOfUnits: '',
  })

  const [expectedPremix, setExpectedPremix] = useState(0)
  const [premixVariance, setPremixVariance] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Calculate expected premix when inputs change
  useEffect(() => {
    if (formData.inputWeight && formData.dosingRate) {
      const input = parseFloat(formData.inputWeight)
      const dosing = parseFloat(formData.dosingRate)
      const expected = (input * dosing) / 100
      setExpectedPremix(expected)
    }
  }, [formData.inputWeight, formData.dosingRate])

  // Calculate variance when actual premix is entered
  useEffect(() => {
    if (formData.actualPremixUsed && expectedPremix > 0) {
      const actual = parseFloat(formData.actualPremixUsed)
      const variance = ((actual - expectedPremix) / expectedPremix) * 100
      const absVariance = Math.abs(variance)

      setPremixVariance({
        value: variance,
        status: absVariance > 10 ? 'CRITICAL' : absVariance > 5 ? 'WARNING' : 'OK',
        color: absVariance > 10 ? 'red' : absVariance > 5 ? 'yellow' : 'green',
      })
    }
  }, [formData.actualPremixUsed, expectedPremix])

  const handleSubmit = async () => {
    setLoading(true)

    try {
      // Build process parameters JSON for parboiled rice
      let processParameters = null
      if (formData.cropType === 'Parboiled rice') {
        processParameters = JSON.stringify({
          soakingTime: formData.soakingTime ? parseFloat(formData.soakingTime) : null,
          soakingTemp: formData.soakingTemp ? parseFloat(formData.soakingTemp) : null,
          steamingPressure: formData.steamingPressure
            ? parseFloat(formData.steamingPressure)
            : null,
          steamingDuration: formData.steamingDuration
            ? parseFloat(formData.steamingDuration)
            : null,
          dryingTemp: formData.dryingTemp ? parseFloat(formData.dryingTemp) : null,
        })
      }

      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          inputWeight: parseFloat(formData.inputWeight),
          expectedOutputWeight: formData.expectedOutputWeight
            ? parseFloat(formData.expectedOutputWeight)
            : undefined,
          outputWeight: formData.outputWeight ? parseFloat(formData.outputWeight) : undefined,
          dosingRate: formData.dosingRate ? parseFloat(formData.dosingRate) : undefined,
          expectedPremix: expectedPremix || undefined,
          actualPremixUsed: formData.actualPremixUsed
            ? parseFloat(formData.actualPremixUsed)
            : undefined,
          mixingTime: formData.mixingTime ? parseFloat(formData.mixingTime) : undefined,
          mixerSpeed: formData.mixerSpeed ? parseFloat(formData.mixerSpeed) : undefined,
          numberOfUnits: formData.numberOfUnits ? parseInt(formData.numberOfUnits) : undefined,
          processParameters,
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`Batch ${data.batchId} created successfully!`)
        router.push(`/production/batches/${data.batch.id}`)
      } else {
        alert('Failed to create batch: ' + data.error)
      }
    } catch (error) {
      console.error('Error creating batch:', error)
      alert('Failed to create batch')
    } finally {
      setLoading(false)
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {[1, 2, 3, 4, 5].map((s) => (
        <div key={s} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              step >= s ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}
          >
            {s}
          </div>
          {s < 5 && (
            <div
              className={`w-16 h-1 mx-2 ${
                step > s ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">New Production Batch</h1>
        <p className="text-gray-600 mb-6">Create comprehensive production record with full traceability</p>

        {renderStepIndicator()}

        <div className="bg-white rounded-lg shadow p-6">
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">1. Basic Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Production Line *
                  </label>
                  <select
                    value={formData.productionLine}
                    onChange={(e) => setFormData({ ...formData, productionLine: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Select line</option>
                    <option value="Line 1">Line 1</option>
                    <option value="Line 2">Line 2</option>
                    <option value="Line 3">Line 3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Select shift</option>
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Night">Night</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch Date/Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.batchDateTime}
                    onChange={(e) => setFormData({ ...formData, batchDateTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Crop & Product */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">2. Crop & Product Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Raw Material Type *
                  </label>
                  <select
                    value={formData.cropType}
                    onChange={(e) => setFormData({ ...formData, cropType: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Select type</option>
                    <option value="Parboiled rice">Parboiled rice</option>
                    <option value="Raw rice">Raw rice</option>
                    <option value="Whole grain maize">Whole grain maize</option>
                    <option value="Refined maize flour">Refined maize flour</option>
                    <option value="Wheat flour">Wheat flour</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Type *
                  </label>
                  <input
                    type="text"
                    value={formData.productType}
                    onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="e.g., Fortified Maize Flour"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade/Variety</label>
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="e.g., Long grain white rice"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raw Material Lot #</label>
                  <input
                    type="text"
                    value={formData.rawMaterialLot}
                    onChange={(e) => setFormData({ ...formData, rawMaterialLot: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raw Material Source</label>
                  <input
                    type="text"
                    value={formData.rawMaterialSource}
                    onChange={(e) => setFormData({ ...formData, rawMaterialSource: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Supplier name or farm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Production Volume & Fortification */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">3. Production Volume & Fortification</h2>

              {/* Production Volume */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Production Volume</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Input Weight (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.inputWeight}
                      onChange={(e) => setFormData({ ...formData, inputWeight: e.target.value })}
                      required
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Output (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.expectedOutputWeight}
                      onChange={(e) =>
                        setFormData({ ...formData, expectedOutputWeight: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Actual Output (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.outputWeight}
                      onChange={(e) => setFormData({ ...formData, outputWeight: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Fortification Parameters */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Fortification Parameters</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Premix Type</label>
                    <input
                      type="text"
                      value={formData.premixType}
                      onChange={(e) => setFormData({ ...formData, premixType: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Premix Batch Number
                    </label>
                    <input
                      type="text"
                      value={formData.premixBatchNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, premixBatchNumber: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Premix Manufacturer
                    </label>
                    <input
                      type="text"
                      value={formData.premixManufacturer}
                      onChange={(e) =>
                        setFormData({ ...formData, premixManufacturer: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Premix Expiry Date
                    </label>
                    <input
                      type="date"
                      value={formData.premixExpiryDate}
                      onChange={(e) =>
                        setFormData({ ...formData, premixExpiryDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dosing Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.dosingRate}
                      onChange={(e) => setFormData({ ...formData, dosingRate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="0.2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Premix (kg)
                    </label>
                    <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md font-semibold text-blue-900 flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      {expectedPremix.toFixed(3)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Actual Premix Used (kg)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.actualPremixUsed}
                      onChange={(e) =>
                        setFormData({ ...formData, actualPremixUsed: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  {premixVariance && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Variance</label>
                      <div
                        className={`px-3 py-2 rounded-md font-semibold ${
                          premixVariance.color === 'red'
                            ? 'bg-red-100 text-red-900 border border-red-300'
                            : premixVariance.color === 'yellow'
                            ? 'bg-yellow-100 text-yellow-900 border border-yellow-300'
                            : 'bg-green-100 text-green-900 border border-green-300'
                        }`}
                      >
                        {premixVariance.value > 0 ? '+' : ''}
                        {premixVariance.value.toFixed(2)}%
                      </div>
                    </div>
                  )}
                </div>

                {premixVariance && premixVariance.status !== 'OK' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Variance Explanation *
                    </label>
                    <select
                      value={formData.varianceExplanation}
                      onChange={(e) =>
                        setFormData({ ...formData, varianceExplanation: e.target.value })
                      }
                      required
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select reason</option>
                      <option value="Spillage">Spillage</option>
                      <option value="Doser malfunction">Doser malfunction</option>
                      <option value="Measurement error">Measurement error</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Equipment & Process Parameters */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">4. Equipment & Process</h2>

              {/* Equipment Settings */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Equipment Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Doser ID</label>
                    <input
                      type="text"
                      value={formData.doserId}
                      onChange={(e) => setFormData({ ...formData, doserId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mixer ID</label>
                    <input
                      type="text"
                      value={formData.mixerId}
                      onChange={(e) => setFormData({ ...formData, mixerId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mixing Time (minutes)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.mixingTime}
                      onChange={(e) => setFormData({ ...formData, mixingTime: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mixer Speed (RPM)
                    </label>
                    <input
                      type="number"
                      value={formData.mixerSpeed}
                      onChange={(e) => setFormData({ ...formData, mixerSpeed: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Process Parameters for Parboiled Rice */}
              {formData.cropType === 'Parboiled rice' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Parboiling Process Parameters
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Soaking Time (hours)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.soakingTime}
                        onChange={(e) => setFormData({ ...formData, soakingTime: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Soaking Temperature (°C)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.soakingTemp}
                        onChange={(e) => setFormData({ ...formData, soakingTemp: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Steaming Pressure (PSI)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.steamingPressure}
                        onChange={(e) =>
                          setFormData({ ...formData, steamingPressure: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Steaming Duration (minutes)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.steamingDuration}
                        onChange={(e) =>
                          setFormData({ ...formData, steamingDuration: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Drying Temperature (°C)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.dryingTemp}
                        onChange={(e) => setFormData({ ...formData, dryingTemp: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Storage & Packaging */}
          {step === 5 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">5. Storage & Packaging</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Storage Location
                  </label>
                  <input
                    type="text"
                    value={formData.storageLocation}
                    onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="e.g., Warehouse A, Silo 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Packaging Date
                  </label>
                  <input
                    type="date"
                    value={formData.packagingDate}
                    onChange={(e) => setFormData({ ...formData, packagingDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Packaging Type
                  </label>
                  <select
                    value={formData.packagingType}
                    onChange={(e) => setFormData({ ...formData, packagingType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Select type</option>
                    <option value="1kg bags">1kg bags</option>
                    <option value="5kg bags">5kg bags</option>
                    <option value="25kg bags">25kg bags</option>
                    <option value="50kg bags">50kg bags</option>
                    <option value="Bulk">Bulk</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Units
                  </label>
                  <input
                    type="number"
                    value={formData.numberOfUnits}
                    onChange={(e) => setFormData({ ...formData, numberOfUnits: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Total bags/packages"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-2 border rounded-md hover:bg-gray-50"
              >
                Previous
              </button>
            )}
            {step < 5 && (
              <button
                onClick={() => setStep(step + 1)}
                className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Next
              </button>
            )}
            {step === 5 && (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="ml-auto px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Creating Batch...' : 'Create Batch'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
