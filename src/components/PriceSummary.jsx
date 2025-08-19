export default function PriceSummary({ pricing }) {
  const base = Number(pricing?.base || 0)
  const options = Number(pricing?.options || 0)
  const delivery = Number(pricing?.delivery || 0)
  const setup = Number(pricing?.setup || 0)
  const tax = Number(pricing?.tax || 0)
  const total = Number(pricing?.total || base + options + delivery + setup + tax)
  return (
    <div className="w-72 card sticky top-4">
      <div className="font-semibold mb-2">Price Summary</div>
      <div className="text-sm text-gray-200 space-y-1">
        <div className="flex justify-between"><span>Base</span><span>${base.toLocaleString()}</span></div>
        <div className="flex justify-between"><span>Options</span><span>${options.toLocaleString()}</span></div>
        <div className="flex justify-between"><span>Delivery</span><span>${delivery.toLocaleString()}</span></div>
        <div className="flex justify-between"><span>Setup</span><span>${setup.toLocaleString()}</span></div>
        <div className="flex justify-between"><span>Tax</span><span>${tax.toLocaleString()}</span></div>
        <div className="flex justify-between font-semibold border-t border-gray-800 pt-2"><span>Total</span><span>${total.toLocaleString()}</span></div>
      </div>
    </div>
  )
}


