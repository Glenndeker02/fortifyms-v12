'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, Info } from 'lucide-react'

type ProcessStep =
  | 'cleaning'
  | 'soaking'
  | 'steaming'
  | 'drying'
  | 'milling'
  | 'fortification'
  | 'mixing'
  | 'complete'

const PROCESS_STEPS = [
  {
    id: 'cleaning' as ProcessStep,
    name: 'Cleaning & Sorting',
    duration: 2000,
    description: 'Remove impurities, stones, and broken grains',
    temperature: '25°C',
    color: '#94a3b8',
  },
  {
    id: 'soaking' as ProcessStep,
    name: 'Soaking',
    duration: 3000,
    description: 'Soak rice in water to absorb moisture',
    temperature: '60-65°C',
    color: '#3b82f6',
  },
  {
    id: 'steaming' as ProcessStep,
    name: 'Steaming',
    duration: 3000,
    description: 'Gelatinize starch under pressure',
    temperature: '100-120°C',
    color: '#ef4444',
  },
  {
    id: 'drying' as ProcessStep,
    name: 'Drying',
    duration: 3000,
    description: 'Reduce moisture to safe storage levels',
    temperature: '50-60°C',
    color: '#f59e0b',
  },
  {
    id: 'milling' as ProcessStep,
    name: 'Milling',
    duration: 2000,
    description: 'Remove husk and polish grains',
    temperature: '25°C',
    color: '#84cc16',
  },
  {
    id: 'fortification' as ProcessStep,
    name: 'Fortification',
    duration: 3000,
    description: 'Apply fortified premix using doser',
    temperature: '25-30°C',
    color: '#8b5cf6',
  },
  {
    id: 'mixing' as ProcessStep,
    name: 'Mixing',
    duration: 2000,
    description: 'Blend for uniform distribution',
    temperature: '25°C',
    color: '#10b981',
  },
  {
    id: 'complete' as ProcessStep,
    name: 'Complete',
    duration: 1000,
    description: 'Ready for packaging',
    temperature: '25°C',
    color: '#059669',
  },
]

