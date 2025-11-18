'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, Info } from 'lucide-react'

type ProcessStep =
  | 'receiving'
  | 'cleaning'
  | 'conditioning'
  | 'milling'
  | 'sifting'
  | 'fortification'
  | 'blending'
  | 'packaging'

const PROCESS_STEPS = [
  {
    id: 'receiving' as ProcessStep,
    name: 'Receiving & Inspection',
    duration: 2000,
    description: 'Quality check of raw maize kernels',
    color: '#f59e0b',
  },
  {
    id: 'cleaning' as ProcessStep,
    name: 'Cleaning',
    duration: 2000,
    description: 'Remove foreign materials and impurities',
    color: '#94a3b8',
  },
  {
    id: 'conditioning' as ProcessStep,
    name: 'Conditioning',
    duration: 3000,
    description: 'Add moisture to toughen bran',
    color: '#3b82f6',
  },
  {
    id: 'milling' as ProcessStep,
    name: 'Milling',
    duration: 3000,
    description: 'Grind maize into flour',
    color: '#ef4444',
  },
  {
    id: 'sifting' as ProcessStep,
    name: 'Sifting',
    duration: 2000,
    description: 'Separate flour by particle size',
    color: '#84cc16',
  },
  {
    id: 'fortification' as ProcessStep,
    name: 'Fortification',
    duration: 3000,
    description: 'Add nutrient premix',
    color: '#8b5cf6',
  },
  {
    id: 'blending' as ProcessStep,
    name: 'Blending',
    duration: 3000,
    description: 'Mix for uniform distribution',
    color: '#10b981',
  },
  {
    id: 'packaging' as ProcessStep,
    name: 'Packaging',
    duration: 2000,
    description: 'Package fortified flour',
    color: '#06b6d4',
  },
]

