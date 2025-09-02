import { useState } from 'react'
import { Seo } from '../components/Seo'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function submit(e) {
    e.preventDefault()
    console.log('contact submit', form)
    alert('Thanks! We will reach out shortly.')
    setForm({ name: '', email: '', message: '' })
  }
  return (
    <>
      <Seo 
        title="Contact Firefly Tiny Homes | Get Your Free Quote Today" 
        description="Call (830) 241-2410 or email office@fireflytinyhomes.com. Get pre‑approved to secure your Champion Park Model. Located in Pipe Creek, Texas." 
        keywords={[
          'contact firefly tiny homes',
          'tiny homes Texas contact',
          'park model homes contact',
          'firefly tiny homes phone',
          'tiny homes quote Texas',
          'manufactured homes contact Texas'
        ]}
        canonicalUrl="https://fireflyestimator.com/contact"
        localBusinessJsonLd={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": "Firefly Tiny Homes",
          "description": "Premium tiny home manufacturer in Pipe Creek, Texas",
          "url": "https://fireflyestimator.com",
          "telephone": "+1-830-241-2410",
          "email": "office@fireflytinyhomes.com",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "6150 TX-16",
            "addressLocality": "Pipe Creek",
            "addressRegion": "TX",
            "postalCode": "78063",
            "addressCountry": "US"
          },
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": 29.7283,
            "longitude": -98.9400
          },
          "openingHours": "Mo-Fr 09:00-17:00",
          "priceRange": "$$$",
          "paymentAccepted": ["Cash", "Credit Card", "Financing"],
          "areaServed": [
            {
              "@type": "City",
              "name": "Austin"
            },
            {
              "@type": "City",
              "name": "Houston"
            },
            {
              "@type": "City",
              "name": "Dallas"
            },
            {
              "@type": "City",
              "name": "San Antonio"
            }
          ]
        }}
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100">Contact Us</h1>
          <p className="mt-2 text-gray-300">We’re here to help you design, finance, and schedule delivery of your park model home.</p>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={submit} className="card space-y-3">
            <input className="input-field" placeholder="Name" value={form.name} onChange={e=>setField('name', e.target.value)} />
            <input className="input-field" placeholder="Email" value={form.email} onChange={e=>setField('email', e.target.value)} />
            <textarea className="input-field h-32" placeholder="How can we help?" value={form.message} onChange={e=>setField('message', e.target.value)} />
            <div className="flex gap-3">
              <button className="btn-primary" type="submit">Send</button>
              <a href="/checkout?mode=finance" className="px-4 py-2 rounded bg-yellow-500 text-gray-900 hover:bg-yellow-400">Get Pre‑Approved</a>
            </div>
          </form>
          <div className="space-y-4">
            <div className="card text-sm text-gray-300">
              <h2 className="text-lg font-semibold text-gray-100">Firefly Tiny Homes</h2>
              <p className="mt-1">6150 TX‑16, Pipe Creek, TX 78063</p>
                      <p className="mt-1">Phone: <a className="text-yellow-500 hover:underline" href="tel:+18302412410">(830) 241‑2410</a></p>
        <p className="mt-1">Email: <a className="text-yellow-500 hover:underline" href="mailto:office@fireflytinyhomes.com">office@fireflytinyhomes.com</a></p>
            </div>
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-100">Our Location</h2>
              <div className="mt-2 overflow-hidden rounded-lg">
                <iframe
                  title="Firefly Tiny Homes Map"
                  src="https://www.google.com/maps?q=6150%20TX-16,%20Pipe%20Creek,%20TX%2078063&output=embed"
                  width="100%" height="300" style={{ border: 0 }} allowFullScreen loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}


