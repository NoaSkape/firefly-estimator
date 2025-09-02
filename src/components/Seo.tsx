import { Helmet } from 'react-helmet-async'

type Props = {
  title: string
  description: string
  image?: string
  url?: string
  keywords?: string[]
  canonicalUrl?: string
  faqJsonLd?: object
  orgJsonLd?: object
  siteJsonLd?: object
  productJsonLd?: object
  localBusinessJsonLd?: object
  howToJsonLd?: object
  articleJsonLd?: object
  noIndex?: boolean
  noFollow?: boolean
}

export function Seo({ 
  title, 
  description, 
  image = '/logo/firefly-logo.png', 
  url = 'https://fireflyestimator.com', 
  keywords = ['tiny homes', 'park model homes', 'Texas', 'manufactured homes', 'mobile homes', 'firefly tiny homes'],
  canonicalUrl,
  faqJsonLd, 
  orgJsonLd, 
  siteJsonLd,
  productJsonLd,
  localBusinessJsonLd,
  howToJsonLd,
  articleJsonLd,
  noIndex = false,
  noFollow = false
}: Props) {
  const jsonLd = [
    orgJsonLd, 
    siteJsonLd, 
    faqJsonLd, 
    productJsonLd, 
    localBusinessJsonLd, 
    howToJsonLd, 
    articleJsonLd
  ].filter(Boolean)
  
  const robotsContent = noIndex ? 'noindex' : noFollow ? 'nofollow' : 'index, follow'
  
  return (
    <Helmet prioritizeSeoTags>
      {/* Essential SEO meta tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <link rel="canonical" href={canonicalUrl || url} />
      
      {/* Language and encoding */}
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      
      {/* Robots and indexing */}
      <meta name="robots" content={robotsContent} />
      <meta name="googlebot" content={robotsContent} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Firefly Tiny Homes" />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@fireflytinyhomes" />
      <meta name="twitter:creator" content="@fireflytinyhomes" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      {/* Additional social meta */}
      <meta name="twitter:label1" content="Est. reading time" />
      <meta name="twitter:data1" content="5 min read" />
      
      {/* Structured Data */}
      {jsonLd.map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}
    </Helmet>
  )
}


