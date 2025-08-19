import { Seo } from '../../components/Seo'
import { Link } from 'react-router-dom'

function Step({ n, title, body }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-yellow-400 text-gray-900 font-semibold">{n}</span>
        <h3 className="font-semibold text-gray-100">{title}</h3>
      </div>
      <p className="mt-3 text-sm text-gray-300">{body}</p>
    </div>
  )
}

export default function HowItWorks() {
  return (
    <>
      <Seo
        title="How It Works | Firefly Tiny Homes"
        description="Choose & design your Champion Park Model, secure payment or financing, then schedule delivery & setup across Texas."
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100">How It Works</h1>
          <p className="mt-2 text-gray-300">Three simple steps from dream to delivery.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Step n={1} title="Choose & Design" body="Pick your model, customize options and packages, and lock your price." />
          <Step n={2} title="Secure Your Home" body="Pay cash securely or apply financing. E‑sign your purchase docs online." />
          <Step n={3} title="Delivery & Setup" body="We coordinate delivery, leveling, tie‑downs, and connections with trusted pros." />
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/how/ordering" className="card hover:bg-gray-900/70 transition-colors">
            <h2 className="text-lg font-semibold text-gray-100">Ordering</h2>
            <p className="text-sm text-gray-300 mt-2">Design confirmation, signed agreement, deposit, and scheduling.</p>
          </Link>
          <Link to="/how/delivery" className="card hover:bg-gray-900/70 transition-colors">
            <h2 className="text-lg font-semibold text-gray-100">Delivery</h2>
            <p className="text-sm text-gray-300 mt-2">Site prep checklist, what to expect on delivery day, and setup.</p>
          </Link>
          <Link to="/how/warranty" className="card hover:bg-gray-900/70 transition-colors">
            <h2 className="text-lg font-semibold text-gray-100">Warranty & Support</h2>
            <p className="text-sm text-gray-300 mt-2">Champion warranty coverage + Firefly support through setup & beyond.</p>
          </Link>
          <Link to="/how/why-buy-online" className="card hover:bg-gray-900/70 transition-colors">
            <h2 className="text-lg font-semibold text-gray-100">Why Buy Online</h2>
            <p className="text-sm text-gray-300 mt-2">Lower overhead, transparent pricing, and a faster, smarter process.</p>
          </Link>
        </div>
      </div>
    </>
  )
}


