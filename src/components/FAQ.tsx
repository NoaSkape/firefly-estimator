export function FAQ() {
  const faqs = [
    { q: 'Are Firefly’s homes park model RVs in Texas?', a: 'Yes—our park model homes are classified as RVs in Texas and delivered factory-direct to your site.' },
    { q: 'Can I really order in under an hour?', a: 'Best-case, yes. Most buyers complete pre-approval and e-sign quickly; documentation needs can vary.' },
    { q: 'Do you offer financing?', a: 'Yes—modern, online financing with soft-pull pre-qualification to view offers fast.' },
    { q: 'Where do you deliver?', a: 'Statewide across Texas; we help coordinate site readiness and setup.' },
    { q: 'Can I customize my layout?', a: 'Absolutely—our design studio lets you select finishes and options with live pricing.' },
  ]
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/60">
      <div className="p-5">
        <h2 className="section-header">Frequently Asked Questions</h2>
        <dl className="mt-4 divide-y divide-gray-800">
          {faqs.map((f) => (
            <div key={f.q} className="py-4">
              <dt className="font-medium text-gray-100">{f.q}</dt>
              <dd className="mt-1 text-gray-300 text-sm">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}


