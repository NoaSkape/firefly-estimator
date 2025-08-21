export function SiteSidebar() {
  return (
    <aside className="sticky top-24 space-y-4">
      <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4">
        <h3 className="text-sm font-semibold text-gray-100">Have Questions?</h3>
        <p className="text-sm text-gray-300 mt-2">We’re here to help.</p>
        <div className="mt-3 flex flex-col gap-2">
          <a className="px-3 py-2 rounded border border-gray-700 text-white hover:bg-white/10" href="tel:+18302412410" aria-label="Call Firefly Tiny Homes">Call</a>
          <a className="px-3 py-2 rounded border border-gray-700 text-white hover:bg-white/10" href="sms:+18302412410" aria-label="Text Firefly Tiny Homes">Text</a>
          <a className="px-3 py-2 rounded border border-gray-700 text-white hover:bg-white/10" href="mailto:office@fireflytinyhomes.com" aria-label="Email Firefly Tiny Homes">Email</a>
        </div>
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4">
        <h3 className="text-sm font-semibold text-gray-100">Your Home Delivery ETA</h3>
        <p className="text-2xl font-semibold text-gray-100 mt-2">2–3 months</p>
        <p className="text-xs italic text-gray-400">depending on volume</p>
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4">
        <h3 className="text-sm font-semibold text-gray-100">Why Choose Firefly Tiny Homes?</h3>
        <ul className="mt-2 space-y-2 text-sm text-gray-200">
          {[
            'No high-pressure sales',
            'Transparent pricing',
            'Easy financing',
            'Fast delivery',
            'Factory-direct prices',
            'Texas-based dealership',
            'Bulk options',
            'Manufacturer + dealership warranty',
            'Excellent customer service & communication',
            '5-star dealership rating',
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-gray-900">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}


