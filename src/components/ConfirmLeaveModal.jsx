import { useEffect, useRef } from 'react'

export default function ConfirmLeaveModal({ open, onSaveLeave, onDiscard, onStay, saving }) {
  const dialogRef = useRef(null)
  const previouslyFocused = useRef(null)
  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement
    const el = dialogRef.current
    if (el) {
      const focusables = el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      focusables[0]?.focus()
    }
    function onKey(e) {
      if (e.key === 'Escape') onStay?.()
      if (e.key === 'Tab') {
        const focusables = dialogRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if (!focusables || focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      try { previouslyFocused.current?.focus() } catch {}
    }
  }, [open, onStay])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" role="dialog" aria-modal="true">
      <div ref={dialogRef} className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-5 text-gray-100 shadow-xl">
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


