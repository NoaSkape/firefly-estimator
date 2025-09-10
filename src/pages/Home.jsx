import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PublicModelSelector from '../public/PublicModelSelector'
import { MODELS } from '../data/models'
import fetchModelsBatch from '../utils/fetchModelsBatch'
import { modelIdToSlug } from '../utils/modelUrlMapping'
import { Seo } from '../components/Seo'
import { SchemaMarkup } from '../components/SchemaMarkup'
import { Hero } from '../components/Hero'
import { TrustBar } from '../components/TrustBar'
import { FAQ } from '../components/FAQ'
import { SiteSidebar } from '../components/SiteSidebar'

export default function Home() {
  const [allModels, setAllModels] = useState(MODELS)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    async function load() {
      const local = MODELS.map(m => ({ ...m }))
      setAllModels(local)
      try {
        const apiModels = await fetchModelsBatch(local.map(m => m.id))
        const merged = local.map((m, i) => {
          const api = apiModels[i]
          if (!api) return m
          return {
            ...m,
            name: api.name || m.name,
            description: api.description ?? m.description,
            basePrice: typeof api.basePrice === 'number' ? api.basePrice : m.basePrice,
            width: api?.width ?? null,
            length: api?.width ?? null,
            height: api?.height ?? null,
            weight: api?.weight ?? null,
            bedrooms: api?.bedrooms ?? null,
            bathrooms: api?.bathrooms ?? null,
            squareFeet: api?.squareFeet ?? null,
            images: Array.isArray(api.images) ? api.images : [],
            subtitle: api.modelCode || m.subtitle,
          }
        })
        if (!cancelled) setAllModels(merged)
      } catch (_) {}
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleCardSelect = (modelId) => {
    const slug = modelIdToSlug(modelId)
    if (slug) navigate(`/models/${slug}`)
  }

  // Enhanced structured data for better SEO
  const orgJsonLd = { 
    "@context":"https://schema.org",
    "@type":"Organization",
    "name":"Firefly Tiny Homes",
    "url":"https://fireflyestimator.com",
    "logo":"https://fireflyestimator.com/logo/firefly-logo.png",
    "description": "Premier tiny home dealership specializing in custom, high-quality tiny homes with innovative design and sustainable materials.",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "6150 TX-16",
      "addressLocality": "Pipe Creek",
      "addressRegion": "TX",
      "postalCode": "78063",
      "addressCountry": "US"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+1-830-241-2410",
      "contactType": "customer service",
      "areaServed": "US",
      "availableLanguage": "English"
    },
    "sameAs":[
      "https://www.facebook.com/fireflytinyhomes",
      "https://www.instagram.com/fireflytinyhomes"
    ] 
  }
  
  const siteJsonLd = { 
    "@context":"https://schema.org",
    "@type":"WebSite",
    "url":"https://fireflyestimator.com",
    "name":"Firefly Tiny Homes",
    "description": "Professional tiny home dealership and sales website",
    "potentialAction":{
      "@type":"SearchAction",
      "target":"https://fireflyestimator.com/search?q={query}",
      "query-input":"required name=query"
    }
  }
  
  const faqJsonLd = { 
    "@context":"https://schema.org",
    "@type":"FAQPage",
    "mainEntity":[
      { 
        "@type":"Question",
        "name":"Are Firefly's homes park model RVs in Texas?",
        "acceptedAnswer":{
          "@type":"Answer",
          "text":"Yes—our park model homes are classified as RVs in Texas and delivered factory-direct to your site."
        }
      },
      { 
        "@type":"Question",
        "name":"Can I really order in under an hour?",
        "acceptedAnswer":{
          "@type":"Answer",
          "text":"Best-case, yes. Most buyers complete pre-approval and e-sign quickly; documentation needs can vary."
        }
      },
      { 
        "@type":"Question",
        "name":"Do you offer financing?",
        "acceptedAnswer":{
          "@type":"Answer",
          "text":"Yes—modern, online financing with soft-pull pre-qualification to view offers fast."
        }
      },
      { 
        "@type":"Question",
        "name":"Where do you deliver?",
        "acceptedAnswer":{
          "@type":"Answer",
          "text":"Statewide across Texas; we help coordinate site readiness and setup."
        }
      },
      { 
        "@type":"Question",
        "name":"Can I customize my layout?",
        "acceptedAnswer":{
          "@type":"Answer",
          "text":"Absolutely—our design studio lets you select finishes and options with live pricing."
        }
      }
    ]
  }

  return (
    <>
      <Seo
        title="Firefly Tiny Homes | Texas Park Model Homes — Factory-Direct, Fast Financing"
        description="Texas's #1 online park model home dealership. Design, finance, and order your tiny home online. Factory-direct pricing, fast delivery, modern financing."
        keywords={[
          'tiny homes Texas',
          'park model homes',
          'Texas tiny homes',
          'manufactured homes Texas',
          'firefly tiny homes',
          'custom tiny homes',
          'tiny house Texas',
          'mobile homes Texas'
        ]}
        canonicalUrl="https://fireflyestimator.com"
        faqJsonLd={faqJsonLd}
        orgJsonLd={orgJsonLd}
        siteJsonLd={siteJsonLd}
      />
      <SchemaMarkup pageType="homepage" />
      <SchemaMarkup pageType="local-business" />
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-6">
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-8">
          <main>
            <Hero />
            <TrustBar />
            <section id="models" className="mt-16 md:mt-20 mb-12">
              <div className="card">
                <h2 className="section-header">Explore Our Models</h2>
                <PublicModelSelector models={allModels} />
              </div>
            </section>
            <section id="faq" className="my-12">
              <FAQ />
            </section>
          </main>
          <aside className="hidden lg:block">
            <SiteSidebar />
          </aside>
        </div>
      </div>
    </>
  )
}


