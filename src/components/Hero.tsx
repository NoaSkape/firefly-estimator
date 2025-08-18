import React from 'react'
export function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="relative">
      <div className="relative z-10 px-6 py-16 sm:px-10 sm:py-20">
        <h1 id="hero-heading" className="-mt-12 text-3xl md:text-5xl font-bold text-white leading-tight">
          Texas’s #1 Online Park Model Home Dealership
        </h1>
        <p className="mt-12 text-lg text-gray-200 max-w-3xl">
          Shop, design, and order your brand-new park model tiny home online – all in less than 1 hour!
        </p>
        <div className="mt-14 md:mt-16 flex flex-wrap gap-3">
          <a href="/build" className="px-6 h-11 inline-flex items-center rounded bg-yellow-400 text-gray-900 font-semibold hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-gray-900">Start Your Build</a>
          <a href="/#how-it-works" className="px-6 h-11 inline-flex items-center rounded border border-gray-700 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-gray-900">Learn More</a>
        </div>
        {/* benefits moved to sidebar per latest request */}
      </div>
    </section>
  )
}


