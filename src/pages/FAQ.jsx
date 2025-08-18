import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold text-gray-100 mb-4">{title}</h2>
      <div className="space-y-3">
        {children}
      </div>
    </section>
  )
}

function QA({ q, children }) {
  return (
    <details className="group rounded-lg border border-gray-800 bg-gray-900/50 p-4 open:bg-gray-900/70 transition-colors">
      <summary className="list-none cursor-pointer flex items-start justify-between gap-3">
        <h3 className="text-base font-medium text-gray-100">{q}</h3>
        <span className="ml-2 mt-0.5 text-yellow-400 group-open:rotate-180 transition-transform" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
        </span>
      </summary>
      <div className="mt-3 text-sm text-gray-300 leading-relaxed">
        {children}
      </div>
    </details>
  )
}

export default function FAQPage() {
  return (
    <>
      <Seo
        title="Park Model Homes FAQ | Firefly Tiny Homes"
        description="Find answers to everything about park model homes—and why Firefly Tiny Homes is your ideal online dealership for Champion Park Models."
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100">Park Model Homes FAQ</h1>
          <p className="mt-3 text-gray-300">
            Welcome to our FAQ section! Here’s everything you need to know about park model homes, Champion Park Model Homes, and the advantages of working with Firefly Tiny Homes—your online dealership for better pricing, personalized service, and the future of park model home buying.
          </p>
        </header>

        <Section title="Park Model Basics">
          <QA q="What is a park model home?">
            A park model home is a small, factory-built home on a wheeled chassis that is limited to 400 square feet of living space (not counting porches or lofts). Park models are perfect for downsizing, vacation properties, AirBNBs. or full-time living in areas where permitted.
          </QA>
          <QA q="Where can I place a park model home?">
            Park models can be placed in RV resorts, tiny home communities, mobile home parks, or on private land, depending on local zoning rules. Always check your city or county requirements before setting up your home. <a className="text-yellow-400 hover:underline" href="mailto:info@fireflytinyhomes.com">Contact us</a> if you need help.
          </QA>
          <QA q="Can I live in a park model full-time?">
            Yes, in many areas park models can be lived in full-time. Some places allow them only as seasonal or vacation residences. Firefly Tiny Homes can help you check local zoning to make sure your home is set up legally.
          </QA>
          <QA q="How big are park model homes?">
            By definition, park models are 399 sq. ft. or less, but many include lofts or porches that add usable space without counting toward that limit. Most are around 11–12 feet wide and 34–39 feet long.
          </QA>
          <QA q="How much do park model homes cost?">
            Prices vary widely by size, features, and finishes. Entry-level homes may start around $50,000–$70,000, while more upgraded or luxury models can exceed $100,000. Firefly Tiny Homes provides clear, upfront pricing with no hidden overhead costs. See our <a className="text-yellow-400 hover:underline" href="#models">Models &amp; Options</a>.
          </QA>
          <QA q="Can I finance a park model home?">
            Yes. Park models can qualify for RV loans, personal loans, or financing through specialty lenders. While they don’t always qualify for traditional mortgages, our team can connect you with financing options to make ownership simple.
          </QA>
          <QA q="Are park model homes good investments?">
            Park models are affordable, durable, and can generate rental income as vacation properties or short-term rentals. With proper maintenance, they hold their value well, especially in high-demand vacation or retirement destinations.
          </QA>
          <QA q="What about maintenance and energy efficiency?">
            Park models are built with modern materials, insulation, and energy-efficient appliances. They are low-maintenance compared to traditional houses, and their smaller size keeps utility bills affordable.
          </QA>
          <QA q="What are common pitfalls when buying a park model?">
            Some buyers overlook zoning rules, don’t budget for delivery and setup, or choose layouts that don’t fit their lifestyle. Working with Firefly ensures you avoid these mistakes by getting expert guidance from day one.
          </QA>
        </Section>

        <Section title="Champion Park Models">
          <QA q="Why choose Champion Park Models?">
            Champion is one of the most trusted names in the industry, with over 60 years of experience and multiple manufacturing facilities across the U.S. Champion Park Models are known for their quality, durability, and innovative designs that feel like a full-size home in a compact space.
          </QA>
          <QA q="What makes Champion’s park models unique?">
            Champion builds with full-size appliances, high ceilings, stylish finishes, and smart layouts. Their models balance efficiency with comfort, and they offer customizable options so you can create a home that matches your exact style and needs.
          </QA>
        </Section>

        <Section title="Why Firefly Tiny Homes">
          <QA q="Why partner with Firefly instead of a traditional dealership?">
            Because our dealership is primarily online, we don’t have the overhead costs of a brick-and-mortar dealership who have large lots with expensive models onsite. We pass those savings directly to you, giving us a competitive edge, and offering you better prices and more streamlined service.
          </QA>
          <QA q="How is the online dealership experience better?">
            You can browse models, customize your home, and complete the buying process from anywhere—no long drives to a sales lot required, and no hard-ball salesperson to contend with. Though our team of experts are always available for in-person or virtual consultations, that’s entirely optional, as our online purchase flow is simply and intuitive.
          </QA>
          <QA q="How are we paving the future of park model home buying?">
            The people have spoken, and just like the car industry shifted to online dealerships for customer convenience, we’re doing the same with park model homes. Firefly is at the forefront of this change, giving buyers a faster, smarter, and more affordable way to purchase their dream home.
          </QA>
        </Section>

        <Section title="Ordering, Delivery & Support">
          <QA q="How do I order a park model from Firefly?">
            Simply choose your model, pick any options or add-ons you’d like, and place your order with cash payment or financing. We immediately process your order, and get your home’s construction scheduled with the manufacturing team. Once they give us an ETA for completion, we schedule the delivery with one of our professional haulers, and update you with the final estimated delivery date.
          </QA>
          <QA q="How does delivery and setup work?">
            Your park model will be delivered on its chassis. You’ll need a prepared site and utility hookups. Firefly Tiny Homes works with trusted local contractors to handle delivery, leveling, tie-downs, and connections so you can move in with confidence.
          </QA>
          <QA q="Do your homes include inspections or warranties?">
            Yes. Every home undergoes factory inspections, and Champion provides warranties on workmanship and materials. Firefly also supports you through the delivery and setup stages to ensure your experience is stress-free and you are 100% satisfied with your new home.
          </QA>
        </Section>

        <div className="mt-10 p-4 rounded-lg border border-yellow-400/40 bg-yellow-400/10 text-sm text-gray-100">
          Didn’t find the answer you were looking for? Call us at <a className="text-yellow-400 hover:underline" href="tel:+18302646924">830-264-6924</a> or email <a className="text-yellow-400 hover:underline" href="mailto:office@fireflytinyhomes.com">office@fireflytinyhomes.com</a>.
        </div>
      </div>
    </>
  )
}


