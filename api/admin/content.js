// Content Management API
// Provides comprehensive blog and policy management capabilities

import express from 'express'
import { z } from 'zod'
import { getDb } from '../../lib/db.js'
import { validateRequest } from '../../lib/requestValidation.js'
import { adminAuth } from '../../lib/adminAuth.js'

const router = express.Router()

// Admin authentication middleware for all routes
router.use((req, res, next) => adminAuth.validateAdminAccess(req, res, next))

// Blog post schema
const blogPostSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  content: z.string().min(1),
  excerpt: z.string().max(500).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  featured: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  publishDate: z.string().datetime().optional(),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  featuredImage: z.string().url().optional(),
  authorId: z.string().optional()
})

// Policy schema
const policySchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  content: z.string().min(1),
  type: z.enum(['privacy', 'terms', 'warranty', 'delivery', 'payment', 'return', 'other']),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  effectiveDate: z.string().datetime().optional(),
  version: z.string().default('1.0'),
  lastUpdated: z.string().datetime().optional()
})

// ============================================================================
// BLOG MANAGEMENT ENDPOINTS
// ============================================================================

// Get all blog posts with filtering and pagination
router.get('/blog', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      tag,
      search,
      sort = 'createdAt',
      order = 'desc'
    } = req.query

    const db = await getDb()
    const blogCollection = db.collection('blog_posts')

    // Build filter
    const filter = {}
    if (status) filter.status = status
    if (category) filter.category = category
    if (tag) filter.tags = { $in: [tag] }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } }
      ]
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const sortOrder = order === 'desc' ? -1 : 1

    // Get posts
    const posts = await blogCollection
      .find(filter)
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray()

    // Get total count
    const total = await blogCollection.countDocuments(filter)

    // Get categories and tags for filters
    const categories = await blogCollection.distinct('category')
    const tags = await blogCollection.distinct('tags')

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        filters: {
          categories: categories.filter(Boolean),
          tags: tags.flat().filter(Boolean)
        }
      }
    })
  } catch (error) {
    console.error('Blog posts API error:', error)
    res.status(500).json({ error: 'Failed to fetch blog posts' })
  }
})

// Get single blog post
router.get('/blog/:slug', async (req, res) => {
  try {
    const { slug } = req.params
    const db = await getDb()
    const blogCollection = db.collection('blog_posts')

    const post = await blogCollection.findOne({ slug })
    
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' })
    }

    res.json({
      success: true,
      data: post
    })
  } catch (error) {
    console.error('Blog post detail API error:', error)
    res.status(500).json({ error: 'Failed to fetch blog post' })
  }
})

// Create new blog post
router.post('/blog', async (req, res) => {
  try {
    const postData = await validateRequest(req, blogPostSchema)
    const db = await getDb()
    const blogCollection = db.collection('blog_posts')

    // Check if slug already exists
    const existingPost = await blogCollection.findOne({ slug: postData.slug })
    if (existingPost) {
      return res.status(400).json({ error: 'Slug already exists' })
    }

    // Add metadata
    const newPost = {
      ...postData,
      authorId: postData.authorId || req.adminUser?.userId || 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      views: 0,
      likes: 0
    }

    // Set publish date if publishing
    if (postData.status === 'published' && !postData.publishDate) {
      newPost.publishDate = new Date()
    }

    const result = await blogCollection.insertOne(newPost)

    // Create audit log
    await db.collection('audit_logs').insertOne({
      resource: 'blog_post',
      resourceId: result.insertedId,
      action: 'create',
      changes: postData,
      userId: req.adminUser?.userId || 'system',
      timestamp: new Date(),
      severity: 'info'
    })

    res.status(201).json({
      success: true,
      data: { _id: result.insertedId, ...newPost }
    })
  } catch (error) {
    console.error('Blog post creation API error:', error)
    res.status(500).json({ error: 'Failed to create blog post' })
  }
})

