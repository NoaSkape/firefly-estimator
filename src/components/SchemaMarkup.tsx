import { Helmet } from 'react-helmet-async'

type SchemaMarkupProps = {
  pageType: 'homepage' | 'product' | 'faq' | 'how-to' | 'local-business' | 'organization' | 'website' | 'article'
  data?: any
  buildId?: string
}

export function SchemaMarkup({ pageType, data, buildId }: SchemaMarkupProps) {
  const getSchema = () => {
    switch (pageType) {
      case 'homepage':
        return {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Firefly Tiny Homes',
          url: 'https://fireflyestimator.com',
          logo: 'https://fireflyestimator.com/logo/firefly-logo.png',
          description: 'Premium tiny home manufacturer specializing in custom, high-quality tiny homes with innovative design and sustainable materials.',
          address: {
            '@type': 'PostalAddress',
            streetAddress: '6150 TX-16',
            addressLocality: 'Pipe Creek',
            addressRegion: 'TX',
            postalCode: '78063',
            addressCountry: 'US'
          },
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+1-830-241-2410',
            contactType: 'customer service',
            areaServed: 'US',
            availableLanguage: 'English'
          },
          sameAs: [
            'https://www.facebook.com/fireflytinyhomes',
            'https://www.instagram.com/fireflytinyhomes',
            'https://www.linkedin.com/company/fireflytinyhomes'
          ]
        }
      
      case 'product':
        return {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: data.name,
          description: data.description,
          brand: {
            '@type': 'Brand',
            name: 'Firefly Tiny Homes'
          },
          manufacturer: {
            '@type': 'Organization',
            name: 'Firefly Tiny Homes'
          },
          model: data.modelCode || data.subtitle,
          category: 'Tiny Homes',
          offers: {
            '@type': 'Offer',
            price: data.basePrice,
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
            seller: {
              '@type': 'Organization',
              name: 'Firefly Tiny Homes'
            }
          },
          image: data.images?.map((img: any) => img.url) || [],
          additionalProperty: [
            {
              '@type': 'PropertyValue',
              name: 'Size',
              value: data.size || `${data.length || 0}x${data.width || 0}`
            },
            {
              '@type': 'PropertyValue',
              name: 'Length',
              value: `${data.length || 0} feet`
            },
            {
              '@type': 'PropertyValue',
              name: 'Width',
              value: `${data.width || 0} feet`
            },
            {
              '@type': 'PropertyValue',
              name: 'Bedrooms',
              value: data.bedrooms || 0
            },
            {
              '@type': 'PropertyValue',
              name: 'Bathrooms',
              value: data.bathrooms || 0
            }
          ]
        }
      
      case 'faq':
        return {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: data.faqs.map((faq: any) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer
            }
          }))
        }
      
      case 'how-to':
        return {
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: data.title,
          description: data.description,
          image: data.image,
          totalTime: data.duration,
          step: data.steps.map((step: any, index: number) => ({
            '@type': 'HowToStep',
            position: index + 1,
            name: step.title,
            text: step.description,
            image: step.image
          }))
        }
      
      case 'local-business':
        return {
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: 'Firefly Tiny Homes',
          description: 'Premium tiny home manufacturer in Pipe Creek, Texas',
          url: 'https://fireflyestimator.com',
          telephone: '+1-830-241-2410',
          email: 'office@fireflytinyhomes.com',
          address: {
            '@type': 'PostalAddress',
            streetAddress: '6150 TX-16',
            addressLocality: 'Pipe Creek',
            addressRegion: 'TX',
            postalCode: '78063',
            addressCountry: 'US'
          },
          geo: {
            '@type': 'GeoCoordinates',
            latitude: 29.7283,
            longitude: -98.9400
          },
          openingHours: 'Mo-Fr 09:00-17:00',
          priceRange: '$$$',
          paymentAccepted: ['Cash', 'Credit Card', 'Financing'],
          areaServed: [
            {
              '@type': 'City',
              name: 'Austin'
            },
            {
              '@type': 'City',
              name: 'Houston'
            },
            {
              '@type': 'City',
              name: 'Dallas'
            },
            {
              '@type': 'City',
              name: 'San Antonio'
            }
          ],
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'Tiny Home Models',
            itemListElement: [
              {
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Product',
                  name: 'Magnolia Tiny Home',
                  description: '20x8 premium tiny home'
                }
              }
            ]
          }
        }
      
      case 'organization':
        return {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Firefly Tiny Homes',
          url: 'https://fireflyestimator.com',
          logo: 'https://fireflyestimator.com/logo/firefly-logo.png',
          description: 'Professional tiny home manufacturing company specializing in park model homes and custom tiny homes.',
          foundingDate: '2020',
          numberOfEmployees: '10-50',
          industry: 'Manufacturing',
          address: {
            '@type': 'PostalAddress',
            streetAddress: '6150 TX-16',
            addressLocality: 'Pipe Creek',
            addressRegion: 'TX',
            postalCode: '78063',
            addressCountry: 'US'
          }
        }
      
      case 'website':
        return {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          url: 'https://fireflyestimator.com',
          name: 'Firefly Tiny Homes',
          description: 'Professional tiny home manufacturing and sales website',
          potentialAction: {
            '@type': 'SearchAction',
            target: 'https://fireflyestimator.com/search?q={query}',
            'query-input': 'required name=query'
          }
        }
      
      case 'article':
        return {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: data.title,
          description: data.description,
          image: data.image,
          author: {
            '@type': 'Organization',
            name: 'Firefly Tiny Homes'
          },
          publisher: {
            '@type': 'Organization',
            name: 'Firefly Tiny Homes',
            logo: {
              '@type': 'ImageObject',
              url: 'https://fireflyestimator.com/logo/firefly-logo.png'
            }
          },
          datePublished: data.publishedAt,
          dateModified: data.updatedAt,
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': data.url
          }
        }
      
      default:
        return null
    }
  }
  
  const schema = getSchema()
  if (!schema) return null
  
  return (
    <Helmet>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </Helmet>
  )
}
