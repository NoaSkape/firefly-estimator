import { Helmet } from 'react-helmet-async'

type Props = {
  title: string
  description: string
  image?: string
  url?: string
  faqJsonLd?: object
  orgJsonLd?: object
  siteJsonLd?: object
}

export function Seo({ title, description, image = '/og.jpg', url = 'https://fireflyestimator.com', faqJsonLd, orgJsonLd, siteJsonLd }: Props) {
  const jsonLd = [orgJsonLd, siteJsonLd, faqJsonLd].filter(Boolean)
  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      {jsonLd.map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}
    </Helmet>
  )
}


