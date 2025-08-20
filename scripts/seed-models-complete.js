#!/usr/bin/env node

import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import { MODELS } from '../src/data/models.js'
import { OPTIONS } from '../src/data/options.js'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/firefly-estimator'
const MODELS_COLLECTION = process.env.MODELS_COLLECTION || 'Models'

async function seedModels() {
  let client
  
  try {
    console.log('🔗 Connecting to MongoDB...')
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    
    const db = client.db()
    const collection = db.collection(MODELS_COLLECTION)
    
    console.log('🗑️  Clearing existing models...')
    await collection.deleteMany({})
    
    console.log('📦 Loading models with option catalog...')
    
    // Create option catalog from OPTIONS data
    const optionCatalog = []
    for (const group of OPTIONS) {
      const subject = group?.subject || 'General'
      const items = Array.isArray(group?.items) ? group.items : []
      for (const item of items) {
        optionCatalog.push({
          id: item.id,
          name: item.name,
          price: Number(item.price || 0),
          description: item.description || '',
          group: subject
        })
      }
    }
    
    console.log(`📋 Created option catalog with ${optionCatalog.length} items`)
    
    // Transform models and add option catalog
    const modelsToInsert = MODELS.map(model => ({
      id: model.id,
      name: model.name,
      subtitle: model.subtitle,
      basePrice: Number(model.basePrice || 0),
      description: model.description || '',
      specs: {
        width: model.specs?.width || '',
        length: model.specs?.length || '',
        height: model.specs?.height || '',
        weight: model.specs?.weight || '',
        bedrooms: model.specs?.bedrooms || 1,
        bathrooms: model.specs?.bathrooms || 1,
        squareFeet: (() => {
          const lengthNum = parseFloat((model.specs?.length || '').replace(/['"]/g, ''))
          const widthNum = parseFloat((model.specs?.width || '').replace(/['"]/g, ''))
          return isNaN(lengthNum) || isNaN(widthNum) ? null : Math.round(lengthNum * widthNum)
        })()
      },
      features: model.features || [],
      packages: model.packages || [
        {
          key: 'comfort-xtreme',
          name: 'Comfort Xtreme',
          priceDelta: 3500,
          description: 'HVAC mini‑split, insulation upgrades, blackout shades.',
          items: ['Mini‑split HVAC', 'Upgraded insulation', 'Blackout shades']
        },
        {
          key: 'chefs-pick',
          name: "Chef's Pick",
          priceDelta: 5200,
          description: 'Solid-surface counters, gas range, deep sink, pull‑outs.',
          items: ['Solid-surface counters', 'Gas range', 'Deep sink']
        },
        {
          key: 'cozy-cottage',
          name: 'Cozy Cottage',
          priceDelta: 2800,
          description: 'Wood accents, warm lighting, upgraded trim.',
          items: ['Wood accents', 'Warm lighting', 'Upgraded trim']
        },
        {
          key: 'ultra',
          name: 'Ultra',
          priceDelta: 7400,
          description: 'Premium finishes across kitchen, bath and exterior.',
          items: ['Premium finishes', 'Exterior lighting', 'Tile shower']
        }
      ],
      addOns: model.addOns || [
        {
          id: 'awnings',
          name: 'Window Awnings',
          priceDelta: 900,
          description: 'Add charm and shade with custom awnings.'
        },
        {
          id: 'skylight',
          name: 'Skylight',
          priceDelta: 650,
          description: 'Bring in natural light with a roof skylight.'
        }
      ],
      optionCatalog,
      images: model.images || [],
      slug: model.id.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      createdAt: new Date(),
      updatedAt: new Date()
    }))
    
    console.log(`📝 Inserting ${modelsToInsert.length} models...`)
    const result = await collection.insertMany(modelsToInsert)
    
    console.log('✅ Successfully seeded models!')
    console.log(`📊 Inserted ${result.insertedCount} models`)
    
    // Create indexes
    console.log('🔍 Creating indexes...')
    await collection.createIndex({ id: 1 }, { unique: true })
    await collection.createIndex({ slug: 1 })
    await collection.createIndex({ basePrice: 1 })
    await collection.createIndex({ createdAt: -1 })
    
    console.log('✅ Indexes created successfully!')
    
    // Display summary
    console.log('\n📋 Model Summary:')
    modelsToInsert.forEach(model => {
      console.log(`  • ${model.name} (${model.subtitle}) - $${model.basePrice.toLocaleString()}`)
    })
    
    console.log(`\n📦 Option Catalog: ${optionCatalog.length} items across ${new Set(optionCatalog.map(o => o.group)).size} groups`)
    
    // Show option groups
    const groups = {}
    optionCatalog.forEach(option => {
      if (!groups[option.group]) groups[option.group] = 0
      groups[option.group]++
    })
    
    console.log('\n📂 Option Groups:')
    Object.entries(groups).forEach(([group, count]) => {
      console.log(`  • ${group}: ${count} items`)
    })
    
  } catch (error) {
    console.error('❌ Error seeding models:', error)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
      console.log('🔌 Disconnected from MongoDB')
    }
  }
}

// Run the seed function
seedModels().then(() => {
  console.log('🎉 Seeding completed successfully!')
  process.exit(0)
}).catch(error => {
  console.error('💥 Seeding failed:', error)
  process.exit(1)
})