export default function RiceParboilingAnimation() {
  const [currentStep, setCurrentStep] = useState<ProcessStep>('cleaning')
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showInfo, setShowInfo] = useState(false)

  const currentStepData = PROCESS_STEPS.find((step) => step.id === currentStep)
  const currentStepIndex = PROCESS_STEPS.findIndex((step) => step.id === currentStep)

  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          const nextIndex = currentStepIndex + 1
          if (nextIndex < PROCESS_STEPS.length) {
            setCurrentStep(PROCESS_STEPS[nextIndex].id)
            return 0
          } else {
            setIsPlaying(false)
            return 100
          }
        }
        return prev + 2
      })
    }, currentStepData!.duration / 50)

    return () => clearInterval(interval)
  }, [isPlaying, currentStep, currentStepIndex, currentStepData])

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentStep('cleaning')
    setProgress(0)
  }

  const handleStepClick = (stepId: ProcessStep) => {
    setIsPlaying(false)
    setCurrentStep(stepId)
    setProgress(0)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Rice Parboiling Process Animation
          </h2>
          <p className="text-sm text-gray-600">
            Interactive visualization of fortified rice production
          </p>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <Info className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {showInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900">
            This animation demonstrates the complete parboiling and fortification process
            for rice. Each step is critical for ensuring proper nutrient retention and
            uniform fortification distribution.
          </p>
        </div>
      )}

      {/* Animation Canvas */}
      <div className="relative bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg p-8 mb-6 h-96 overflow-hidden">
        {/* Process Flow Visualization */}
        <div className="relative h-full flex items-center justify-center">
          <AnimatePresence mode="wait">
            {/* Cleaning Stage */}
            {currentStep === 'cleaning' && (
              <motion.div
                key="cleaning"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-center"
              >
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="mb-4"
                >
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ x: -100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.2 }}
                      className="inline-block w-8 h-8 bg-yellow-600 rounded-full m-1"
                    />
                  ))}
                </motion.div>
                <p className="text-lg font-semibold text-gray-700">
                  Cleaning & Sorting Raw Rice
                </p>
              </motion.div>
            )}

            {/* Soaking Stage */}
            {currentStep === 'soaking' && (
              <motion.div
                key="soaking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="relative w-64 h-48 mx-auto mb-4">
                  <motion.div
                    className="absolute inset-0 bg-blue-200 rounded-lg"
                    animate={{ scaleY: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-4 h-4 bg-yellow-600 rounded-full"
                      style={{
                        left: `${10 + (i % 5) * 50}px`,
                        top: `${50 + Math.floor(i / 5) * 40}px`,
                      }}
                      animate={{
                        y: [0, -5, 0],
                        rotate: [0, 10, -10, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </div>
                <p className="text-lg font-semibold text-gray-700">
                  Soaking in Hot Water
                </p>
                <p className="text-sm text-blue-600">60-65°C, 3-4 hours</p>
              </motion.div>
            )}

            {/* Steaming Stage */}
            {currentStep === 'steaming' && (
              <motion.div
                key="steaming"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="relative w-64 h-48 mx-auto mb-4">
                  <motion.div className="absolute inset-x-0 bottom-0 h-32 bg-red-400 rounded-lg" />
                  {[...Array(10)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-6 h-6 bg-white rounded-full opacity-70"
                      style={{
                        left: `${30 + (i % 4) * 60}px`,
                        bottom: '20px',
                      }}
                      animate={{
                        y: [-150, 0],
                        opacity: [0.7, 0],
                        scale: [0.5, 1.5],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: i * 0.3,
                      }}
                    />
                  ))}
                </div>
                <p className="text-lg font-semibold text-gray-700">
                  Pressure Steaming
                </p>
                <p className="text-sm text-red-600">100-120°C, 10-15 min</p>
              </motion.div>
            )}

            {/* Drying Stage */}
            {currentStep === 'drying' && (
              <motion.div
                key="drying"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="relative w-64 h-48 mx-auto mb-4">
                  {[...Array(25)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-3 h-3 bg-orange-400 rounded-full"
                      style={{
                        left: `${10 + (i % 5) * 50}px`,
                        top: `${20 + Math.floor(i / 5) * 35}px`,
                      }}
                      animate={{
                        scale: [1, 0.7, 1],
                        backgroundColor: ['#fb923c', '#f97316', '#fb923c'],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.05,
                      }}
                    />
                  ))}
                  <motion.div
                    className="absolute inset-0 border-4 border-orange-400 rounded-lg"
                    animate={{
                      borderColor: ['#fb923c', '#f97316', '#fb923c'],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <p className="text-lg font-semibold text-gray-700">Drying Process</p>
                <p className="text-sm text-orange-600">50-60°C, Moisture → 14%</p>
              </motion.div>
            )}

            {/* Milling Stage */}
            {currentStep === 'milling' && (
              <motion.div
                key="milling"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="relative w-64 h-48 mx-auto mb-4">
                  <motion.div
                    className="w-32 h-32 mx-auto bg-gray-700 rounded-full flex items-center justify-center"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    {[0, 90, 180, 270].map((deg) => (
                      <div
                        key={deg}
                        className="absolute w-24 h-2 bg-gray-900"
                        style={{ transform: `rotate(${deg}deg)` }}
                      />
                    ))}
                  </motion.div>
                  {[...Array(15)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-lime-500 rounded-full"
                      initial={{ x: 0, y: 80 }}
                      animate={{
                        x: [0, Math.random() * 200 - 100],
                        y: [80, 200],
                        opacity: [1, 0],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </div>
                <p className="text-lg font-semibold text-gray-700">Milling & Polishing</p>
              </motion.div>
            )}

            {/* Fortification Stage */}
            {currentStep === 'fortification' && (
              <motion.div
                key="fortification"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="relative w-64 h-48 mx-auto mb-4">
                  {/* Doser */}
                  <motion.div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-24 bg-purple-600 rounded-b-lg"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  {/* Premix droplets */}
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-3 h-3 bg-purple-400 rounded-full"
                      initial={{ x: '50%', y: 100 }}
                      animate={{
                        y: [100, 180],
                        opacity: [1, 0],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                  {/* Rice bed */}
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-yellow-100 rounded flex items-center justify-center overflow-hidden">
                    {[...Array(30)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="inline-block w-2 h-2 rounded-full mx-0.5"
                        style={{
                          backgroundColor:
                            Math.random() > 0.7 ? '#a78bfa' : '#fef08a',
                        }}
                        animate={{
                          x: [0, 5, -5, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.05,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-lg font-semibold text-gray-700">
                  Applying Premix
                </p>
                <p className="text-sm text-purple-600">Precise dosing via calibrated feeder</p>
              </motion.div>
            )}

            {/* Mixing Stage */}
            {currentStep === 'mixing' && (
              <motion.div
                key="mixing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="relative w-64 h-48 mx-auto mb-4">
                  <motion.div
                    className="w-48 h-48 mx-auto bg-gradient-to-br from-emerald-200 to-emerald-400 rounded-full flex items-center justify-center overflow-hidden"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  >
                    {[...Array(40)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            Math.random() > 0.5 ? '#fbbf24' : '#a78bfa',
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                          x: [0, Math.random() * 50 - 25],
                          y: [0, Math.random() * 50 - 25],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          repeatType: 'reverse',
                        }}
                      />
                    ))}
                  </motion.div>
                </div>
                <p className="text-lg font-semibold text-gray-700">Mixing</p>
                <p className="text-sm text-green-600">8-10 minutes for uniform distribution</p>
              </motion.div>
            )}

            {/* Complete Stage */}
            {currentStep === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                  className="text-6xl mb-4"
                >
                  ✓
                </motion.div>
                <p className="text-2xl font-bold text-green-600">Process Complete!</p>
                <p className="text-sm text-gray-600 mt-2">
                  Fortified rice ready for packaging
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress Indicator */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: currentStepData?.color }}
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Step Info Card */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: currentStepData?.color }}
          >
            {currentStepIndex + 1}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {currentStepData?.name}
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              {currentStepData?.description}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="font-medium">
                Temperature: {currentStepData?.temperature}
              </span>
              <span>•</span>
              <span>
                Step {currentStepIndex + 1} of {PROCESS_STEPS.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {isPlaying ? (
            <>
              <Pause className="h-5 w-5" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              Play
            </>
          )}
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="h-5 w-5" />
          Reset
        </button>
      </div>

      {/* Step Navigator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {PROCESS_STEPS.map((step, index) => (
          <button
            key={step.id}
            onClick={() => handleStepClick(step.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentStep === step.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{index + 1}</span>
              <span>{step.name}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
