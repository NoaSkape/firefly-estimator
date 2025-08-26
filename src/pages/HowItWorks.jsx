import { Helmet } from 'react-helmet-async'
import { useState, useEffect, useRef } from 'react'
import { ChevronDownIcon, CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { 
  HomeIcon, 
  PaintBrushIcon, 
  UserIcon, 
  MapPinIcon, 
  DocumentTextIcon, 
  CreditCardIcon, 
  PencilSquareIcon,
  CheckBadgeIcon,
  BuildingOffice2Icon,
  TruckIcon,
  WrenchScrewdriverIcon,
  KeyIcon,
  ClockIcon,
  ShieldCheckIcon,
  PhoneIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/solid'

export default function HowItWorks() {
  const [currentStep, setCurrentStep] = useState(0)
  const [expandedStep, setExpandedStep] = useState(null)
  const [expandedMilestone, setExpandedMilestone] = useState(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [isVisible, setIsVisible] = useState({})
  const heroRef = useRef(null)
  const stepsRef = useRef(null)
  
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = (scrollTop / docHeight) * 100
      setScrollProgress(progress)
      
      // Update current step based on scroll position
      if (stepsRef.current) {
        const stepsRect = stepsRef.current.getBoundingClientRect()
        const stepsTop = stepsRect.top + scrollTop
        const stepsHeight = stepsRect.height
        const relativeScroll = Math.max(0, scrollTop - stepsTop)
        const stepProgress = Math.min(relativeScroll / stepsHeight, 1)
        setCurrentStep(Math.floor(stepProgress * 8))
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible(prev => ({
            ...prev,
            [entry.target.id]: true
          }))
        }
      })
    }, observerOptions)

    document.querySelectorAll('[data-animate]').forEach((el) => {
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const steps = [
    {
      number: 1,
      title: "Choose Your Home",
      icon: HomeIcon,
      description: "Browse high-quality photos, 3D floorplans, and specifications for each model.",
      details: "Compare layouts and pick the base model that fits your lifestyle. Large hero image + floorplan thumbnails create an immersive shopping experience.",
      tip: "Save time by narrowing your search using filters (price, size, bedrooms).",
      tooltip: "All models include detailed specifications and virtual tours"
    },
    {
      number: 2,
      title: "Customize",
      icon: PaintBrushIcon,
      description: "Add upgrades like porches, kitchens, lofts, or premium finishes.",
      details: "Every option comes with plain-English explanations so you know exactly what you're choosing. Visual toggles and hover tooltips make customization interactive and fun.",
      tip: "Use the 3D preview to see how upgrades change your home's appearance.",
      tooltip: "Customize everything from flooring to appliances with real-time pricing"
    },
    {
      number: 3,
      title: "Sign In",
      icon: UserIcon,
      description: "Create your secure account in seconds.",
      details: "Your design is saved automatically so you can return anytime. Account dashboard displays your saved designs and purchase progress.",
      tip: "Save multiple designs to compare different configurations.",
      tooltip: "Your account keeps all your designs safe and accessible"
    },
    {
      number: 4,
      title: "Delivery Address",
      icon: MapPinIcon,
      description: "Enter your delivery details so we can provide an accurate quote.",
      details: "Interactive map ensures addresses are validated in real time. Transparent freight disclosures mean no surprise charges later.",
      tip: "Have your exact delivery coordinates ready for the most accurate quote.",
      tooltip: "We calculate precise delivery costs based on your location"
    },
    {
      number: 5,
      title: "Overview",
      icon: DocumentTextIcon,
      description: "See a clean, itemized summary: base price, options, title fee, delivery, and setup.",
      details: "Adjust selections instantly before moving forward. Accordion-style breakdown keeps info tidy but expandable.",
      tip: "Review all costs carefully - what you see is what you pay.",
      tooltip: "No hidden fees - every cost is clearly itemized"
    },
    {
      number: 6,
      title: "Payment Method",
      icon: CreditCardIcon,
      description: "Choose between Cash/ACH or Financing.",
      details: "If financing, our waterfall system connects you to multiple lenders for the best chance at approval. Secure checkout uses trusted payment rails for peace of mind.",
      tip: "Financing options include terms up to 20 years with competitive rates.",
      tooltip: "Multiple financing partners ensure you get the best available rate"
    },
    {
      number: 7,
      title: "Contract",
      icon: PencilSquareIcon,
      description: "Review and sign all documents digitally with legally binding e-signatures.",
      details: "You'll see disclosures, warranty info, and payment terms clearly presented. Progress bar + checkmarks make it easy to track your place.",
      tip: "Take time to read the warranty terms - they're comprehensive.",
      tooltip: "DocuSeal provides secure, legally binding electronic signatures"
    },
    {
      number: 8,
      title: "Confirmation",
      icon: CheckBadgeIcon,
      description: "Congratulations—you're officially a tiny homeowner!",
      details: "Instantly receive a digital confirmation packet with receipts, signed agreements, and next steps. A Firefly team member will call to personally confirm and schedule your factory order.",
      tip: "Keep your confirmation packet - it contains important contact information.",
      tooltip: "Your personal Firefly representative will guide you through the build process"
    }
  ]

  const milestones = [
    {
      icon: BuildingOffice2Icon,
      title: "Factory Build",
      description: "Your home is placed in the production schedule.",
      details: "Experienced craftsmen build your model to the exact specifications you selected. You'll receive progress updates and estimated completion timelines.",
      timeline: "4-8 weeks"
    },
    {
      icon: TruckIcon,
      title: "Delivery & Site Prep",
      description: "Delivery is coordinated based on your site readiness.",
      details: "You'll need to ensure a clear access path, proper permits, and a prepared pad/foundation. Firefly handles the logistics and routing, while keeping you informed of ETA and costs.",
      timeline: "1-2 weeks"
    },
    {
      icon: WrenchScrewdriverIcon,
      title: "Setup & Leveling",
      description: "On-site, your home is carefully placed and leveled.",
      details: "Setup includes connection to utilities and stabilization. You will need to provide safe steps or decking for the entry door at the time of setup.",
      timeline: "1-2 days"
    },
    {
      icon: KeyIcon,
      title: "Move-In Ready",
      description: "Final walkthrough + punch list ensures your home is exactly as expected.",
      details: "Manufacturer warranty kicks in from day one. All that's left is for you to move in and start living tiny!",
      timeline: "Same day"
    }
  ]

  const benefits = [
    {
      icon: ClockIcon,
      title: "Fast & Simple",
      description: "Order a home in under an hour."
    },
    {
      icon: ShieldCheckIcon,
      title: "Transparent Pricing",
      description: "No hidden fees, no surprises."
    },
    {
      icon: PhoneIcon,
      title: "Human Support",
      description: "Always a live team member just a call away."
    },
    {
      icon: ComputerDesktopIcon,
      title: "Fully Digital",
      description: "Modern, streamlined, and secure from start to finish."
    }
  ]

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <Helmet>
        <title>How It Works | Firefly Tiny Homes – Buy Your Dream Tiny House Online</title>
        <meta name="description" content="Firefly Tiny Homes makes it easy to buy your dream park model or tiny home online. Complete our 8-step process in under an hour with full transparency, live support, and fast delivery." />
        <meta name="keywords" content="buy a tiny home online, tiny home dealership, transparent tiny home pricing, how to buy a tiny house in Texas" />
      </Helmet>

      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200">
        <div 
          className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-300"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Hero Section */}
      <section 
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden"
      >
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img 
            src="/hero/tiny-home-dusk.png" 
            alt="Tiny home at sunset" 
            className="w-full h-full object-cover opacity-30"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/50 to-gray-900/30" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            How It Works
          </h1>
          <p className="text-xl sm:text-2xl text-gray-200 mb-8 max-w-3xl mx-auto leading-relaxed">
            Order your dream tiny home in under an hour from the comfort of your phone or computer.
          </p>
          
          {/* Scroll Indicator */}
          <button
            onClick={() => scrollToSection('process')}
            className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/20 backdrop-blur-sm border border-yellow-400/30 text-yellow-400 hover:bg-yellow-500/30 transition-all duration-300 animate-bounce"
            aria-label="Scroll to process"
          >
            <ChevronDownIcon className="w-6 h-6" />
          </button>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            Becoming a tiny homeowner has never been easier
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            At Firefly, you can shop, customize, and secure your new home in under an hour—all from the comfort of your phone or computer. Follow our simple 8-step process, then sit back while your home is built at the factory and delivered to your property.
          </p>
        </div>
      </section>

      {/* 8-Step Process */}
      <section id="process" ref={stepsRef} className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              The Firefly 8-Step Process
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              We designed our online experience to be clear, fast, and stress-free. Each step is visual, interactive, and only takes a few minutes. Within about an hour, you'll have a tiny home officially on order.
            </p>
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {steps.map((step, index) => {
              const IconComponent = step.icon
              const isActive = currentStep >= index
              const isExpanded = expandedStep === index

              return (
                <div
                  key={step.number}
                  id={`step-${index}`}
                  data-animate
                  className={`
                    relative bg-white rounded-2xl shadow-lg border transition-all duration-500 cursor-pointer group
                    ${isActive ? 'border-yellow-400 shadow-yellow-100' : 'border-gray-200 hover:border-gray-300'}
                    ${isVisible[`step-${index}`] ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
                  `}
                  style={{ transitionDelay: `${index * 100}ms` }}
                  onClick={() => setExpandedStep(isExpanded ? null : index)}
                >
                  {/* Step Number Badge */}
                  <div className={`
                    absolute -top-4 left-6 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${isActive ? 'bg-yellow-500 text-white' : 'bg-gray-300 text-gray-600'}
                    transition-all duration-300 group-hover:scale-110
                  `}>
                    {step.number}
                  </div>

                  <div className="p-6">
                    {/* Icon */}
                    <div className={`
                      w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-all duration-300
                      ${isActive ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'}
                      group-hover:scale-110
                    `}>
                      <IconComponent className="w-6 h-6" />
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-yellow-600 transition-colors">
                      {step.title}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      {step.description}
                    </p>

                    {/* Tooltip Button */}
                    <div className="relative">
                      <button className="text-sm text-yellow-600 hover:text-yellow-700 font-medium flex items-center">
                        Learn more
                        <ChevronDownIcon className={`w-4 h-4 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* Expanded Details */}
                    <div className={`
                      overflow-hidden transition-all duration-300
                      ${isExpanded ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'}
                    `}>
                      <div className="border-t pt-4 space-y-3">
                        <p className="text-sm text-gray-600">{step.details}</p>
                        {step.tip && (
                          <div className="bg-yellow-50 rounded-lg p-3">
                            <p className="text-sm text-yellow-800">
                              <strong>💡 Pro Tip:</strong> {step.tip}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* After Your Order Timeline */}
      <section id="timeline" className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              After Your Order
            </h2>
            <p className="text-lg text-gray-600">
              Once you've completed the 8 steps, here's what happens next:
            </p>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-gray-200" />
            
            {milestones.map((milestone, index) => {
              const IconComponent = milestone.icon
              const isExpanded = expandedMilestone === index

              return (
                <div
                  key={index}
                  id={`milestone-${index}`}
                  data-animate
                  className={`
                    relative flex items-start mb-12 cursor-pointer group
                    ${isVisible[`milestone-${index}`] ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}
                  `}
                  style={{ transitionDelay: `${index * 200}ms` }}
                  onClick={() => setExpandedMilestone(isExpanded ? null : index)}
                >
                  {/* Icon Circle */}
                  <div className="relative z-10 flex items-center justify-center w-16 h-16 bg-yellow-500 rounded-full shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <div className="ml-8 flex-1 bg-white rounded-xl shadow-lg border border-gray-200 group-hover:shadow-xl transition-all duration-300">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-yellow-600 transition-colors">
                          {milestone.title}
                        </h3>
                        <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          {milestone.timeline}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-4">{milestone.description}</p>
                      
                      <button className="text-sm text-yellow-600 hover:text-yellow-700 font-medium flex items-center">
                        More details
                        <ChevronDownIcon className={`w-4 h-4 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Expanded Details */}
                      <div className={`
                        overflow-hidden transition-all duration-300
                        ${isExpanded ? 'max-h-32 opacity-100 mt-4' : 'max-h-0 opacity-0'}
                      `}>
                        <div className="border-t pt-4">
                          <p className="text-sm text-gray-600">{milestone.details}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Why Firefly Is Different */}
      <section id="benefits" className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              Why Firefly Is Different
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => {
              const IconComponent = benefit.icon
              
              return (
                <div
                  key={index}
                  id={`benefit-${index}`}
                  data-animate
                  className={`
                    bg-white rounded-2xl p-8 text-center shadow-lg border border-gray-200 
                    hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group
                    ${isVisible[`benefit-${index}`] ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
                  `}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-yellow-200 transition-colors">
                    <IconComponent className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-yellow-600 transition-colors">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="cta" className="py-16 sm:py-20 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Begin?
          </h2>
          <p className="text-xl text-yellow-100 mb-8 max-w-2xl mx-auto">
            Your dream tiny home is just a few clicks away. Start customizing today and be on your way to ownership within an hour.
          </p>
          
          <a
            href="/models"
            className="inline-flex items-center px-8 py-4 text-lg font-semibold text-yellow-600 bg-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group"
          >
            Start Your Journey Now
            <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </section>

      {/* Sticky CTA Bar (Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
        <div className="bg-yellow-500 px-4 py-3 shadow-lg">
          <a
            href="/models"
            className="flex items-center justify-center w-full text-white font-semibold text-lg"
          >
            Start Your Journey Now
            <ArrowRightIcon className="w-5 h-5 ml-2" />
          </a>
        </div>
      </div>

      {/* Legal Disclaimer */}
      <div className="bg-gray-800 py-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-400">
            All prices and delivery estimates subject to change at manufacturer discretion. See contracts for full terms.
          </p>
        </div>
      </div>
    </>
  )
}
