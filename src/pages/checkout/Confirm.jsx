import { useLocation } from 'react-router-dom'

import CheckoutProgress from '../../components/CheckoutProgress'
export default function Confirm() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const sessionId = params.get('session_id')
  return (
    <div className="max-w-2xl mx-auto">
      <CheckoutProgress step={5} />
      <div className="card text-center">
        <h2 className="section-header">Order Received</h2>
        <p className="text-gray-600 dark:text-gray-300">Thank you! Your order has been submitted. You will receive an email with the agreement and receipt.</p>
        {sessionId && (
          <p className="text-gray-500 dark:text-gray-400 mt-2">Stripe Session: {sessionId}</p>
        )}
        <a href="/portal" className="btn-primary inline-block mt-4">Go to Portal</a>
      </div>
    </div>
  )
}



