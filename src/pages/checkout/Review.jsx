import CheckoutProgress from '../../components/CheckoutProgress'

export default function Review() {
  let cart = {}
  try { cart = JSON.parse(localStorage.getItem('ff.cart') || '{}') } catch {}
  const buyer = JSON.parse(localStorage.getItem('ff.checkout.buyer') || '{}')
  const method = localStorage.getItem('ff.checkout.paymentMethod') || ''

  const { model, selections = [], pricing = {} } = cart
  const rows = [
    { label: 'Base', value: pricing.base || 0 },
    { label: 'Options', value: pricing.options || 0 },
    { label: 'Delivery', value: pricing.delivery || 0 },
  ]
  const total = pricing.total || rows.reduce((s,r)=>s+r.value,0)

  return (
    <div>
      <CheckoutProgress step={4} />
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="section-header">Review & Sign</h1>
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-100">Order Summary</h2>
          <p className="text-sm text-gray-300">{model?.name} ({model?.modelCode})</p>
          <ul className="mt-3 text-sm text-gray-300 list-disc list-inside">
            {selections.map((s, i) => (<li key={i}>{s.label} (+${(s.priceDelta||0).toLocaleString()})</li>))}
          </ul>
          <div className="mt-3 text-sm text-gray-200">
            {rows.map(r => (
              <div key={r.label} className="flex justify-between"><span>{r.label}</span><span>${r.value.toLocaleString()}</span></div>
            ))}
            <div className="flex justify-between font-semibold border-t border-gray-800 pt-2"><span>Total</span><span>${total.toLocaleString()}</span></div>
          </div>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-100">Buyer & Delivery</h2>
          <p className="text-sm text-gray-300">{buyer.firstName} {buyer.lastName} • {buyer.email}</p>
          <p className="text-sm text-gray-300">{buyer.address} {buyer.city} {buyer.state} {buyer.zip}</p>
          <p className="text-sm text-gray-300 mt-1">Payment Method: <span className="font-medium">{method || '—'}</span></p>
        </div>
        <div className="flex gap-3">
          <button
            className="btn-primary"
            onClick={async () => {
              const orderId = localStorage.getItem('ff.orderId')
              if (!orderId) { alert('Missing order id'); return }
              try {
                const res = await fetch('/api/esign/create', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ orderId })
                })
                const data = await res.json()
                if (data?.url) window.location.assign(data.url)
                else alert('Could not start signing')
              } catch (e) { alert('Could not start signing') }
            }}
          >
            Sign & Submit
          </button>
        </div>
      </div>
    </div>
  )
}


