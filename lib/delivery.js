import fs from 'node:fs'
import path from 'node:path'

let rates = null
function loadRates() {
  if (rates) return rates
  const file = path.join(process.cwd(), 'data', 'delivery-rates.json')
  rates = JSON.parse(fs.readFileSync(file, 'utf8'))
  return rates
}

export function quoteDelivery(zip) {
  const r = loadRates()
  const base = Number(r.defaultBase || 500)
  const perMile = Number(r.perMile || 3)
  // MVP: dummy distance by zip prefix
  const prefix = String(zip || '').slice(0, 3)
  const approxMiles = Math.max(50, 5 * Number(prefix || 100)) // not real, placeholder
  const price = Math.round(base + approxMiles * perMile)
  const etaRange = { weeksMin: 6, weeksMax: 16 }
  return { price, etaRange }
}


