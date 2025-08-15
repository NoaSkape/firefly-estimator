import { useNavigate } from 'react-router-dom'

export default function Sign() {
  const navigate = useNavigate()
  function complete() { navigate('/checkout/confirm') }
  return (
    <div className="max-w-xl mx-auto card text-center">
      <h2 className="section-header">Purchase Agreement</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-4">E‑sign provider will be embedded here. (Stub)</p>
      <button className="btn-primary" onClick={complete}>Mark as Signed (stub)</button>
    </div>
  )
}


