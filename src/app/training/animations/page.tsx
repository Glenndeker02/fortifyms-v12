'use client'

import { useState } from 'react'
import RiceParboilingAnimation from '@/components/animations/RiceParboilingAnimation'
import MaizeFortificationAnimation from '@/components/animations/MaizeFortificationAnimation'
import { Film, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type AnimationType = 'rice' | 'maize'

export default function AnimationsPage() {
  const [selectedAnimation, setSelectedAnimation] = useState<AnimationType>('rice')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/training"
            className="inline-flex items-center gap-2 text-white hover:text-purple-100 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Training Center
          </Link>
          <div className="flex items-center gap-4">
            <Film className="h-10 w-10" />
            <div>
              <h1 className="text-3xl font-bold">Process Flow Animations</h1>
              <p className="text-purple-100 mt-1">
                Interactive visualizations of fortification processes
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Animation Selector */}
        <div className="bg-white rounded-lg shadow p-4 mb-8">
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedAnimation('rice')}
              className={`flex-1 px-6 py-4 rounded-lg font-medium transition-all ${
                selectedAnimation === 'rice'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">🌾</span>
                <div className="text-left">
                  <div className="font-bold">Rice Parboiling</div>
                  <div className="text-xs opacity-80">
                    Complete parboiling and fortification process
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedAnimation('maize')}
              className={`flex-1 px-6 py-4 rounded-lg font-medium transition-all ${
                selectedAnimation === 'maize'
                  ? 'bg-amber-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">🌽</span>
                <div className="text-left">
                  <div className="font-bold">Maize Fortification</div>
                  <div className="text-xs opacity-80">
                    Dry milling and fortification workflow
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Animation Display */}
        <div className="mb-8">
          {selectedAnimation === 'rice' ? (
            <RiceParboilingAnimation />
          ) : (
            <MaizeFortificationAnimation />
          )}
        </div>

        {/* Educational Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Learning Objectives
            </h3>
            {selectedAnimation === 'rice' ? (
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>
                    Understand the importance of each stage in rice parboiling
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>
                    Learn optimal temperature and timing parameters
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>
                    Identify critical control points for fortification
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>
                    Master the premix application and mixing process
                  </span>
                </li>
              </ul>
            ) : (
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>
                    Understand the dry milling process for maize flour
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>
                    Learn about moisture conditioning and its importance
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>
                    Master premix dosing for uniform fortification
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>
                    Understand quality grading and packaging requirements
                  </span>
                </li>
              </ul>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Key Takeaways
            </h3>
            {selectedAnimation === 'rice' ? (
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">1.</span>
                  <span>
                    <strong>Soaking:</strong> 60-65°C for 3-4 hours enables nutrient
                    migration to the endosperm
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">2.</span>
                  <span>
                    <strong>Steaming:</strong> 100-120°C pressure steaming gelatinizes
                    starch for better retention
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">3.</span>
                  <span>
                    <strong>Fortification:</strong> Premix must be applied uniformly
                    using calibrated doser
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">4.</span>
                  <span>
                    <strong>Mixing:</strong> Minimum 8-10 minutes ensures uniform
                    distribution
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-amber-600">1.</span>
                  <span>
                    <strong>Cleaning:</strong> Remove all foreign materials before
                    processing
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-amber-600">2.</span>
                  <span>
                    <strong>Conditioning:</strong> Moisture addition toughens bran for
                    efficient milling
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-amber-600">3.</span>
                  <span>
                    <strong>Sifting:</strong> Particle size separation ensures quality
                    grading
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-amber-600">4.</span>
                  <span>
                    <strong>Blending:</strong> Thorough mixing prevents nutrient
                    segregation
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-2">Ready to Practice?</h3>
          <p className="text-blue-100 mb-6">
            Test your knowledge with our interactive simulators and calculators
          </p>
          <Link
            href="/training/simulators"
            className="inline-block px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
          >
            Try Simulators Now
          </Link>
        </div>
      </div>
    </div>
  )
}
