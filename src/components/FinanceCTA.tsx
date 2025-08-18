export function FinanceCTA() {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-sm text-gray-200">Checking your options won’t affect your credit. See real offers in minutes.</p>
      <div className="flex gap-2 w-full sm:w-auto">
        <input aria-label="Email or phone" placeholder="Email or phone (optional)" className="flex-1 min-w-0 px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
        <a href="/checkout?mode=finance" className="px-4 py-2 rounded bg-yellow-400 text-gray-900 font-medium hover:bg-yellow-300 whitespace-nowrap">Get Pre-Approved</a>
      </div>
    </div>
  )
}