// Update blog post
router.patch('/blog/:slug', async (req, res) => {
  try {
    const { slug } = req.params
    const updateData = await validateRequest(req, blogPostSchema.partial())
    
    const db = await getDb()
    const blogCollection = db.collection('blog_posts')

    // Check if post exists
    const existingPost = await blogCollection.findOne({ slug })
    if (!existingPost) {
      return res.status(404).json({ error: 'Blog post not found' })
    }

    // Check slug uniqueness if changing
    if (updateData.slug && updateData.slug !== slug) {
      const slugExists = await blogCollection.findOne({ 
        slug: updateData.slug,
        _id: { $ne: existingPost._id }
      })
      if (slugExists) {
        return res.status(400).json({ error: 'Slug already exists' })
      }
    }

    // Prepare update
    const updateFields = {
      ...updateData,
      updatedAt: new Date()
    }

    // Set publish date if publishing for the first time
    if (updateData.status === 'published' && existingPost.status !== 'published' && !updateData.publishDate) {
      updateFields.publishDate = new Date()
    }

    const result = await blogCollection.updateOne(
      { slug },
      { $set: updateFields }
    )

    if (result.modifiedCount === 0) {
      return res.status(400).json({ error: 'No changes made to blog post' })
    }

    // Create audit log
    await db.collection('audit_logs').insertOne({
      resource: 'blog_post',
      resourceId: existingPost._id,
      action: 'update',
      changes: updateData,
      userId: req.adminUser?.userId || 'system',
      timestamp: new Date(),
      severity: 'info'
    })

    // Get updated post
    const updatedPost = await blogCollection.findOne({ slug: updateData.slug || slug })

    res.json({
      success: true,
      data: updatedPost
    })
  } catch (error) {
    console.error('Blog post update API error:', error)
    res.status(500).json({ error: 'Failed to update blog post' })
  }
})

// Delete blog post
router.delete('/blog/:slug', async (req, res) => {
  try {
    const { slug } = req.params
    const db = await getDb()
    const blogCollection = db.collection('blog_posts')

    const post = await blogCollection.findOne({ slug })
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' })
    }

    await blogCollection.deleteOne({ slug })

    // Create audit log
    await db.collection('audit_logs').insertOne({
      resource: 'blog_post',
      resourceId: post._id,
      action: 'delete',
      changes: { deleted: true },
      userId: req.adminUser?.userId || 'system',
      timestamp: new Date(),
      severity: 'warning'
    })

    res.json({
      success: true,
      message: 'Blog post deleted successfully'
    })
  } catch (error) {
    console.error('Blog post deletion API error:', error)
    res.status(500).json({ error: 'Failed to delete blog post' })
  }
})

// ============================================================================
// POLICY MANAGEMENT ENDPOINTS
// ============================================================================

// Get all policies
router.get('/policies', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      search,
      sort = 'updatedAt',
      order = 'desc'
    } = req.query

    const db = await getDb()
    const policiesCollection = db.collection('policies')

    // Build filter
    const filter = {}
    if (type) filter.type = type
    if (status) filter.status = status
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ]
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const sortOrder = order === 'desc' ? -1 : 1

    // Get policies
    const policies = await policiesCollection
      .find(filter)
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray()

    // Get total count
    const total = await policiesCollection.countDocuments(filter)

    // Get policy types for filters
    const types = await policiesCollection.distinct('type')

    res.json({
      success: true,
      data: {
        policies,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        filters: {
          types
        }
      }
    })
  } catch (error) {
    console.error('Policies API error:', error)
    res.status(500).json({ error: 'Failed to fetch policies' })
  }
})

// Get single policy
router.get('/policies/:slug', async (req, res) => {
  try {
    const { slug } = req.params
    const db = await getDb()
    const policiesCollection = db.collection('policies')

    const policy = await policiesCollection.findOne({ slug })
    
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' })
    }

    res.json({
      success: true,
      data: policy
    })
  } catch (error) {
    console.error('Policy detail API error:', error)
    res.status(500).json({ error: 'Failed to fetch policy' })
  }
})

// Create new policy
router.post('/policies', async (req, res) => {
  try {
    const policyData = await validateRequest(req, policySchema)
    const db = await getDb()
    const policiesCollection = db.collection('policies')

    // Check if slug already exists
    const existingPolicy = await policiesCollection.findOne({ slug: policyData.slug })
    if (existingPolicy) {
      return res.status(400).json({ error: 'Slug already exists' })
    }

    // Add metadata
    const newPolicy = {
      ...policyData,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.adminUser?.userId || 'system'
    }

    // Set effective date if activating
    if (policyData.status === 'active' && !policyData.effectiveDate) {
      newPolicy.effectiveDate = new Date()
    }

    const result = await policiesCollection.insertOne(newPolicy)

    // Create audit log
    await db.collection('audit_logs').insertOne({
      resource: 'policy',
      resourceId: result.insertedId,
      action: 'create',
      changes: policyData,
      userId: req.adminUser?.userId || 'system',
      timestamp: new Date(),
      severity: 'info'
    })

    res.status(201).json({
      success: true,
      data: { _id: result.insertedId, ...newPolicy }
    })
  } catch (error) {
    console.error('Policy creation API error:', error)
    res.status(500).json({ error: 'Failed to create policy' })
  }
})

