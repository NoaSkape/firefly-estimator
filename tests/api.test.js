import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { MongoClient } from 'mongodb'

// Mock the database connection
vi.mock('../lib/db.js', () => ({
  getDb: vi.fn()
}))

// Mock Clerk authentication
vi.mock('../lib/auth.js', () => ({
  requireAuth: vi.fn()
}))

describe('API Endpoints', () => {
  let mongoServer
  let client
  let db

  beforeEach(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create()
    const uri = mongoServer.getUri()
    client = new MongoClient(uri)
    await client.connect()
    db = client.db('test')
    
    // Mock the database connection
    const { getDb } = await import('../lib/db.js')
    getDb.mockResolvedValue(db)
  })

  afterEach(async () => {
    await client.close()
    await mongoServer.stop()
  })

  describe('POST /api/builds', () => {
    it('should create a new build with valid data', async () => {
      // Mock authentication
      const { requireAuth } = await import('../lib/auth.js')
      requireAuth.mockResolvedValue({ userId: 'user123' })

      const buildData = {
        modelSlug: 'magnolia',
        modelName: 'The Magnolia',
        basePrice: 71475,
        selections: {
          options: []
        }
      }

      // This would require setting up the Express app for testing
      // For now, we'll test the build creation logic directly
      const { createBuild } = await import('../lib/builds.js')
      
      const result = await createBuild({
        userId: 'user123',
        ...buildData
      })

      expect(result).toBeDefined()
      expect(result.userId).toBe('user123')
      expect(result.modelSlug).toBe('magnolia')
      expect(result.modelName).toBe('The Magnolia')
      expect(result.selections.basePrice).toBe(71475)
      expect(result.status).toBe('DRAFT')
      expect(result.step).toBe(1)
    })

    it('should handle missing required fields', async () => {
      const { createBuild } = await import('../lib/builds.js')
      
      const result = await createBuild({
        userId: 'user123',
        modelSlug: '',
        modelName: '',
        basePrice: 0
      })

      expect(result).toBeDefined()
      expect(result.modelSlug).toBe('')
      expect(result.modelName).toBe('')
      expect(result.selections.basePrice).toBe(0)
    })
  })

  describe('GET /api/builds', () => {
    it('should list builds for a user', async () => {
      const { requireAuth } = await import('../lib/auth.js')
      requireAuth.mockResolvedValue({ userId: 'user123' })

      // Create test builds
      const { createBuild } = await import('../lib/builds.js')
      await createBuild({
        userId: 'user123',
        modelSlug: 'magnolia',
        modelName: 'The Magnolia',
        basePrice: 71475
      })
      await createBuild({
        userId: 'user123',
        modelSlug: 'bluebonnet',
        modelName: 'The Bluebonnet',
        basePrice: 70415
      })

      const { listBuildsForUser } = await import('../lib/builds.js')
      const builds = await listBuildsForUser('user123')

      expect(builds).toHaveLength(2)
      expect(builds[0].userId).toBe('user123')
      expect(builds[1].userId).toBe('user123')
    })
  })

  describe('PATCH /api/builds/:id', () => {
    it('should update build selections and recalculate pricing', async () => {
      const { requireAuth } = await import('../lib/auth.js')
      requireAuth.mockResolvedValue({ userId: 'user123' })

      // Create a test build
      const { createBuild, updateBuild } = await import('../lib/builds.js')
      const build = await createBuild({
        userId: 'user123',
        modelSlug: 'magnolia',
        modelName: 'The Magnolia',
        basePrice: 71475
      })

      // Update with new options
      const updatedBuild = await updateBuild(build._id.toString(), {
        selections: {
          options: [
            { id: 'pkg-comfort-xtreme', name: 'Comfort Xtreme', price: 3500, quantity: 1 }
          ]
        }
      })

      expect(updatedBuild).toBeDefined()
      expect(updatedBuild.selections.options).toHaveLength(1)
      expect(updatedBuild.selections.options[0].price).toBe(3500)
      expect(updatedBuild.pricing.options).toBe(3500)
      expect(updatedBuild.pricing.total).toBeGreaterThan(71475)
    })

    it('should preserve base price when updating options', async () => {
      const { createBuild, updateBuild } = await import('../lib/builds.js')
      const build = await createBuild({
        userId: 'user123',
        modelSlug: 'magnolia',
        modelName: 'The Magnolia',
        basePrice: 71475
      })

      // Update only options, not base price
      const updatedBuild = await updateBuild(build._id.toString(), {
        selections: {
          options: [{ id: 'addon-awnings', name: 'Window Awnings', price: 900, quantity: 1 }]
        }
      })

      expect(updatedBuild.selections.basePrice).toBe(71475)
      expect(updatedBuild.pricing.base).toBe(71475)
    })
  })

  describe('POST /api/builds/:id/duplicate', () => {
    it('should duplicate a build with incremented version', async () => {
      const { requireAuth } = await import('../lib/auth.js')
      requireAuth.mockResolvedValue({ userId: 'user123' })

      const { createBuild, duplicateBuild } = await import('../lib/builds.js')
      const originalBuild = await createBuild({
        userId: 'user123',
        modelSlug: 'magnolia',
        modelName: 'The Magnolia',
        basePrice: 71475
      })

      const duplicatedBuild = await duplicateBuild(originalBuild._id.toString(), 'user123')

      expect(duplicatedBuild).toBeDefined()
      expect(duplicatedBuild.userId).toBe('user123')
      expect(duplicatedBuild.modelSlug).toBe('magnolia')
      expect(duplicatedBuild.modelName).toBe('The Magnolia (v2)')
      expect(duplicatedBuild.version).toBe(2)
      expect(duplicatedBuild.status).toBe('DRAFT')
      expect(duplicatedBuild.step).toBe(1)
    })
  })

  describe('POST /api/builds/:id/rename', () => {
    it('should rename a build', async () => {
      const { requireAuth } = await import('../lib/auth.js')
      requireAuth.mockResolvedValue({ userId: 'user123' })

      const { createBuild, renameBuild } = await import('../lib/builds.js')
      const build = await createBuild({
        userId: 'user123',
        modelSlug: 'magnolia',
        modelName: 'The Magnolia',
        basePrice: 71475
      })

      const renamedBuild = await renameBuild(build._id.toString(), 'user123', 'My Custom Magnolia')

      expect(renamedBuild).toBeDefined()
      expect(renamedBuild.modelName).toBe('My Custom Magnolia')
      expect(renamedBuild.modelSlug).toBe('magnolia') // Should not change
    })

    it('should reject empty names', async () => {
      const { createBuild, renameBuild } = await import('../lib/builds.js')
      const build = await createBuild({
        userId: 'user123',
        modelSlug: 'magnolia',
        modelName: 'The Magnolia',
        basePrice: 71475
      })

      const result = await renameBuild(build._id.toString(), 'user123', '')

      expect(result).toBeNull() // Should fail validation
    })
  })

  describe('DELETE /api/builds/:id', () => {
    it('should delete a build', async () => {
      const { requireAuth } = await import('../lib/auth.js')
      requireAuth.mockResolvedValue({ userId: 'user123' })

      const { createBuild, deleteBuild, getBuildById } = await import('../lib/builds.js')
      const build = await createBuild({
        userId: 'user123',
        modelSlug: 'magnolia',
        modelName: 'The Magnolia',
        basePrice: 71475
      })

      const deleteResult = await deleteBuild(build._id.toString(), 'user123')
      expect(deleteResult.deletedCount).toBe(1)

      // Verify it's gone
      const deletedBuild = await getBuildById(build._id.toString())
      expect(deletedBuild).toBeNull()
    })

    it('should not delete builds from other users', async () => {
      const { createBuild, deleteBuild } = await import('../lib/builds.js')
      const build = await createBuild({
        userId: 'user123',
        modelSlug: 'magnolia',
        modelName: 'The Magnolia',
        basePrice: 71475
      })

      const deleteResult = await deleteBuild(build._id.toString(), 'otheruser')
      expect(deleteResult.deletedCount).toBe(0)
    })
  })
})
