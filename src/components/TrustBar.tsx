export function TrustBar() {
  // Thin prompt above a pulsing arrow to draw attention to models
  return (
    <div className="mt-24 mb-24 sm:mb-28 md:mb-32 flex flex-col items-center">
      <div className="text-center text-xl sm:text-2xl font-semibold text-white">Ready to Save Thousands vs. Traditional Dealerships?</div>
      <a href="#models" aria-label="Scroll to models" className="mt-3">
        <div aria-hidden="true" className="animate-arrow-glow">
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14"/>
            <path d="M19 12l-7 7-7-7"/>
          </svg>
        </div>
      </a>
    </div>
  )
}


