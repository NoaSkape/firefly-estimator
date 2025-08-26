import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

const Timeline = ({ steps }) => {
  const [expandedStep, setExpandedStep] = useState(null)

  const toggleStep = (index) => {
    setExpandedStep(expandedStep === index ? null : index)
  }

  return (
    <div className="relative">
      {/* Desktop: Horizontal Timeline */}
      <div className="hidden lg:block">
        <div className="flex justify-between relative">
          {/* Connecting line */}
          <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
          
          {steps.map((step, index) => (
            <div key={index} className="flex-1 relative">
              {/* Step indicator */}
              <div className="relative z-10 flex flex-col items-center mb-6">
                <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                  {step.icon ? (
                    <step.icon className="w-6 h-6" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <div className="w-4 h-4 bg-yellow-500 transform rotate-45 -mt-2"></div>
              </div>
              
              {/* Content */}
              <div className="text-center px-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  {step.description}
                </p>
                {step.details && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-lg text-left">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {step.details}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: Vertical Timeline */}
      <div className="lg:hidden space-y-4">
        {steps.map((step, index) => (
          <div key={index} className="relative">
            {/* Connecting line for mobile */}
            {index < steps.length - 1 && (
              <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-300 dark:bg-gray-600"></div>
            )}
            
            <button
              onClick={() => toggleStep(index)}
              className="w-full flex items-start space-x-4 p-4 bg-white dark:bg-gray-800/60 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200"
              aria-expanded={expandedStep === index}
            >
              {/* Step indicator */}
              <div className="flex-shrink-0 w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
                {step.icon ? (
                  <step.icon className="w-6 h-6" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {step.title}
                  </h3>
                  {expandedStep === index ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                  {step.description}
                </p>
              </div>
            </button>
            
            {/* Expanded details */}
            {expandedStep === index && step.details && (
              <div className="ml-16 mt-2 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {step.details}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Timeline
