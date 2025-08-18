import { useLocation } from 'react-router-dom'

export default function Confirm() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const sessionId = params.get('session_id')
  return (
    <div className="max-w-xl mx-auto card text-center">
      <h2 className="section-header">Payment successful (TEST)</h2>
      {sessionId && (
        <p className="text-gray-600 dark:text-gray-300">Session: {sessionId}</p>
      )}
      <p className="text-gray-600 dark:text-gray-300 mt-2">Thanks! We’ll finalize this in our dashboard soon.</p>
      <a href="/portal" className="btn-primary inline-block mt-4">Go to Portal</a>
    </div>
  )
}



