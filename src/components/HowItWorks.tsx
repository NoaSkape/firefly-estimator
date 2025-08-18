export function HowItWorks() {
  const steps = [
    {
      title: 'Pick your model and price it instantly',
      body: 'Explore curated park models and see transparent pricing.',
    },
    {
      title: 'Design your options with live monthly payment estimates',
      body: 'Dial in finishes and features with real-time finance estimates.',
    },
    {
      title: 'Finance or Pay Cash, e-sign, and schedule delivery',
      body: 'Fast online checkout and factory-direct delivery across Texas.',
    },
  ]
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {steps.map((s, idx) => (
        <div key={idx} className="rounded-lg border border-gray-800 bg-gray-900/60 p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-yellow-400 text-gray-900 font-semibold">{idx+1}</span>
            <h3 className="font-semibold text-gray-100">{s.title}</h3>
          </div>
          <p className="mt-3 text-sm text-gray-300">{s.body}</p>
        </div>
      ))}
    </div>
  )
}


