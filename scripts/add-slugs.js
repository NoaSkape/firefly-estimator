import 'dotenv/config'
import { MongoClient } from 'mongodb'
import { slugifyName } from '../lib/model-utils.js'

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable')
  process.exit(1)
}

async function addSlugs() {
  const client = new MongoClient(MONGODB_URI)
  try {
    await client.connect()
    const db = client.db()
    const collection = db.collection('baseModels')

    // Ensure index for slug
    await collection.createIndex({ slug: 1 }, { unique: true, sparse: true })

    const cursor = collection.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] })
    const existingSlugs = new Set(
      (await collection.find({ slug: { $exists: true, $ne: '' } }, { projection: { slug: 1 } }).toArray()).map(
        d => d.slug
      )
    )

    let updatedCount = 0
    while (await cursor.hasNext()) {
      const doc = await cursor.next()
      if (!doc) continue

      let base = slugifyName(doc.name || doc.subtitle || doc.modelCode)
      if (!base) continue

      let candidate = base
      let suffix = 1
      while (existingSlugs.has(candidate)) {
        candidate = `${base}-${suffix++}`
      }
      existingSlugs.add(candidate)

      await collection.updateOne(
        { _id: doc._id },
        { $set: { slug: candidate, updatedAt: new Date() } }
      )
      updatedCount++
      console.log(`Set slug for ${doc.modelCode}: ${candidate}`)
    }

    console.log(`Done. Updated ${updatedCount} documents with slugs.`)
  } catch (err) {
    console.error('Slug migration failed:', err)
    process.exit(1)
  } finally {
    await client.close()
  }
}

addSlugs()