// Update policy
router.patch('/policies/:slug', async (req, res) => {
  try {
    const { slug } = req.params
    const updateData = await validateRequest(req, policySchema.partial())
    
    const db = await getDb()
    const policiesCollection = db.collection('policies')

    // Check if policy exists
    const existingPolicy = await policiesCollection.findOne({ slug })
    if (!existingPolicy) {
      return res.status(404).json({ error: 'Policy not found' })
    }

    // Check slug uniqueness if changing
    if (updateData.slug && updateData.slug !== slug) {
      const slugExists = await policiesCollection.findOne({ 
        slug: updateData.slug,
        _id: { $ne: existingPolicy._id }
      })
      if (slugExists) {
        return res.status(400).json({ error: 'Slug already exists' })
      }
    }

    // Prepare update
    const updateFields = {
      ...updateData,
      updatedAt: new Date(),
      lastUpdated: new Date()
    }

    // Increment version if content changed
    if (updateData.content && updateData.content !== existingPolicy.content) {
      const currentVersion = parseFloat(existingPolicy.version || '1.0')
      updateFields.version = (currentVersion + 0.1).toFixed(1)
    }

    // Set effective date if activating
    if (updateData.status === 'active' && existingPolicy.status !== 'active' && !updateData.effectiveDate) {
      updateFields.effectiveDate = new Date()
    }

    const result = await policiesCollection.updateOne(
      { slug },
      { $set: updateFields }
    )

    if (result.modifiedCount === 0) {
      return res.status(400).json({ error: 'No changes made to policy' })
    }

    // Create audit log
    await db.collection('audit_logs').insertOne({
      resource: 'policy',
      resourceId: existingPolicy._id,
      action: 'update',
      changes: updateData,
      userId: req.adminUser?.userId || 'system',
      timestamp: new Date(),
      severity: 'info'
    })

    // Get updated policy
    const updatedPolicy = await policiesCollection.findOne({ slug: updateData.slug || slug })

    res.json({
      success: true,
      data: updatedPolicy
    })
  } catch (error) {
    console.error('Policy update API error:', error)
    res.status(500).json({ error: 'Failed to update policy' })
  }
})

// Delete policy
router.delete('/policies/:slug', async (req, res) => {
  try {
    const { slug } = req.params
    const db = await getDb()
    const policiesCollection = db.collection('policies')

    const policy = await policiesCollection.findOne({ slug })
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' })
    }

    await policiesCollection.deleteOne({ slug })

    // Create audit log
    await db.collection('audit_logs').insertOne({
      resource: 'policy',
      resourceId: policy._id,
      action: 'delete',
      changes: { deleted: true },
      userId: req.adminUser?.userId || 'system',
      timestamp: new Date(),
      severity: 'warning'
    })

    res.json({
      success: true,
      message: 'Policy deleted successfully'
    })
  } catch (error) {
    console.error('Policy deletion API error:', error)
    res.status(500).json({ error: 'Failed to delete policy' })
  }
})

// ============================================================================
// CONTENT ANALYTICS ENDPOINTS
// ============================================================================

// Get content analytics
router.get('/analytics', async (req, res) => {
  try {
    const { range = '30d' } = req.query
    const db = await getDb()
    const blogCollection = db.collection('blog_posts')
    const policiesCollection = db.collection('policies')

    // Calculate date range
    const now = new Date()
    const startDate = new Date(now.getTime() - (range === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000)

    // Get blog analytics
    const blogAnalytics = await blogCollection.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalViews: { $sum: '$views' },
        totalLikes: { $sum: '$likes' }
      }}
    ]).toArray()

    // Get policy analytics
    const policyAnalytics = await policiesCollection.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: {
        _id: '$type',
        count: { $sum: 1 }
      }}
    ]).toArray()

    // Get top performing blog posts
    const topPosts = await blogCollection
      .find({ status: 'published' })
      .sort({ views: -1 })
      .limit(5)
      .toArray()

    // Get content summary
    const contentSummary = {
      totalBlogPosts: await blogCollection.countDocuments(),
      publishedPosts: await blogCollection.countDocuments({ status: 'published' }),
      draftPosts: await blogCollection.countDocuments({ status: 'draft' }),
      totalPolicies: await policiesCollection.countDocuments(),
      activePolicies: await policiesCollection.countDocuments({ status: 'active' })
    }

    res.json({
      success: true,
      data: {
        timeRange: range,
        blog: {
          analytics: blogAnalytics,
          topPosts
        },
        policies: {
          analytics: policyAnalytics
        },
        summary: contentSummary
      }
    })
  } catch (error) {
    console.error('Content analytics API error:', error)
    res.status(500).json({ error: 'Failed to fetch content analytics' })
  }
})

export default router
