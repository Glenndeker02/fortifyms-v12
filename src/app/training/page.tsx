'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Video, Award, Clock, ChevronRight, PlayCircle } from 'lucide-react'
import Link from 'next/link'

interface Course {
  id: string
  title: string
  description: string
  duration: number
  level: string
  category: string
  modulesCount: number
}

export default function TrainingPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<{
    category: string
    level: string
  }>({
    category: 'all',
    level: 'all',
  })

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      // In production, this would fetch from /api/training/courses
      // For now, we'll use mock data
      const mockCourses: Course[] = [
        {
          id: '1',
          title: 'Rice Parboiling Optimization',
          description: 'Learn the complete rice parboiling process with fortification best practices',
          duration: 30,
          level: 'Intermediate',
          category: 'Process Training',
          modulesCount: 5,
        },
        {
          id: '2',
          title: 'Volumetric Doser Calibration',
          description: 'Master the calibration and maintenance of volumetric dosing equipment',
          duration: 15,
          level: 'Beginner',
          category: 'Equipment Training',
          modulesCount: 3,
        },
        {
          id: '3',
          title: 'Premix Handling and Storage',
          description: 'Essential practices for safe premix management and quality preservation',
          duration: 20,
          level: 'Beginner',
          category: 'Process Training',
          modulesCount: 4,
        },
        {
          id: '4',
          title: 'Quality Control Sampling Techniques',
          description: 'Comprehensive guide to QC sampling, testing, and result interpretation',
          duration: 25,
          level: 'Intermediate',
          category: 'Quality Assurance',
          modulesCount: 6,
        },
        {
          id: '5',
          title: 'Advanced Dosing Calibration',
          description: 'Deep dive into troubleshooting and optimizing doser performance',
          duration: 45,
          level: 'Advanced',
          category: 'Equipment Training',
          modulesCount: 8,
        },
        {
          id: '6',
          title: 'Understanding Fortification Standards',
          description: 'National and international standards for food fortification compliance',
          duration: 35,
          level: 'Intermediate',
          category: 'Quality Assurance',
          modulesCount: 7,
        },
      ]
      setCourses(mockCourses)
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCourses = courses.filter((course) => {
    const categoryMatch = filter.category === 'all' || course.category === filter.category
    const levelMatch = filter.level === 'all' || course.level === filter.level
    return categoryMatch && levelMatch
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-4 mb-4">
            <BookOpen className="h-12 w-12" />
            <div>
              <h1 className="text-4xl font-bold">Training Center</h1>
              <p className="text-blue-100 mt-2">
                Interactive courses, simulations, and certifications for fortification excellence
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/training/simulators"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <PlayCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Interactive Simulators
                </h3>
                <p className="text-sm text-gray-600">
                  Practice calibration and dosing calculations
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/training/animations"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Video className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Process Animations
                </h3>
                <p className="text-sm text-gray-600">
                  Visual guides for fortification processes
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/certificates"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Award className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  My Certificates
                </h3>
                <p className="text-sm text-gray-600">
                  View and download earned certificates
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={filter.category}
                onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="Process Training">Process Training</option>
                <option value="Equipment Training">Equipment Training</option>
                <option value="Quality Assurance">Quality Assurance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level
              </label>
              <select
                value={filter.level}
                onChange={(e) => setFilter({ ...filter, level: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>
        </div>

        {/* Course Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading courses...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <BookOpen className="h-20 w-20 text-white opacity-80" />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        course.level === 'Beginner'
                          ? 'bg-green-100 text-green-800'
                          : course.level === 'Intermediate'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {course.level}
                    </span>
                    <span className="text-xs text-gray-500">{course.category}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {course.description}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{course.duration} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{course.modulesCount} modules</span>
                    </div>
                  </div>
                  <Link
                    href={`/training/courses/${course.id}`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Start Course
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredCourses.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-600">No courses found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}
