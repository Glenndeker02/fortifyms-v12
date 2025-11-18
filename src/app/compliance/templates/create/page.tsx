'use client'

import { useState } from 'react'
import { Plus, Trash2, GripVertical, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ChecklistItem {
  id: string
  question: string
  responseType: 'YES_NO' | 'NUMERIC' | 'TEXT' | 'DROPDOWN' | 'MULTIPLE_CHOICE'
  criticality: 'CRITICAL' | 'MAJOR' | 'MINOR'
  weight: number
  targetValue?: number
  targetRange?: { min: number; max: number }
  unit?: string
  helpText?: string
  options?: string[]
}

interface Section {
  id: string
  name: string
  items: ChecklistItem[]
  minimumThreshold?: number
}

export default function CreateTemplatePage() {
  const router = useRouter()
  const [template, setTemplate] = useState({
    name: '',
    commodity: 'rice',
    country: '',
    region: '',
    standardReference: '',
    certificationType: 'INITIAL',
  })

  const [sections, setSections] = useState<Section[]>([
    {
      id: 's1',
      name: 'Premix Storage & Handling',
      items: [],
      minimumThreshold: 70,
    },
  ])

  const [scoringRules, setScoringRules] = useState({
    criticalWeight: 10,
    majorWeight: 5,
    minorWeight: 2,
    passingThreshold: 75,
    autoFailOnCritical: true,
    excellentThreshold: 90,
    goodThreshold: 75,
    needsImprovementThreshold: 60,
  })

  const [activeSection, setActiveSection] = useState(0)
  const [loading, setLoading] = useState(false)

  const addSection = () => {
    setSections([
      ...sections,
      {
        id: `s${sections.length + 1}`,
        name: `Section ${sections.length + 1}`,
        items: [],
        minimumThreshold: 70,
      },
    ])
  }

  const updateSection = (index: number, field: string, value: any) => {
    const updated = [...sections]
    updated[index] = { ...updated[index], [field]: value }
    setSections(updated)
  }

  const deleteSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index))
    if (activeSection >= sections.length - 1) {
      setActiveSection(Math.max(0, sections.length - 2))
    }
  }

  const addItem = (sectionIndex: number) => {
    const updated = [...sections]
    updated[sectionIndex].items.push({
      id: `i${Date.now()}`,
      question: '',
      responseType: 'YES_NO',
      criticality: 'MAJOR',
      weight: 5,
    })
    setSections(updated)
  }

  const updateItem = (sectionIndex: number, itemIndex: number, field: string, value: any) => {
    const updated = [...sections]
    updated[sectionIndex].items[itemIndex] = {
      ...updated[sectionIndex].items[itemIndex],
      [field]: value,
    }
    setSections(updated)
  }

  const deleteItem = (sectionIndex: number, itemIndex: number) => {
    const updated = [...sections]
    updated[sectionIndex].items = updated[sectionIndex].items.filter((_, i) => i !== itemIndex)
    setSections(updated)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/compliance/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...template,
          sections,
          scoringRules,
        }),
      })

      if (response.ok) {
        router.push('/compliance/templates')
      } else {
        alert('Failed to create template')
      }
    } catch (error) {
      console.error(error)
      alert('Error creating template')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Create Compliance Template
        </h1>

        {/* Template Metadata */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Template Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name *
              </label>
              <input
                type="text"
                value={template.name}
                onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., Rice Fortification Standard Checklist"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commodity *
              </label>
              <select
                value={template.commodity}
                onChange={(e) => setTemplate({ ...template, commodity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="rice">Rice</option>
                <option value="maize">Maize</option>
                <option value="wheat">Wheat</option>
                <option value="flour">Flour</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country *
              </label>
              <input
                type="text"
                value={template.country}
                onChange={(e) => setTemplate({ ...template, country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., Kenya"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Standard Reference
              </label>
              <input
                type="text"
                value={template.standardReference}
                onChange={(e) =>
                  setTemplate({ ...template, standardReference: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., Kenya Bureau of Standards KS 05-2023"
              />
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Checklist Sections</h2>
            <button
              onClick={addSection}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              Add Section
            </button>
          </div>

          <div className="flex gap-4">
            {/* Section Tabs */}
            <div className="w-64 space-y-2">
              {sections.map((section, index) => (
                <div
                  key={section.id}
                  className={`p-3 rounded-md cursor-pointer flex items-center justify-between ${
                    activeSection === index
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  onClick={() => setActiveSection(index)}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-sm">{section.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteSection(index)
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Section Content */}
            {sections[activeSection] && (
              <div className="flex-1">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section Name
                  </label>
                  <input
                    type="text"
                    value={sections[activeSection].name}
                    onChange={(e) => updateSection(activeSection, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Threshold (%)
                  </label>
                  <input
                    type="number"
                    value={sections[activeSection].minimumThreshold || 70}
                    onChange={(e) =>
                      updateSection(activeSection, 'minimumThreshold', parseFloat(e.target.value))
                    }
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md"
                    min="0"
                    max="100"
                  />
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Checklist Items</h3>
                    <button
                      onClick={() => addItem(activeSection)}
                      className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-800"
                    >
                      <Plus className="h-4 w-4" />
                      Add Item
                    </button>
                  </div>

                  {sections[activeSection].items.map((item, itemIndex) => (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded-md p-4 mb-3"
                    >
                      <div className="flex justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">
                          Item {itemIndex + 1}
                        </span>
                        <button
                          onClick={() => deleteItem(activeSection, itemIndex)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Question
                          </label>
                          <input
                            type="text"
                            value={item.question}
                            onChange={(e) =>
                              updateItem(activeSection, itemIndex, 'question', e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Enter the checklist question"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Response Type
                            </label>
                            <select
                              value={item.responseType}
                              onChange={(e) =>
                                updateItem(activeSection, itemIndex, 'responseType', e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            >
                              <option value="YES_NO">Yes/No</option>
                              <option value="NUMERIC">Numeric</option>
                              <option value="TEXT">Text</option>
                              <option value="DROPDOWN">Dropdown</option>
                              <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Criticality
                            </label>
                            <select
                              value={item.criticality}
                              onChange={(e) =>
                                updateItem(activeSection, itemIndex, 'criticality', e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            >
                              <option value="CRITICAL">Critical</option>
                              <option value="MAJOR">Major</option>
                              <option value="MINOR">Minor</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Weight
                            </label>
                            <input
                              type="number"
                              value={item.weight}
                              onChange={(e) =>
                                updateItem(activeSection, itemIndex, 'weight', parseFloat(e.target.value))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              min="1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scoring Rules */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Scoring Rules</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passing Threshold (%)
              </label>
              <input
                type="number"
                value={scoringRules.passingThreshold}
                onChange={(e) =>
                  setScoringRules({ ...scoringRules, passingThreshold: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Excellent Threshold (%)
              </label>
              <input
                type="number"
                value={scoringRules.excellentThreshold}
                onChange={(e) =>
                  setScoringRules({ ...scoringRules, excellentThreshold: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="0"
                max="100"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={scoringRules.autoFailOnCritical}
                  onChange={(e) =>
                    setScoringRules({ ...scoringRules, autoFailOnCritical: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">
                  Auto-fail on critical failure
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            {loading ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  )
}
