export default function ConfirmLeaveModal({ open, onSaveLeave, onDiscard, onStay, saving }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-5 text-gray-100 shadow-xl">
        <h2 className="text-lg font-semibold mb-2">Save changes before leaving?</h2>
        <p className="text-sm text-gray-300 mb-4">You have unsaved changes. Choose an option below.</p>
        <div className="flex items-center justify-end gap-2">
          <button className="px-3 py-2 rounded border border-gray-700" onClick={onDiscard}>Discard</button>
          <button className="px-3 py-2 rounded border border-gray-700" onClick={onStay}>Stay</button>
          <button className="btn-primary" onClick={onSaveLeave} disabled={saving}>{saving ? 'Saving…' : 'Save & Leave'}</button>
        </div>
      </div>
    </div>
  )
}