export default function MaizeFortificationAnimation() {
  const [currentStep, setCurrentStep] = useState<ProcessStep>('receiving')
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
    setCurrentStep('receiving')
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
            Maize Fortification Process Animation
          </h2>
          <p className="text-sm text-gray-600">
            Interactive visualization of fortified maize flour production
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
            This animation demonstrates the dry milling and fortification process for
            maize flour. Each step ensures optimal flour quality and uniform nutrient
            distribution critical for public health impact.
          </p>
        </div>
      )}

      {/* Animation Canvas */}
      <div className="relative bg-gradient-to-b from-amber-50 to-yellow-50 rounded-lg p-8 mb-6 h-96 overflow-hidden">
        <div className="relative h-full flex items-center justify-center">
          <AnimatePresence mode="wait">
            {/* Receiving Stage */}
            {currentStep === 'receiving' && (
              <motion.div
                key="receiving"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                className="text-center"
              >
                <div className="relative w-64 h-48 mx-auto mb-4">
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ x: -100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="inline-block w-12 h-16 bg-gradient-to-b from-yellow-500 to-yellow-600 rounded-lg m-2"
                      style={{
                        transform: `rotate(${Math.random() * 10 - 5}deg)`,
                      }}
                    />
                  ))}
                </div>
                <p className="text-lg font-semibold text-gray-700">
                  Receiving Raw Maize
                </p>
                <p className="text-sm text-amber-600">Quality inspection & moisture check</p>
              </motion.div>
            )}

            {/* Cleaning Stage */}
            {currentStep === 'cleaning' && (
              <motion.div
                key="cleaning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="relative w-64 h-48 mx-auto mb-4">
                  <motion.div
                    className="absolute inset-0 flex flex-col justify-between"
                    animate={{ x: [0, 10, -10, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-8 h-8 rounded-full mx-auto"
                        style={{
                          backgroundColor:
                            Math.random() > 0.7 ? '#78716c' : '#fbbf24',
                        }}
                        animate={{
                          x: Math.random() > 0.7 ? [-200, 0] : [0, 200],
                          opacity: Math.random() > 0.7 ? [1, 0] : [1, 1],
                        }}
                        transition={{
                          duration: 2,
                          delay: i * 0.1,
                          repeat: Infinity,
                        }}
                      />
                    ))}
                  </motion.div>
                </div>
                <p className="text-lg font-semibold text-gray-700">
                  Cleaning & Screening
                </p>
                <p className="text-sm text-gray-600">Removing stones, dirt, and debris</p>
              </motion.div>
            )}

            {/* Conditioning Stage */}
            {currentStep === 'conditioning' && (
              <motion.div
                key="conditioning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="relative w-64 h-48 mx-auto mb-4">
                  <motion.div className="absolute inset-0">
                    {[...Array(15)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-8 bg-blue-400 rounded-full"
                        style={{
                          left: `${10 + (i % 5) * 50}px`,
                          top: 0,
                        }}
                        animate={{
                          y: [0, 180],
                          opacity: [0.7, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </motion.div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-yellow-400 rounded-lg overflow-hidden">
                    {[...Array(30)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="inline-block w-4 h-4 bg-yellow-500 rounded-sm m-0.5"
                        animate={{
                          backgroundColor: ['#facc15', '#eab308', '#facc15'],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.05,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-lg font-semibold text-gray-700">
                  Moisture Conditioning
                </p>
                <p className="text-sm text-blue-600">Adding water to optimize milling</p>
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
                    className="w-40 h-40 mx-auto bg-red-600 rounded-full flex items-center justify-center"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                      <div
                        key={deg}
                        className="absolute w-28 h-3 bg-red-800 rounded-full"
                        style={{ transform: `rotate(${deg}deg)` }}
                      />
                    ))}
                  </motion.div>
                  {/* Ground flour particles */}
                  {[...Array(30)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-yellow-200 rounded-full"
                      style={{
                        left: '50%',
                        top: '50%',
                      }}
                      animate={{
                        x: [0, (Math.random() - 0.5) * 200],
                        y: [0, (Math.random() - 0.5) * 200],
                        opacity: [1, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.05,
                      }}
                    />
                  ))}
                </div>
                <p className="text-lg font-semibold text-gray-700">Milling Process</p>
                <p className="text-sm text-red-600">Grinding maize into fine flour</p>
              </motion.div>
            )}

            {/* Sifting Stage */}
            {currentStep === 'sifting' && (
              <motion.div
                key="sifting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="relative w-64 h-48 mx-auto mb-4">
                  {/* Sifter */}
                  <motion.div
                    className="absolute top-8 left-1/2 -translate-x-1/2 w-48 h-2 bg-gray-600 rounded"
                    animate={{ x: [-20, 20] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      repeatType: 'reverse',
                    }}
                  />
                  {/* Particles falling through sifter */}
                  {[...Array(40)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 rounded-full"
                      style={{
                        backgroundColor:
                          Math.random() > 0.3 ? '#fef08a' : '#d97706',
                        left: `${30 + Math.random() * 140}px`,
                        top: '40px',
                      }}
                      animate={{
                        y: [0, Math.random() > 0.3 ? 100 : 160],
                        opacity: [1, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.05,
                      }}
                    />
                  ))}
                  {/* Collection bins */}
                  <div className="absolute bottom-0 left-8 w-20 h-16 bg-yellow-100 rounded border-2 border-yellow-400" />
                  <div className="absolute bottom-0 right-8 w-20 h-24 bg-yellow-200 rounded border-2 border-yellow-500" />
                </div>
                <p className="text-lg font-semibold text-gray-700">Sifting & Grading</p>
                <p className="text-sm text-lime-600">
                  Separating flour by particle size
                </p>
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
                  {/* Doser/Feeder */}
                  <motion.div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-28 bg-purple-600 rounded-b-xl"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <div className="absolute bottom-0 w-full h-4 bg-purple-700 rounded-b-xl" />
                  </motion.div>

                  {/* Premix being added */}
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-6 bg-purple-400 rounded-full"
                      style={{ left: '50%' }}
                      initial={{ y: 110 }}
                      animate={{
                        y: [110, 170],
                        opacity: [1, 0.3],
                      }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                    />
                  ))}

                  {/* Flour conveyor */}
                  <motion.div
                    className="absolute bottom-8 left-0 right-0 h-20 bg-gradient-to-r from-yellow-200 via-yellow-100 to-yellow-200 rounded-lg overflow-hidden"
                    animate={{ backgroundPosition: ['0% 0%', '100% 0%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    {[...Array(50)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 rounded-full"
                        style={{
                          backgroundColor:
                            Math.random() > 0.8 ? '#a78bfa' : '#fde047',
                          left: `${i * 5}%`,
                          top: `${30 + Math.random() * 40}%`,
                        }}
                      />
                    ))}
                  </motion.div>
                </div>
                <p className="text-lg font-semibold text-gray-700">
                  Adding Premix
                </p>
                <p className="text-sm text-purple-600">
                  Precise dosing of nutrient premix
                </p>
              </motion.div>
            )}

            {/* Blending Stage */}
            {currentStep === 'blending' && (
              <motion.div
                key="blending"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="relative w-64 h-48 mx-auto mb-4">
                  <motion.div
                    className="w-56 h-56 mx-auto bg-gradient-to-br from-green-200 via-yellow-100 to-purple-200 rounded-xl flex items-center justify-center overflow-hidden"
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  >
                    {/* Mixing paddles */}
                    {[0, 90].map((deg) => (
                      <div
                        key={deg}
                        className="absolute w-48 h-4 bg-gray-600 rounded-full"
                        style={{ transform: `rotate(${deg}deg)` }}
                      />
                    ))}

                    {/* Flour particles mixing */}
                    {[...Array(60)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            Math.random() > 0.7 ? '#a78bfa' : '#fde047',
                          left: `${20 + Math.random() * 60}%`,
                          top: `${20 + Math.random() * 60}%`,
                        }}
                        animate={{
                          x: [0, (Math.random() - 0.5) * 100],
                          y: [0, (Math.random() - 0.5) * 100],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          repeatType: 'reverse',
                          delay: i * 0.02,
                        }}
                      />
                    ))}
                  </motion.div>
                </div>
                <p className="text-lg font-semibold text-gray-700">Blending</p>
                <p className="text-sm text-green-600">
                  Mixing for uniform nutrient distribution
                </p>
              </motion.div>
            )}

            {/* Packaging Stage */}
            {currentStep === 'packaging' && (
              <motion.div
                key="packaging"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="relative w-64 h-48 mx-auto mb-4 flex items-center justify-center gap-4">
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: -100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: i * 0.3 }}
                      className="w-16 h-24 bg-gradient-to-b from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg"
                    >
                      {(i + 1) * 25}kg
                    </motion.div>
                  ))}
                </div>
                <p className="text-lg font-semibold text-gray-700">Packaging</p>
                <p className="text-sm text-cyan-600">
                  Sealed and labeled fortified flour
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress Bar */}
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
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-4 mb-6">
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
          className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
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
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{index + 1}</span>
              <span className="whitespace-nowrap">{step.name}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
