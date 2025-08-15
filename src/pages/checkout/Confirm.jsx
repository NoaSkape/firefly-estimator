export default function Confirm() {
  return (
    <div className="max-w-xl mx-auto card text-center">
      <h2 className="section-header">Order Received</h2>
      <p className="text-gray-600 dark:text-gray-300">Thank you! Your order has been submitted. You will receive an email with the agreement and receipt.</p>
      <a href="/portal" className="btn-primary inline-block mt-4">Go to Portal</a>
    </div>
  )
}


