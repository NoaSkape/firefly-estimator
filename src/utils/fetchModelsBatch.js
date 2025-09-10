export async function fetchModelsBatch(ids) {
  const list = Array.isArray(ids) ? ids.filter(Boolean) : []
  if (list.length === 0) return []

  try {
    const params = new URLSearchParams({ ids: list.join(',') })
    const res = await fetch(`/api/models/batch?${params.toString()}`)
    if (!res.ok) throw new Error(`Batch fetch failed: ${res.status}`)
    const data = await res.json()
    return Array.isArray(data?.models) ? data.models : []
  } catch (err) {
    // Fallback: fetch sequentially with small concurrency to avoid bursts
    const out = []
    for (const id of list) {
      try {
        const r = await fetch(`/api/models/${id}`)
        out.push(r.ok ? await r.json() : null)
      } catch {
        out.push(null)
      }
      // tiny delay to avoid spikes
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    return out
  }
}

export default fetchModelsBatch

