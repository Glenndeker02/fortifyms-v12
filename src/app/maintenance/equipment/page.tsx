'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Wrench, Calendar, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface Equipment {
  id: string
  name: string
  type: string
  manufacturer?: string
  serialNumber?: string
  location?: string
  status: string
  lastCalibrationDate?: string
  installationDate?: string
}

export default function EquipmentRegistryPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    location: '',
    installationDate: '',
  })

  useEffect(() => {
    fetchEquipment()
  }, [])

  const fetchEquipment = async () => {
    const res = await fetch('/api/maintenance/equipment')
    const data = await res.json()
    setEquipment(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const url = editingId
      ? `/api/maintenance/equipment/${editingId}`
      : '/api/maintenance/equipment'
    const method = editingId ? 'PUT' : 'POST'

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        millId: 'default-mill', // TODO: Get from context
        installationDate: formData.installationDate || undefined,
      }),
    })

    setShowForm(false)
    setEditingId(null)
    setFormData({
      name: '',
      type: '',
      manufacturer: '',
      model: '',
      serialNumber: '',
      location: '',
      installationDate: '',
    })
    fetchEquipment()
  }

  const handleEdit = (eq: Equipment) => {
    setFormData({
      name: eq.name,
      type: eq.type,
      manufacturer: eq.manufacturer || '',
      model: '',
      serialNumber: eq.serialNumber || '',
      location: eq.location || '',
      installationDate: eq.installationDate
        ? new Date(eq.installationDate).toISOString().split('T')[0]
        : '',
    })
    setEditingId(eq.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment?')) return

    await fetch(`/api/maintenance/equipment/${id}`, { method: 'DELETE' })
    fetchEquipment()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'NEEDS_CALIBRATION':
        return 'bg-yellow-100 text-yellow-800'
      case 'NEEDS_REPAIR':
        return 'bg-red-100 text-red-800'
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Equipment Registry</h1>
          <button
            onClick={() => {
              setShowForm(true)
              setEditingId(null)
              setFormData({
                name: '',
                type: '',
                manufacturer: '',
                model: '',
                serialNumber: '',
                location: '',
                installationDate: '',
              })
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Equipment
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingId ? 'Edit Equipment' : 'Add New Equipment'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipment Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Select type</option>
                  <option value="DOSER">Doser</option>
                  <option value="MIXER">Mixer</option>
                  <option value="MILL">Mill</option>
                  <option value="SCALE">Scale</option>
                  <option value="SIEVE">Sieve</option>
                  <option value="CONVEYOR">Conveyor</option>
                  <option value="STORAGE">Storage</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manufacturer
                </label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Production Line 1"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Installation Date
                </label>
                <input
                  type="date"
                  value={formData.installationDate}
                  onChange={(e) => setFormData({ ...formData, installationDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div className="col-span-2 flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
                  }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Equipment Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Manufacturer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Last Calibration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {equipment.map((eq) => (
                  <tr key={eq.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{eq.name}</div>
                      {eq.serialNumber && (
                        <div className="text-sm text-gray-500">SN: {eq.serialNumber}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {eq.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {eq.manufacturer || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {eq.location || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(eq.status)}`}>
                        {eq.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {eq.lastCalibrationDate
                        ? new Date(eq.lastCalibrationDate).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(eq)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <Link
                          href={`/maintenance/equipment/${eq.id}`}
                          className="text-green-600 hover:text-green-800"
                          title="View Details"
                        >
                          <Wrench className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/maintenance/equipment/${eq.id}/health`}
                          className="text-purple-600 hover:text-purple-800"
                          title="Health Status"
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(eq.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
