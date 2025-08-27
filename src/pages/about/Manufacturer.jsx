import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useUser } from '@clerk/clerk-react'
import { canEditModelsClient } from '../../lib/canEditModels'
import { 
  BuildingOfficeIcon,
  HomeIcon,
  CheckBadgeIcon,
  BoltIcon,
  ShieldCheckIcon,
  CogIcon,
  TruckIcon,
  DocumentCheckIcon,
  ClipboardDocumentCheckIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline'

import HeroHeader from '../../components/HeroHeader'
import FeatureGrid from '../../components/FeatureGrid'
import Timeline from '../../components/Timeline'
import AdminPageEditor from '../../components/AdminPageEditor'

const Manufacturer = () => {
  const { user } = useUser()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [pageContent, setPageContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showStickyDTA, setShowStickyCTA] = useState(false)

  useEffect(() => {
    const checkAdminStatus = () => {
      if (user) {
        const adminStatus = canEditModelsClient(user)
        setIsAdmin(adminStatus)
      } else {
        setIsAdmin(false)
      }
    }
    checkAdminStatus()
  }, [user])

  useEffect(() => {
    loadPageContent()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY / window.innerHeight
      setShowStickyCTA(scrolled > 0.3)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const loadPageContent = async () => {
    try {
      const response = await fetch('/api/pages/about-manufacturer')
      if (response.ok) {
        const data = await response.json()
        setPageContent(data)
      } else {
        // Fallback to default content
        setPageContent({
          pageId: 'about-manufacturer',
          content: {
            hero: {
              title: 'About the Manufacturer: Champion Homes — Athens Park Model Homes',
              subtitle: 'Park model tiny homes built with precision in modern, climate-controlled factories—certified, comfortable, and made to last.'
            },
            overview: {
              title: 'Who Builds Our Park Model Tiny Homes?',
              content: 'Champion Homes is one of America\'s most established factory-home builders, and their Athens Park Model Homes division focuses specifically on park model RVs (often called "park model tiny homes"). Athens Park blends residential-grade materials, tight factory quality controls, and modern design to deliver small homes that live big—year after year.'
            },
            quality: {
              title: 'Inside the Factory: How Athens Park Models Are Built',
              content: 'Athens Park models are assembled on steel chassis in a controlled production line. Walls, floors, and roofs are framed square with jigs, fastened to spec, insulated, sheathed, and finished to residential standards. Building indoors keeps materials dry and allows stringent quality checks at each station. Plumbing and electrical are tested before the home leaves the plant.'
            },
            certifications: {
              title: 'Certified for Safety, Placement, and Peace of Mind',
              content: 'Park models from Athens Park are built to the ANSI A119.5 park model RV standard—a nationally recognized safety and construction code for this category. Translation: electrical, plumbing, fire safety, egress, and structure are held to a clear benchmark.'
            },
            benefits: {
              title: 'Real-World Benefits You\'ll Feel',
              content: 'Certifications + labeling make it easier to place your unit in compliant locations and arrange financing/insurance. Full-size appliances, real bathrooms, and smart storage mean no daily compromises. Factory checks at every stage + a manufacturer warranty give long-term peace of mind.'
            },
            partnership: {
              title: 'Why We Partner with Champion',
              content: 'We chose Champion\'s Athens Park division because their process quality, materials, and design options consistently deliver the best value to our customers. Firefly\'s role is to guide your selection, lock your build spec, and coordinate documents, payment, and delivery.'
            }
          },
          images: []
        })
      }
    } catch (error) {
      console.error('Failed to load page content:', error)
      // Fallback to default content
      setPageContent({
        pageId: 'about-manufacturer',
        content: {
          hero: {
            title: 'About the Manufacturer: Champion Homes — Athens Park Model Homes',
            subtitle: 'Park model tiny homes built with precision in modern, climate-controlled factories—certified, comfortable, and made to last.'
          },
          overview: {
            title: 'Who Builds Our Park Model Tiny Homes?',
            content: 'Champion Homes is one of America\'s most established factory-home builders, and their Athens Park Model Homes division focuses specifically on park model RVs (often called "park model tiny homes"). Athens Park blends residential-grade materials, tight factory quality controls, and modern design to deliver small homes that live big—year after year.'
          },
          quality: {
            title: 'Inside the Factory: How Athens Park Models Are Built',
            content: 'Athens Park models are assembled on steel chassis in a controlled production line. Walls, floors, and roofs are framed square with jigs, fastened to spec, insulated, sheathed, and finished to residential standards. Building indoors keeps materials dry and allows stringent quality checks at each station. Plumbing and electrical are tested before the home leaves the plant.'
          },
          certifications: {
            title: 'Certified for Safety, Placement, and Peace of Mind',
            content: 'Park models from Athens Park are built to the ANSI A119.5 park model RV standard—a nationally recognized safety and construction code for this category. Translation: electrical, plumbing, fire safety, egress, and structure are held to a clear benchmark.'
          },
          benefits: {
            title: 'Real-World Benefits You\'ll Feel',
            content: 'Certifications + labeling make it easier to place your unit in compliant locations and arrange financing/insurance. Full-size appliances, real bathrooms, and smart storage mean no daily compromises. Factory checks at every stage + a manufacturer warranty give long-term peace of mind.'
          },
          partnership: {
            title: 'Why We Partner with Champion',
            content: 'We chose Champion\'s Athens Park division because their process quality, materials, and design options consistently deliver the best value to our customers. Firefly\'s role is to guide your selection, lock your build spec, and coordinate documents, payment, and delivery.'
          }
        },
        images: []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleContentSaved = (updatedContent) => {
    setPageContent(updatedContent)
  }

  // Trust bar items
  const trustItems = [
    { icon: CheckBadgeIcon, label: 'ANSI A119.5', tooltip: 'Built to national park model RV safety and construction standards' },
    { icon: ShieldCheckIcon, label: 'RVIA', tooltip: 'Recreation Vehicle Industry Association certified' },
    { icon: BuildingOfficeIcon, label: 'Factory-Built Quality', tooltip: 'Precision construction in climate-controlled facilities' },
    { icon: DocumentCheckIcon, label: 'Warranty-Backed', tooltip: 'Manufacturer limited warranty coverage' }
  ]

  // Overview features
  const overviewFeatures = [
    {
      icon: BuildingOfficeIcon,
      title: 'Built Indoors, Built Right',
      description: 'Precision construction inside a climate-controlled facility for consistent quality.'
    },
    {
      icon: HomeIcon,
      title: 'Residential Feel',
      description: 'Full-size kitchens, real bathrooms, high ceilings, smart storage, optional lofts.'
    },
    {
      icon: CheckBadgeIcon,
      title: 'Certified & Financeable',
      description: 'Built to the park model RV standard (ANSI A119.5) and labeled for RVIA compliance, making placement, financing, and insurance simpler.'
    },
    {
      icon: BoltIcon,
      title: 'Energy-Smart Options',
      description: 'Low-E windows, efficient HVAC, LED lighting, and other green upgrades.'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Warranty Coverage',
      description: 'Manufacturer\'s limited warranty applies; you register your warranty with the manufacturer.'
    },
    {
      icon: CogIcon,
      title: 'Pro Service Network',
      description: 'National scale + established processes from a major manufacturer.'
    }
  ]

  // Timeline steps
  const timelineSteps = [
    {
      icon: ClipboardDocumentCheckIcon,
      title: 'Factory Order',
      description: 'We submit your finalized spec to the factory.',
      details: 'Your custom specifications, options, and finishes are transmitted to Champion\'s Athens Park facility for production scheduling.'
    },
    {
      icon: CogIcon,
      title: 'Build & QA',
      description: 'Your home is assembled, finished, and tested in a controlled environment.',
      details: 'Professional craftsmen build your home on a precision assembly line with quality checkpoints at every stage.'
    },
    {
      icon: DocumentCheckIcon,
      title: 'Completion Notice',
      description: 'We\'ll confirm completion and align delivery windows.',
      details: 'Storage fees may apply after the grace period; buyer carries insurance at completion and during transit.'
    },
    {
      icon: TruckIcon,
      title: 'Delivery & Setup',
      description: 'Transport, placement, and leveling occur on your prepared site.',
      details: 'Final walkthrough and punch list completion on delivery day. Buyer accepts unit as substantially conforming except for listed items.'
    }
  ]

  // JSON-LD structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "About the Manufacturer | Champion Athens Park Model Homes",
    "description": "Learn why Champion's Athens Park Model Homes are the gold standard in park model RV construction—quality materials, ANSI A119.5/RVIA certification, modern designs, and reliable support.",
    "url": "https://fireflyestimator.com/about/manufacturer",
    "isPartOf": {
      "@type": "WebSite",
      "name": "Firefly Tiny Homes",
      "url": "https://fireflyestimator.com"
    },
    "about": {
      "@type": "Organization",
      "name": "Champion Homes - Athens Park Model Homes",
      "description": "One of America's most established factory-home builders, specializing in park model RVs"
    }
  }

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'About the Manufacturer' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-300">Loading...</div>
      </div>
    )
  }

  const content = pageContent?.content || {}

  return (
    <>
      <Helmet>
        <title>About the Manufacturer | Champion Athens Park Model Homes (Park Model RVs)</title>
        <meta 
          name="description" 
          content="Learn why Champion's Athens Park Model Homes are the gold standard in park model RV construction—quality materials, ANSI A119.5/RVIA certification, modern designs, and reliable support. Offered by Firefly Tiny Homes." 
        />
        <link rel="canonical" href="https://fireflyestimator.com/about/manufacturer" />
        
        {/* Open Graph */}
        <meta property="og:title" content="About the Manufacturer | Champion Athens Park Model Homes" />
        <meta property="og:description" content="Learn why Champion's Athens Park Model Homes are the gold standard in park model RV construction—quality materials, ANSI A119.5/RVIA certification, modern designs, and reliable support." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fireflyestimator.com/about/manufacturer" />
        <meta property="og:image" content="https://fireflyestimator.com/hero/champion-park-model-exterior.jpg" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About the Manufacturer | Champion Athens Park Model Homes" />
        <meta name="twitter:description" content="Learn why Champion's Athens Park Model Homes are the gold standard in park model RV construction." />
        <meta name="twitter:image" content="https://fireflyestimator.com/hero/champion-park-model-exterior.jpg" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Admin Edit Button */}
        {isAdmin && (
          <div className="fixed top-20 right-4 z-50">
            <button
              onClick={() => setIsEditorOpen(true)}
              className="px-3 py-2 btn-primary rounded-md bg-white/90 backdrop-blur-sm shadow-lg"
            >
              Edit
            </button>
          </div>
        )}

        {/* Hero Section */}
        <HeroHeader
          title={content.hero?.title || "About the Manufacturer: Champion Homes — Athens Park Model Homes"}
          subtitle={content.hero?.subtitle || "Park model tiny homes built with precision in modern, climate-controlled factories—certified, comfortable, and made to last."}
          backgroundImage={pageContent?.images?.heroImage?.url || "/hero/champion-park-model-exterior.jpg"}
          breadcrumbs={breadcrumbs}
        >
          {/* Trust Bar */}
          <div className="flex flex-wrap justify-center gap-6 mt-8">
            {trustItems.map((item, index) => (
              <div 
                key={index}
                className="group flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20"
                title={item.tooltip}
              >
                <item.icon className="w-5 h-5 text-yellow-400" />
                <span className="text-white text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </HeroHeader>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
          
          {/* Overview Section */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {content.overview?.title || 'Who Builds Our Park Model Tiny Homes?'}
              </h2>
              <div className="max-w-4xl mx-auto text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                <p className="mb-6">
                  {content.overview?.content || 'Champion Homes is one of America\'s most established factory-home builders, and their Athens Park Model Homes division focuses specifically on park model RVs (often called "park model tiny homes"). Athens Park blends residential-grade materials, tight factory quality controls, and modern design to deliver small homes that live big—year after year.'}
                </p>
              </div>
            </div>
            
            {/* Overview Image */}
            {pageContent?.images?.overviewImage && (
              <div className="mb-8">
                <img 
                  src={pageContent.images.overviewImage.url} 
                  alt={pageContent.images.overviewImage.alt || "Champion Homes Overview"} 
                  className="w-full max-w-4xl mx-auto rounded-lg shadow-lg"
                />
              </div>
            )}
            
            <FeatureGrid features={overviewFeatures} columns={3} />
            
            <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Legal/Warranty clarity:</strong> Firefly sells manufacturer-built units; the Manufacturer's Limited Warranty applies and must be registered by the buyer.
              </p>
            </div>
          </section>

          {/* Quality & Materials Section */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {content.quality?.title || 'Inside the Factory: How Athens Park Models Are Built'}
              </h2>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                  {content.quality?.content || 'Athens Park models are assembled on steel chassis in a controlled production line. Walls, floors, and roofs are framed square with jigs, fastened to spec, insulated, sheathed, and finished to residential standards. Building indoors keeps materials dry and allows stringent quality checks at each station. Plumbing and electrical are tested before the home leaves the plant. Design choices emphasize durability and comfort: full-size appliances, real cabinetry, robust flooring, taped-and-textured interior finishes (on select lines), and LoE dual-pane windows. Custom décor packages, exterior siding and roofing options, porches, and loft layouts let you match your style.'}
                </p>
              </div>
              
              {/* Quality Image */}
              <div>
                {pageContent?.images?.qualityImage ? (
                  <img 
                    src={pageContent.images.qualityImage.url} 
                    alt={pageContent.images.qualityImage.alt || "Athens Park Factory Quality"} 
                    className="w-full rounded-lg shadow-lg"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <CheckBadgeIcon className="w-4 h-4 text-green-600" />
                        <span className="text-gray-700 dark:text-gray-300">Open-concept living areas with high ceilings</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckBadgeIcon className="w-4 h-4 text-green-600" />
                        <span className="text-gray-700 dark:text-gray-300">Full kitchen (standard residential appliances)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckBadgeIcon className="w-4 h-4 text-green-600" />
                        <span className="text-gray-700 dark:text-gray-300">Full bath with residential fixtures</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <CheckBadgeIcon className="w-4 h-4 text-green-600" />
                        <span className="text-gray-700 dark:text-gray-300">Optional lofts (on many models)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckBadgeIcon className="w-4 h-4 text-green-600" />
                        <span className="text-gray-700 dark:text-gray-300">Durable exterior siding & roofing options</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckBadgeIcon className="w-4 h-4 text-green-600" />
                        <span className="text-gray-700 dark:text-gray-300">Energy-smart upgrades available</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Certifications Section */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {content.certifications?.title || 'Certified for Safety, Placement, and Peace of Mind'}
              </h2>
            </div>
            
            {/* Certifications Image */}
            {pageContent?.images?.certificationsImage && (
              <div className="mb-8">
                <img 
                  src={pageContent.images.certificationsImage.url} 
                  alt={pageContent.images.certificationsImage.alt || "Certifications and Standards"} 
                  className="w-full max-w-4xl mx-auto rounded-lg shadow-lg"
                />
              </div>
            )}
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="card bg-white dark:bg-gray-800/60 p-6">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                  <AcademicCapIcon className="w-6 h-6 text-blue-600 dark:text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  ANSI A119.5 (Park Model RV)
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Park models from Athens Park are built to the ANSI A119.5 park model RV standard—a nationally recognized safety and construction code for this category. Translation: electrical, plumbing, fire safety, egress, and structure are held to a clear benchmark.
                </p>
              </div>
              
              <div className="card bg-white dark:bg-gray-800/60 p-6">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                  <ShieldCheckIcon className="w-6 h-6 text-green-600 dark:text-green-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  RVIA Label
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  An RVIA certification label at the entry confirms third-party code compliance. This label is often helpful for financing, insurance, and RV resort placement (always verify local requirements).
                </p>
              </div>
              
              <div className="card bg-white dark:bg-gray-800/60 p-6">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-500/10 rounded-lg flex items-center justify-center mb-4">
                  <DocumentCheckIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Texas Title/Registration
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  In Texas, park models are typically titled/registered as travel trailers; buyers complete the required TxDMV paperwork. (We'll help with the process inside checkout.)
                </p>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800/40 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                <strong>Callout:</strong> Freight quotes are estimates; final routing can vary with fuel, escorts, access, or terrain.
              </p>
            </div>
          </section>

          {/* Benefits Section */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {content.benefits?.title || 'Real-World Benefits You\'ll Feel'}
              </h2>
            </div>
            
            {/* Benefits Image */}
            {pageContent?.images?.benefitsImage && (
              <div className="mb-8">
                <img 
                  src={pageContent.images.benefitsImage.url} 
                  alt={pageContent.images.benefitsImage.alt || "Real-World Benefits"} 
                  className="w-full max-w-4xl mx-auto rounded-lg shadow-lg"
                />
              </div>
            )}
            
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckBadgeIcon className="w-8 h-8 text-blue-600 dark:text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Smoother Ownership
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Certifications + labeling make it easier to place your unit in compliant locations and arrange financing/insurance.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HomeIcon className="w-8 h-8 text-green-600 dark:text-green-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Comfort Like Home
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Full-size appliances, real bathrooms, and smart storage mean no daily compromises.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheckIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Confidence in the Build
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Factory checks at every stage + a manufacturer warranty give long-term peace of mind.
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Link 
                to="/models"
                className="btn-primary px-8 py-3 text-lg"
              >
                Explore Park Models
              </Link>
              <Link 
                to="/how-it-works"
                className="btn-secondary px-8 py-3 text-lg"
              >
                How Our 8-Step Online Purchase Works
              </Link>
            </div>
          </section>

          {/* Partnership Section */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {content.partnership?.title || 'Why We Partner with Champion'}
              </h2>
              <div className="max-w-4xl mx-auto">
                <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                  {content.partnership?.content || 'We chose Champion\'s Athens Park division because their process quality, materials, and design options consistently deliver the best value to our customers. Firefly\'s role is to guide your selection, lock your build spec, and coordinate documents, payment, and delivery.'}
                </p>
              </div>
            </div>
            
            {/* Partnership Image */}
            {pageContent?.images?.partnershipImage && (
              <div className="mb-8">
                <img 
                  src={pageContent.images.partnershipImage.url} 
                  alt={pageContent.images.partnershipImage.alt || "Partnership with Champion"} 
                  className="w-full max-w-4xl mx-auto rounded-lg shadow-lg"
                />
              </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Manufacturer Warranty & Service Acknowledgment
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your unit is covered solely by the Manufacturer's Limited Warranty. Buyer must register the warranty directly with the Manufacturer.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Delivery, Set & Site Readiness
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Buyer is responsible for permits, access, pad/foundation readiness, utilities, and staging. Complex placements (e.g., cranes, escorts) billed at additional cost.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Notice of Completion & Storage
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Delivery must occur within the stated window after factory completion; storage charges may apply. Buyer assumes insurance responsibility upon factory completion and during transit.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Final Walkthrough
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    At delivery, Buyer and Seller jointly inspect the unit and complete a punch list; except for listed items, Buyer accepts the unit as substantially conforming.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <strong>Note:</strong> Delivery access, pad/foundation readiness, utilities, and complex placements (e.g., cranes) affect timing and cost. Freight quotes can change with routing, escorts, or fuel surcharges.
              </p>
            </div>
          </section>

          {/* Timeline Section */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Timeline: From Order to Move-In
              </h2>
            </div>
            
            <Timeline steps={timelineSteps} />
          </section>

          {/* Final CTA Section */}
          <section className="text-center">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Ready to See the Models?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                Explore floor plans, finishes, porches, and loft options—then order online in about an hour.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4">
                <Link 
                  to="/models"
                  className="btn-primary px-8 py-3 text-lg"
                >
                  Explore Park Models
                </Link>
                <Link 
                  to="/how-it-works"
                  className="btn-secondary px-8 py-3 text-lg"
                >
                  How It Works
                </Link>
              </div>
            </div>
          </section>
        </div>

        {/* Page Images */}
        {pageContent?.images && pageContent.images.length > 0 && (
          <section className="py-16 bg-white dark:bg-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Gallery
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pageContent.images.map((image, index) => (
                  <div key={index} className="card p-0 overflow-hidden">
                    <img 
                      src={image.url} 
                      alt={image.alt || 'Manufacturer Gallery'} 
                      className="w-full h-64 object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

              {/* Admin Editor */}
        {isEditorOpen && (
          <AdminPageEditor
            pageId="about-manufacturer"
            content={pageContent?.content}
            onClose={() => setIsEditorOpen(false)}
            onSaved={handleContentSaved}
            imageFields={[
              { name: 'heroImage', label: 'Hero Background Image' },
              { name: 'overviewImage', label: 'Overview Section Image' },
              { name: 'qualityImage', label: 'Quality Section Image' },
              { name: 'certificationsImage', label: 'Certifications Section Image' },
              { name: 'benefitsImage', label: 'Benefits Section Image' },
              { name: 'partnershipImage', label: 'Partnership Section Image' }
            ]}
          />
        )}

      {/* Sticky Mobile CTA */}
      {showStickyDTA && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg">
          <Link 
            to="/models"
            className="btn-primary w-full py-3 text-center block"
          >
            Explore Park Models
          </Link>
        </div>
      )}
    </>
  )
}

export default Manufacturer
