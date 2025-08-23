// Compute driving distance using Google Distance Matrix or Mapbox Directions
// Returns { miles, originAddress, destinationAddress }
export async function computeDistanceMiles({ origin, destination, googleApiKey, mapboxToken }) {
  const src = (googleApiKey ? 'google' : (mapboxToken ? 'mapbox' : null))
  if (!src) return { miles: 0, originAddress: origin, destinationAddress: destination }

  try {
    if (src === 'google') {
      const params = new URLSearchParams({
        origins: origin,
        destinations: destination,
        key: googleApiKey,
        departure_time: 'now',
        units: 'imperial',
      })
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`
      const res = await fetch(url)
      const json = await res.json()
      const elem = json?.rows?.[0]?.elements?.[0]
      const meters = elem?.distance?.value || 0
      const miles = meters / 1609.344
      return { miles, originAddress: json?.origin_addresses?.[0] || origin, destinationAddress: json?.destination_addresses?.[0] || destination }
    }
    if (src === 'mapbox') {
      const coords = await geocodeMapboxPair({ origin, destination, token: mapboxToken })
      if (!coords) return { miles: 0, originAddress: origin, destinationAddress: destination }
      const { o, d } = coords
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${o.lng},${o.lat};${d.lng},${d.lat}?access_token=${mapboxToken}&overview=false`
      const res = await fetch(url)
      const json = await res.json()
      const meters = json?.routes?.[0]?.distance || 0
      const miles = meters / 1609.344
      return { miles, originAddress: origin, destinationAddress: destination }
    }
  } catch (err) {
    console.warn('Distance API error', err?.message || err)
  }
  return { miles: 0, originAddress: origin, destinationAddress: destination }
}

async function geocodeMapboxPair({ origin, destination, token }) {
  try {
    const [o, d] = await Promise.all([
      geocodeMapbox(origin, token),
      geocodeMapbox(destination, token),
    ])
    if (!o || !d) return null
    return { o, d }
  } catch { return null }
}

async function geocodeMapbox(query, token) {
  const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&access_token=${token}`
  const res = await fetch(url)
  const json = await res.json()
  const f = json?.features?.[0]
  if (!f) return null
  const [lng, lat] = f?.geometry?.coordinates || []
  return { lat, lng }
}

export function roundToCents(n) { return Math.round(Number(n || 0) * 100) / 100 }

export async function getDeliveryQuote(destAddress, settings) {
  const origin = settings?.factory?.address || ''
  const rate = Number(settings?.pricing?.delivery_rate_per_mile || 12.5)
  const minimum = Number(settings?.pricing?.delivery_minimum || 1500) // Updated to $1500 minimum
  const googleKey = process.env.GOOGLE_MAPS_KEY || ''
  const mapboxToken = process.env.MAPBOX_TOKEN || ''

  const { miles, originAddress, destinationAddress } = await computeDistanceMiles({ origin, destination: destAddress, googleApiKey: googleKey, mapboxToken })
  
  // Calculate delivery fee: $1500 minimum, $12.50/mile after 120 miles
  let fee = minimum
  if (miles > 120) {
    const additionalMiles = miles - 120
    const additionalFee = additionalMiles * rate
    fee = Math.max(minimum, additionalFee)
  }
  
  return { miles, fee, ratePerMile: rate, minimum, originAddress, destinationAddress }
}


