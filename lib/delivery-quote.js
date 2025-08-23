// Compute driving distance using Google Distance Matrix or Mapbox Directions
// Returns { miles, originAddress, destinationAddress }
export async function computeDistanceMiles({ origin, destination, googleApiKey, mapboxToken }) {
  console.log('computeDistanceMiles called with:', { origin, destination, hasGoogleKey: !!googleApiKey, hasMapboxToken: !!mapboxToken })
  
  const src = (googleApiKey ? 'google' : (mapboxToken ? 'mapbox' : null))
  if (!src) {
    console.warn('No API key available for distance calculation')
    return { miles: 0, originAddress: origin, destinationAddress: destination }
  }

  try {
    if (src === 'google') {
      console.log('Using Google Distance Matrix API')
      const params = new URLSearchParams({
        origins: origin,
        destinations: destination,
        key: googleApiKey,
        departure_time: 'now',
        units: 'imperial',
      })
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`
      console.log('Google API URL:', url.replace(googleApiKey, '[API_KEY]'))
      
      const res = await fetch(url)
      const json = await res.json()
      console.log('Google API response status:', res.status, 'status:', json?.status)
      
      if (json?.status !== 'OK') {
        console.error('Google API error:', json?.error_message || json?.status)
        return { miles: 0, originAddress: origin, destinationAddress: destination }
      }
      
      const elem = json?.rows?.[0]?.elements?.[0]
      if (elem?.status !== 'OK') {
        console.error('Google API element error:', elem?.status)
        return { miles: 0, originAddress: origin, destinationAddress: destination }
      }
      
      const meters = elem?.distance?.value || 0
      const miles = meters / 1609.344
      console.log('Google calculation result:', { meters, miles })
      
      return { miles, originAddress: json?.origin_addresses?.[0] || origin, destinationAddress: json?.destination_addresses?.[0] || destination }
    }
    if (src === 'mapbox') {
      console.log('Using Mapbox Directions API')
      const coords = await geocodeMapboxPair({ origin, destination, token: mapboxToken })
      if (!coords) {
        console.error('Failed to geocode addresses with Mapbox')
        return { miles: 0, originAddress: origin, destinationAddress: destination }
      }
      const { o, d } = coords
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${o.lng},${o.lat};${d.lng},${d.lat}?access_token=${mapboxToken}&overview=false`
      const res = await fetch(url)
      const json = await res.json()
      const meters = json?.routes?.[0]?.distance || 0
      const miles = meters / 1609.344
      console.log('Mapbox calculation result:', { meters, miles })
      return { miles, originAddress: origin, destinationAddress: destination }
    }
  } catch (err) {
    console.error('Distance API error:', err?.message || err)
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
  console.log('getDeliveryQuote called with:', { destAddress, settings: !!settings })
  
  const origin = settings?.factory?.address || ''
  const rate = Number(settings?.pricing?.delivery_rate_per_mile || 12.5)
  const minimum = Number(settings?.pricing?.delivery_minimum || 2000) // Updated to $2000 minimum
  const googleKey = process.env.GOOGLE_MAPS_KEY || ''
  const mapboxToken = process.env.MAPBOX_TOKEN || ''

  console.log('Delivery calculation params:', { origin, rate, minimum, hasGoogleKey: !!googleKey, hasMapboxToken: !!mapboxToken })

  const { miles, originAddress, destinationAddress } = await computeDistanceMiles({ origin, destination: destAddress, googleApiKey: googleKey, mapboxToken })
  
  console.log('Distance calculation result:', { miles, originAddress, destinationAddress })
  
  // Calculate delivery fee: $2000 minimum, $12.50/mile after 120 miles
  let fee = minimum
  if (miles > 120) {
    const additionalMiles = miles - 120
    const additionalFee = additionalMiles * rate
    fee = Math.max(minimum, additionalFee)
  }
  
  const result = { miles, fee, ratePerMile: rate, minimum, originAddress, destinationAddress }
  console.log('Delivery quote result:', result)
  
  return result
}


