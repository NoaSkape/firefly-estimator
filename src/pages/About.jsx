import { Seo } from '../components/Seo'

export default function About() {
  return (
    <>
      <Seo
        title="About Firefly Tiny Homes | Online Park Model Dealership"
        description="Firefly Tiny Homes is Texas’s online dealership for Champion Park Models. Learn how buying online saves you thousands with transparent pricing and modern service."
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100">About Firefly Tiny Homes</h1>
          <p className="mt-2 text-gray-300">Texas’s online dealership for Champion Park Model Homes—built for transparency, speed, and savings.</p>
        </header>

        <section className="card">
          <h2 className="text-lg font-semibold text-gray-100">Our Story</h2>
          <p className="mt-2 text-sm text-gray-300 leading-relaxed">
            Firefly Tiny Homes was founded to make park model home buying simple and modern. Instead of a
            large sales lot with high overhead, we built a streamlined online experience that connects you
            directly with the factory. The result: faster timelines, transparent pricing, and real savings.
          </p>
        </section>

        <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="text-base font-semibold text-gray-100">Why Online Saves You Money</h3>
            <ul className="mt-3 text-sm text-gray-300 list-disc list-inside space-y-1">
              <li>Lower overhead vs traditional dealerships</li>
              <li>No hidden lot fees or surprise markups</li>
              <li>Factory-direct scheduling and communication</li>
              <li>Digital contracts and payments for a faster close</li>
            </ul>
          </div>
          <div className="card">
            <h3 className="text-base font-semibold text-gray-100">Traditional Dealer vs Firefly</h3>
            <ul className="mt-3 text-sm text-gray-300 list-disc list-inside space-y-1">
              <li><span className="font-medium">Traditional:</span> high lot overhead, slow quotes, salesperson pressure</li>
              <li><span className="font-medium">Firefly:</span> transparent pricing, online design, expert help when you want it</li>
              <li><span className="font-medium">Traditional:</span> paper contracts and weeks of back‑and‑forth</li>
              <li><span className="font-medium">Firefly:</span> digital e‑sign + payment—secure and convenient</li>
            </ul>
          </div>
        </section>

        <section className="mt-6 card">
          <h3 className="text-base font-semibold text-gray-100">Proudly Serving the Texas Hill Country</h3>
          <p className="mt-2 text-sm text-gray-300">
            Based in Pipe Creek, our team supports customers across Texas—from design through delivery and setup.
            Visit our FAQ, explore models, or <a className="text-yellow-500 hover:underline" href="/contact">contact us</a> for help.
          </p>
        </section>
      </div>
    </>
  )
}


