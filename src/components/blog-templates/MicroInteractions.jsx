import React, { useRef, useState } from 'react'

// Animated Section Wrapper
export const AnimatedSection = ({ 
  children, 
  className = '', 
  animation = 'fadeIn',
  delay = 0
}) => {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  const animations = {
    fadeIn: 'transition-all duration-700 ease-out',
    slideInLeft: 'transition-all duration-700 ease-out',
    slideInRight: 'transition-all duration-700 ease-out',
    scaleIn: 'transition-all duration-700 ease-out'
  }

  const getAnimationClasses = () => {
    if (!isVisible) {
      switch (animation) {
        case 'fadeIn': return 'opacity-0'
        case 'slideInLeft': return 'opacity-0 -translate-x-12'
        case 'slideInRight': return 'opacity-0 translate-x-12'
        case 'scaleIn': return 'opacity-0 scale-95'
        default: return 'opacity-0'
      }
    }
    return 'opacity-100'
  }

  return (
    <div
      ref={ref}
      className={`${animations[animation]} ${getAnimationClasses()} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

// Hover Card with 3D Effect
export const HoverCard = ({ 
  children, 
  className = '' 
}) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={`${className} transition-all duration-300 transform ${
        isHovered ? 'scale-105 shadow-2xl' : 'shadow-lg'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  )
}

// Staggered List Animation
export const StaggeredList = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className="transition-all duration-500 ease-out opacity-0 translate-y-4"
          style={{ 
            animationDelay: `${index * 100}ms`,
            animation: 'fadeInUp 0.5s ease-out forwards'
          }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

// Loading Skeleton
export const LoadingSkeleton = ({ 
  className = '', 
  lines = 3 
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${
            index === 0 ? 'w-3/4' : index === 1 ? 'w-full' : 'w-5/6'
          }`}
        />
      ))}
    </div>
  )
}

// Floating Action Button
export const FloatingActionButton = ({ 
  children, 
  onClick, 
  className = '', 
  position = 'bottom-right' 
}) => {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  }

  return (
    <button
      className={`fixed z-50 p-4 bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 ${positionClasses[position]} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

// Progress Ring
export const ProgressRing = ({ 
  progress, 
  size = 120, 
  strokeWidth = 8, 
  className = '' 
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className={`inline-block relative ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-blue-500 transition-all duration-1000 ease-out"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  )
}

// Text Reveal Animation
export const TextReveal = ({ 
  children, 
  className = '', 
  direction = 'left' 
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  const getTransformClass = () => {
    if (!isVisible) {
      switch (direction) {
        case 'left': return '-translate-x-12'
        case 'right': return 'translate-x-12'
        case 'up': return '-translate-y-12'
        case 'down': return 'translate-y-12'
        default: return '-translate-x-12'
      }
    }
    return 'translate-x-0 translate-y-0'
  }

  return (
    <div
      ref={ref}
      className={`overflow-hidden transition-all duration-700 ease-out ${className}`}
    >
      <div
        className={`transition-all duration-700 ease-out ${
          isVisible ? 'opacity-100' : 'opacity-0'
        } ${getTransformClass()}`}
      >
        {children}
      </div>
    </div>
  )
}

// Main MicroInteractions component
export default function MicroInteractions({ children, className = '' }) {
  return (
    <div className={`micro-interactions ${className}`}>
      {children}
    </div>
  )
}
