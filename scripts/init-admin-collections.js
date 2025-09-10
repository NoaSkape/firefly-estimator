#!/usr/bin/env node

// Script to initialize admin database collections
// Run with: node -r dotenv/config scripts/init-admin-collections.js

import { getDb } from '../lib/db.js'

async function initializeAdminCollections() {
  try {
    console.log('🔧 Initializing admin database collections...')
    
    const db = await getDb()
    if (!db) {
      throw new Error('Database connection failed')
    }
    
    // Create blog_posts collection with sample data
    const blogPostsCollection = db.collection('blog_posts')
    const blogPostsCount = await blogPostsCollection.countDocuments()
    
    if (blogPostsCount === 0) {
      console.log('📝 Creating blog_posts collection with sample data...')
      
      const samplePosts = [
        {
          title: 'Welcome to Firefly Tiny Homes',
          content: 'Welcome to our blog! We\'re excited to share stories about tiny home living, design tips, and customer success stories.',
          status: 'published',
          publishDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          authorId: 'admin'
        },
        {
          title: 'Tiny Home Design Tips',
          content: 'Here are some essential design tips for making the most of your tiny home space...',
          status: 'draft',
          publishDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
          createdAt: new Date(),
          updatedAt: new Date(),
          authorId: 'admin'
        }
      ]
      
      await blogPostsCollection.insertMany(samplePosts)
      console.log('✅ Created blog_posts collection with sample data')
    } else {
      console.log('ℹ️ blog_posts collection already exists with', blogPostsCount, 'documents')
    }
    
    // Create policies collection with sample data
    const policiesCollection = db.collection('policies')
    const policiesCount = await policiesCollection.countDocuments()
    
    if (policiesCount === 0) {
      console.log('📄 Creating policies collection with sample data...')
      
      const samplePolicies = [
        {
          type: 'privacy',
          title: 'Privacy Policy',
          content: 'This privacy policy describes how Firefly Tiny Homes collects, uses, and protects your personal information...',
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: 'admin'
        },
        {
          type: 'terms',
          title: 'Terms and Conditions',
          content: 'These terms and conditions govern your use of the Firefly Tiny Homes website and services...',
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: 'admin'
        },
        {
          type: 'delivery',
          title: 'Delivery Policy',
          content: 'Our delivery policy outlines the terms and conditions for delivering your tiny home...',
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: 'admin'
        },
        {
          type: 'warranty',
          title: 'Warranty Information',
          content: 'Warranty information for Firefly Tiny Homes products and services...',
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: 'admin'
        }
      ]
      
      await policiesCollection.insertMany(samplePolicies)
      console.log('✅ Created policies collection with sample data')
    } else {
      console.log('ℹ️ policies collection already exists with', policiesCount, 'documents')
    }
    
    // Create analytics collection
    const analyticsCollection = db.collection('analytics')
    const analyticsCount = await analyticsCollection.countDocuments()
    
    if (analyticsCount === 0) {
      console.log('📊 Creating analytics collection...')
      
      // Create a sample analytics entry
      await analyticsCollection.insertOne({
        type: 'dashboard_metrics',
        date: new Date(),
        data: {
          totalUsers: 0,
          totalOrders: 0,
          totalRevenue: 0,
          activeBuilds: 0
        },
        createdAt: new Date()
      })
      
      console.log('✅ Created analytics collection')
    } else {
      console.log('ℹ️ analytics collection already exists with', analyticsCount, 'documents')
    }
    
    // Create indexes for optimal performance
    console.log('🔍 Creating indexes for optimal performance...')
    
    // Blog posts indexes
    await blogPostsCollection.createIndex({ createdAt: -1 })
    await blogPostsCollection.createIndex({ status: 1 })
    await blogPostsCollection.createIndex({ authorId: 1 })
    await blogPostsCollection.createIndex({ publishDate: -1 })
    
    // Policies indexes
    await policiesCollection.createIndex({ type: 1 }, { unique: true })
    await policiesCollection.createIndex({ updatedAt: -1 })
    
    // Analytics indexes
    await analyticsCollection.createIndex({ date: -1 })
    await analyticsCollection.createIndex({ type: 1 })
    
    console.log('✅ Created indexes for all collections')
    
    console.log('\n🎉 Admin database collections initialized successfully!')
    console.log('\nCollections created:')
    console.log('- blog_posts: Blog content management')
    console.log('- policies: Website policy content')
    console.log('- analytics: Performance metrics')
    
  } catch (error) {
    console.error('❌ Failed to initialize admin collections:', error)
    process.exit(1)
  }
}

// Run initialization if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeAdminCollections()
    .then(() => {
      console.log('\n✅ Initialization complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Initialization failed:', error)
      process.exit(1)
    })
}

export { initializeAdminCollections }
