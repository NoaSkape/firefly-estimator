import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useUser } from '@clerk/clerk-react'
import { canEditModelsClient } from '../../lib/canEditModels'
import { 
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

export default function TexasRegulations() {
  const { user } = useUser()
  const [isAdmin, setIsAdmin] = useState(false)
  const [views, setViews] = useState(1563)

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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <>
      <Helmet>
        <title>Park Model Regulations and Texas Law: Your Complete Guide | Firefly Tiny Homes</title>
        <meta 
          name="description" 
          content="Everything you need to know about park model home regulations, zoning laws, and legal requirements in Texas. Expert guidance on compliance and permits." 
        />
        <meta name="keywords" content="park model regulations Texas, tiny home laws Texas, mobile home zoning, park model permits, Texas housing laws, tiny house legal requirements" />
        <link rel="canonical" href="https://fireflyestimator.com/blog/park-model-regulations-texas-law" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Park Model Regulations and Texas Law: Your Complete Guide" />
        <meta property="og:description" content="Everything you need to know about park model home regulations, zoning laws, and legal requirements in Texas." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://fireflyestimator.com/blog/park-model-regulations-texas-law" />
        <meta property="og:image" content="https://fireflyestimator.com/hero/tiny-home-dusk.png" />
        <meta property="og:site_name" content="Firefly Tiny Homes" />
        <meta property="article:published_time" content="2024-01-05T00:00:00.000Z" />
        <meta property="article:author" content="Firefly Tiny Homes" />
        <meta property="article:section" content="Location & Zoning" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Park Model Regulations and Texas Law: Your Complete Guide" />
        <meta name="twitter:description" content="Everything you need to know about park model home regulations, zoning laws, and legal requirements in Texas." />
        <meta name="twitter:image" content="https://fireflyestimator.com/hero/tiny-home-dusk.png" />
        
        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Firefly Tiny Homes" />
        <meta name="language" content="English" />
        <meta name="geo.region" content="US-TX" />
        <meta name="geo.placename" content="Pipe Creek, Texas" />
        
        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": "Park Model Regulations and Texas Law: Your Complete Guide",
            "description": "Everything you need to know about park model home regulations, zoning laws, and legal requirements in Texas.",
            "image": "https://fireflyestimator.com/hero/tiny-home-dusk.png",
            "author": {
              "@type": "Organization",
              "name": "Firefly Tiny Homes"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Firefly Tiny Homes",
              "logo": {
                "@type": "ImageObject",
                "url": "https://fireflyestimator.com/logo/firefly-logo.png"
              }
            },
            "datePublished": "2024-01-05T00:00:00.000Z",
            "dateModified": "2024-01-05T00:00:00.000Z",
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": "https://fireflyestimator.com/blog/park-model-regulations-texas-law"
            }
          })}
        </script>
      </Helmet>

      {/* Admin Edit Button */}
      {isAdmin && (
        <div className="fixed top-20 right-4 z-50">
          <Link
            to="/blog/edit/park-model-regulations-texas-law"
            className="px-4 py-2 bg-yellow-500 text-gray-900 font-semibold rounded-md hover:bg-yellow-400 shadow-lg"
          >
            Edit Post
          </Link>
        </div>
      )}

      <article className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-20 lg:py-32">
          <div className="absolute inset-0">
            <img 
              src="/hero/tiny-home-dusk.png" 
              alt="Park model home in Texas" 
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/50 to-gray-900/30" />
          </div>
          
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center mb-6">
              <Link 
                to="/blog" 
                className="flex items-center text-yellow-400 hover:text-yellow-300 mr-6"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Blog
              </Link>
              <span className="px-3 py-1 bg-yellow-500 text-gray-900 text-sm font-semibold rounded-full">
                Location & Zoning
              </span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              Park Model Regulations and Texas Law: Your Complete Guide
            </h1>
            
            <p className="text-xl sm:text-2xl text-gray-200 mb-8 leading-relaxed">
              Everything you need to know about park model home regulations, zoning laws, and legal requirements in Texas.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-6 text-gray-300">
              <div className="flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2" />
                <span>{formatDate('2024-01-05')}</span>
              </div>
              <div className="flex items-center">
                <ClockIcon className="w-5 h-5 mr-2" />
                <span>18 min read</span>
              </div>
              <div className="flex items-center">
                <EyeIcon className="w-5 h-5 mr-2" />
                <span>{views.toLocaleString()} views</span>
              </div>
            </div>
          </div>
        </section>

        {/* Article Content */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="prose prose-lg max-w-none">
              <h2>Understanding Park Model Homes in Texas</h2>
              <p>
                Park model homes occupy a unique legal category in Texas, falling between traditional mobile homes and recreational vehicles. Understanding the regulations governing these homes is crucial for anyone considering this lifestyle in the Lone Star State.
              </p>

              <h2>What is a Park Model Home?</h2>
              <p>
                According to Texas law, park model homes are recreational vehicles that:
              </p>
              <ul>
                <li>Are designed for temporary or seasonal occupancy</li>
                <li>Have a maximum width of 12 feet</li>
                <li>Have a maximum length of 40 feet</li>
                <li>Are built on a single chassis</li>
                <li>Are designed to be towed to a site</li>
              </ul>

              <h2>Texas State Regulations</h2>
              <p>
                Texas has specific regulations governing park model homes that differ from other states:
              </p>

              <h3>Texas Department of Housing and Community Affairs (TDHCA)</h3>
              <p>
                The TDHCA oversees manufactured housing in Texas and has specific requirements for park model homes:
              </p>
              <ul>
                <li><strong>Registration:</strong> Park model homes must be registered with TDHCA</li>
                <li><strong>Standards:</strong> Must meet HUD standards for manufactured housing</li>
                <li><strong>Inspection:</strong> Subject to state inspection requirements</li>
                <li><strong>Dealer licensing:</strong> Sellers must be licensed by TDHCA</li>
              </ul>

              <h3>Texas Transportation Code</h3>
              <p>
                Since park model homes are transported on public roads, they must comply with transportation regulations:
              </p>
              <ul>
                <li><strong>Size limits:</strong> Maximum width of 12 feet, length of 40 feet</li>
                <li><strong>Weight restrictions:</strong> Must comply with state weight limits</li>
                <li><strong>Permit requirements:</strong> May require special permits for transport</li>
                <li><strong>Safety equipment:</strong> Must have proper lighting and reflectors</li>
              </ul>

              <h2>Local Zoning and Land Use Regulations</h2>
              <p>
                Local regulations vary significantly across Texas counties and municipalities:
              </p>

              <h3>County Regulations</h3>
              <p>
                Most Texas counties have specific zoning ordinances that address park model homes:
              </p>
              <ul>
                <li><strong>Minimum lot sizes:</strong> Often 1-5 acres for rural areas</li>
                <li><strong>Setback requirements:</strong> Distance from property lines and roads</li>
                <li><strong>Foundation requirements:</strong> May require permanent foundations</li>
                <li><strong>Utility connections:</strong> Requirements for water, sewer, and electricity</li>
              </ul>

              <h3>Municipal Regulations</h3>
              <p>
                Cities and towns may have additional restrictions:
              </p>
              <ul>
                <li><strong>Zoning districts:</strong> May restrict park models to specific areas</li>
                <li><strong>HOA restrictions:</strong> Homeowner associations may prohibit park models</li>
                <li><strong>Building codes:</strong> Must comply with local building standards</li>
                <li><strong>Permit requirements:</strong> May require building permits for placement</li>
              </ul>

              <h2>Permit Requirements</h2>
              <p>
                Various permits may be required depending on your location and intended use:
              </p>

              <h3>Building Permits</h3>
              <ul>
                <li><strong>Foundation permits:</strong> Required for permanent foundations</li>
                <li><strong>Utility permits:</strong> For water, sewer, and electrical connections</li>
                <li><strong>Skirting permits:</strong> May be required for permanent skirting</li>
                <li><strong>Deck permits:</strong> For attached decks or porches</li>
              </ul>

              <h3>Transportation Permits</h3>
              <ul>
                <li><strong>Oversize permits:</strong> For homes exceeding standard dimensions</li>
                <li><strong>Route permits:</strong> May specify approved transportation routes</li>
                <li><strong>Escort requirements:</strong> May require escort vehicles</li>
                <li><strong>Time restrictions:</strong> May limit transport to specific hours</li>
              </ul>

              <h2>Property Tax Considerations</h2>
              <p>
                Park model homes in Texas are subject to specific tax regulations:
              </p>

              <h3>Assessment and Taxation</h3>
              <ul>
                <li><strong>Personal property:</strong> Initially taxed as personal property</li>
                <li><strong>Real property conversion:</strong> May convert to real property after permanent placement</li>
                <li><strong>Exemptions:</strong> May qualify for homestead exemptions</li>
                <li><strong>Appraisal districts:</strong> Local appraisal districts determine values</li>
              </ul>

              <h3>Tax Benefits</h3>
              <ul>
                <li><strong>Lower initial taxes:</strong> Often lower than traditional homes</li>
                <li><strong>Homestead exemption:</strong> Available after permanent placement</li>
                <li><strong>Senior exemptions:</strong> Additional exemptions for seniors</li>
                <li><strong>Disabled exemptions:</strong> Available for disabled homeowners</li>
              </ul>

              <h2>Insurance Requirements</h2>
              <p>
                Insurance for park model homes in Texas has specific considerations:
              </p>

              <h3>Types of Insurance</h3>
              <ul>
                <li><strong>Personal property insurance:</strong> Covers the home while mobile</li>
                <li><strong>Homeowners insurance:</strong> Available after permanent placement</li>
                <li><strong>Liability insurance:</strong> Protects against accidents and injuries</li>
                <li><strong>Flood insurance:</strong> May be required in flood-prone areas</li>
              </ul>

              <h3>Insurance Considerations</h3>
              <ul>
                <li><strong>Location factors:</strong> Rates vary by county and risk factors</li>
                <li><strong>Construction type:</strong> Manufactured home rates may differ</li>
                <li><strong>Age of home:</strong> Older homes may have higher rates</li>
                <li><strong>Safety features:</strong> Storm shutters, tie-downs may reduce rates</li>
              </ul>

              <h2>Utility and Infrastructure Requirements</h2>
              <p>
                Park model homes must meet specific utility and infrastructure standards:
              </p>

              <h3>Water and Sewer</h3>
              <ul>
                <li><strong>Water connections:</strong> Must meet local health department standards</li>
                <li><strong>Sewer connections:</strong> May require septic systems or city sewer</li>
                <li><strong>Backflow prevention:</strong> Required for potable water systems</li>
                <li><strong>Inspection requirements:</strong> May require health department inspections</li>
              </ul>

              <h3>Electrical Systems</h3>
              <ul>
                <li><strong>Electrical permits:</strong> Required for new installations</li>
                <li><strong>Code compliance:</strong> Must meet National Electrical Code</li>
                <li><strong>Inspection requirements:</strong> Electrical inspections required</li>
                <li><strong>Grounding requirements:</strong> Proper grounding essential for safety</li>
              </ul>

              <h2>Environmental and Safety Regulations</h2>
              <p>
                Texas has specific environmental and safety requirements for park model homes:
              </p>

              <h3>Environmental Considerations</h3>
              <ul>
                <li><strong>Floodplain regulations:</strong> Special requirements in flood-prone areas</li>
                <li><strong>Wetland protection:</strong> Restrictions in wetland areas</li>
                <li><strong>Endangered species:</strong> May affect placement in certain areas</li>
                <li><strong>Water quality:</strong> Septic systems must meet water quality standards</li>
              </ul>

              <h3>Safety Requirements</h3>
              <ul>
                <li><strong>Fire safety:</strong> Smoke detectors and fire extinguishers required</li>
                <li><strong>Storm protection:</strong> Tie-downs required in many areas</li>
                <li><strong>Carbon monoxide detectors:</strong> Required in some jurisdictions</li>
                <li><strong>Emergency exits:</strong> Must have proper emergency egress</li>
              </ul>

              <h2>Rental and Leasing Regulations</h2>
              <p>
                If you plan to rent or lease your park model home, additional regulations apply:
              </p>

              <h3>Landlord-Tenant Laws</h3>
              <ul>
                <li><strong>Lease agreements:</strong> Must comply with Texas landlord-tenant laws</li>
                <li><strong>Security deposits:</strong> Governed by state law</li>
                <li><strong>Eviction procedures:</strong> Must follow legal eviction process</li>
                <li><strong>Property maintenance:</strong> Landlord responsibilities defined by law</li>
              </ul>

              <h3>Short-term Rental Regulations</h3>
              <ul>
                <li><strong>Local ordinances:</strong> Many cities restrict short-term rentals</li>
                <li><strong>Tax requirements:</strong> Must collect and remit hotel taxes</li>
                <li><strong>Zoning restrictions:</strong> May be prohibited in residential areas</li>
                <li><strong>Permit requirements:</strong> May require business permits</li>
              </ul>

              <h2>Common Legal Issues and Solutions</h2>
              <p>
                Understanding common legal issues can help you avoid problems:
              </p>

              <h3>Zoning Violations</h3>
              <ul>
                <li><strong>Research first:</strong> Always check zoning before purchase</li>
                <li><strong>Variance requests:</strong> May be able to request zoning variances</li>
                <li><strong>Legal representation:</strong> Consider consulting with a land use attorney</li>
                <li><strong>Appeal process:</strong> Understand your rights to appeal decisions</li>
              </ul>

              <h3>HOA Conflicts</h3>
              <ul>
                <li><strong>Review covenants:</strong> Carefully read HOA documents</li>
                <li><strong>Request exceptions:</strong> May be able to request special permission</li>
                <li><strong>Legal review:</strong> Have attorney review restrictive covenants</li>
                <li><strong>Alternative locations:</strong> Consider areas without HOA restrictions</li>
              </ul>

              <h2>Resources for Compliance</h2>
              <p>
                Several resources are available to help you navigate Texas regulations:
              </p>

              <h3>Government Resources</h3>
              <ul>
                <li><strong>TDHCA:</strong> Texas Department of Housing and Community Affairs</li>
                <li><strong>County offices:</strong> Local planning and zoning departments</li>
                <li><strong>City offices:</strong> Municipal building and planning departments</li>
                <li><strong>State agencies:</strong> Various state agencies regulate different aspects</li>
              </ul>

              <h3>Professional Assistance</h3>
              <ul>
                <li><strong>Real estate attorneys:</strong> Specialized in land use and zoning</li>
                <li><strong>Land surveyors:</strong> For property boundary and placement issues</li>
                <li><strong>General contractors:</strong> For foundation and utility work</li>
                <li><strong>Insurance agents:</strong> Specialized in manufactured home insurance</li>
              </ul>

              <h2>Conclusion</h2>
              <p>
                Navigating park model home regulations in Texas requires careful research and planning. While the regulations may seem complex, understanding them upfront can save you time, money, and legal headaches in the long run.
              </p>

              <p>
                Remember that regulations can change, so it's important to verify current requirements with local authorities before making any decisions about your park model home.
              </p>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 my-8">
                <h3 className="text-yellow-800 font-semibold mb-2">Need Help Understanding Texas Regulations?</h3>
                <p className="text-yellow-700 mb-4">
                  Our team at Firefly Tiny Homes can help you navigate the complex regulations and find the perfect location for your park model home in Texas.
                </p>
                <Link
                  to="/contact"
                  className="inline-flex items-center px-6 py-3 bg-yellow-500 text-gray-900 font-semibold rounded-lg hover:bg-yellow-400 transition-colors"
                >
                  Get Expert Guidance
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Related Articles */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Link 
                to="/blog/why-go-tiny-complete-guide-park-model-living"
                className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-yellow-600 transition-colors mb-2">
                  Why Go Tiny? The Complete Guide to Park Model Living
                </h3>
                <p className="text-gray-600">
                  Discover the incredible benefits of downsizing to a park model home and why thousands of Americans are choosing this lifestyle.
                </p>
              </Link>
              <Link 
                to="/blog/best-skirting-options-park-model-homes"
                className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-yellow-600 transition-colors mb-2">
                  Best Skirting Options for Park Model Homes
                </h3>
                <p className="text-gray-600">
                  Learn about the different skirting options available for park model homes and how to choose the best solution for your needs.
                </p>
              </Link>
            </div>
          </div>
        </section>
      </article>
    </>
  )
}
