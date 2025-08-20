// Test script to debug build data
import { getDb } from './lib/db.js'
import { BUILDS_COLLECTION } from './lib/builds.js'

async function debugBuilds() {
  try {
    const db = await getDb()
    const col = db.collection(BUILDS_COLLECTION)
    
    // Get all builds
    const builds = await col.find({}).toArray()
    console.log(`Found ${builds.length} builds in database:`)
    
    builds.forEach((build, i) => {
      console.log(`\nBuild ${i + 1}:`)
      console.log(`  ID: ${build._id}`)
      console.log(`  Model: ${build.modelName} (${build.modelSlug})`)
      console.log(`  Base Price in selections: ${build.selections?.basePrice}`)
      console.log(`  Pricing object:`, build.pricing)
      console.log(`  Options count: ${build.selections?.options?.length || 0}`)
    })
    
    // Check if any builds are missing base price
    const missingBasePrice = builds.filter(b => !b.selections?.basePrice)
    if (missingBasePrice.length > 0) {
      console.log(`\n⚠️  ${missingBasePrice.length} builds missing base price:`)
      missingBasePrice.forEach(b => {
        console.log(`  - ${b.modelName} (${b.modelSlug})`)
      })
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

debugBuilds()
