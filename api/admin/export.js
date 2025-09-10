// Advanced Data Export and Backup System API
// Provides comprehensive data export and backup capabilities

import express from 'express'
import { z } from 'zod'
import { getDb } from '../../lib/db.js'
import { validateRequest } from '../../lib/requestValidation.js'
import { adminAuth } from '../../lib/adminAuth.js'

const router = express.Router()

// Admin authentication middleware for all routes
router.use((req, res, next) => adminAuth.validateAdminAccess(req, res, next))

// Export schema
const exportSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(['full', 'incremental', 'selective']),
  format: z.enum(['json', 'csv', 'xlsx', 'sql']),
  collections: z.array(z.string()).min(1),
  filters: z.record(z.any()).optional(),
  includeMetadata: z.boolean().default(true),
  compression: z.boolean().default(false),
  schedule: z.object({
    enabled: z.boolean().default(false),
    frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional()
  }).optional()
})

// Get all exports
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      format,
      sort = 'createdAt',
      order = 'desc'
    } = req.query

    const db = await getDb()
    const exportsCollection = db.collection('data_exports')

    // Build filter
    const filter = {}
    if (type) filter.type = type
    if (format) filter.format = format

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const sortOrder = order === 'desc' ? -1 : 1

    // Get exports
    const exports = await exportsCollection
      .find(filter)
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray()

    // Get total count
    const total = await exportsCollection.countDocuments(filter)

    // Get export statistics
    const stats = await exportsCollection.aggregate([
      { $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalSize: { $sum: '$fileSize' }
      }},
      { $sort: { count: -1 } }
    ]).toArray()

    res.json({
      success: true,
      data: {
        exports,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        statistics: {
          byType: stats
        }
      }
    })
  } catch (error) {
    console.error('Exports API error:', error)
    res.status(500).json({ error: 'Failed to fetch exports' })
  }
})

// Get single export
router.get('/:exportId', async (req, res) => {
  try {
    const { exportId } = req.params
    const db = await getDb()
    const exportsCollection = db.collection('data_exports')

    const exportData = await exportsCollection.findOne({ _id: exportId })
    
    if (!exportData) {
      return res.status(404).json({ error: 'Export not found' })
    }

    res.json({
      success: true,
      data: exportData
    })
  } catch (error) {
    console.error('Export detail API error:', error)
    res.status(500).json({ error: 'Failed to fetch export' })
  }
})

// Create new export
router.post('/', async (req, res) => {
  try {
    const exportData = await validateRequest(req, exportSchema)
    const db = await getDb()
    const exportsCollection = db.collection('data_exports')

    const newExport = {
      ...exportData,
      createdBy: req.adminUser?.userId || 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'pending',
      progress: 0,
      fileSize: 0,
      recordCount: 0,
      lastExecutedAt: null,
      executionCount: 0
    }

    const result = await exportsCollection.insertOne(newExport)

    // Create audit log
    await db.collection('audit_logs').insertOne({
      resource: 'data_export',
      resourceId: result.insertedId,
      action: 'create',
      changes: exportData,
      userId: req.adminUser?.userId || 'system',
      timestamp: new Date(),
      severity: 'info'
    })

    res.status(201).json({
      success: true,
      data: { _id: result.insertedId, ...newExport }
    })
  } catch (error) {
    console.error('Export creation API error:', error)
    res.status(500).json({ error: 'Failed to create export' })
  }
})

// Execute export
router.post('/:exportId/execute', async (req, res) => {
  try {
    const { exportId } = req.params
    const { format = 'json' } = req.body
    
    const db = await getDb()
    const exportsCollection = db.collection('data_exports')

    const exportConfig = await exportsCollection.findOne({ _id: exportId })
    if (!exportConfig) {
      return res.status(404).json({ error: 'Export not found' })
    }

    // Execute the export
    const exportResult = await executeExport(db, exportConfig, format)

    // Update export status
    await exportsCollection.updateOne(
      { _id: exportId },
      { 
        $set: { 
          status: exportResult.success ? 'completed' : 'failed',
          lastExecutedAt: new Date(),
          progress: 100,
          fileSize: exportResult.fileSize || 0,
          recordCount: exportResult.recordCount || 0,
          lastResult: exportResult
        },
        $inc: { executionCount: 1 }
      }
    )

    // Create audit log
    await db.collection('audit_logs').insertOne({
      resource: 'data_export',
      resourceId: exportId,
      action: 'execute',
      changes: { format, result: exportResult },
      userId: req.adminUser?.userId || 'system',
      timestamp: new Date(),
      severity: 'info'
    })

    if (exportResult.success && exportResult.downloadUrl) {
      res.json({
        success: true,
        data: {
          exportId,
          downloadUrl: exportResult.downloadUrl,
          fileSize: exportResult.fileSize,
          recordCount: exportResult.recordCount,
          executedAt: new Date()
        }
      })
    } else {
      res.json({
        success: true,
        data: exportResult
      })
    }
  } catch (error) {
    console.error('Export execution API error:', error)
    res.status(500).json({ error: 'Failed to execute export' })
  }
})

// Execute export logic
async function executeExport(db, exportConfig, format) {
  try {
    const { collections, filters, includeMetadata, compression } = exportConfig
    const exportData = {}
    let totalRecords = 0

    // Export each collection
    for (const collectionName of collections) {
      const collection = db.collection(collectionName)
      
      // Build query
      const query = filters?.[collectionName] || {}
      
      // Get data
      const data = await collection.find(query).toArray()
      
      // Add metadata if requested
      if (includeMetadata) {
        exportData[collectionName] = {
          metadata: {
            collection: collectionName,
            recordCount: data.length,
            exportedAt: new Date(),
            filters: query
          },
          data
        }
      } else {
        exportData[collectionName] = data
      }
      
      totalRecords += data.length
    }

    // Generate file based on format
    let fileContent
    let fileName
    let mimeType

    switch (format) {
      case 'json':
        fileContent = JSON.stringify(exportData, null, 2)
        fileName = `export-${Date.now()}.json`
        mimeType = 'application/json'
        break
        
      case 'csv':
        fileContent = convertToCSV(exportData)
        fileName = `export-${Date.now()}.csv`
        mimeType = 'text/csv'
        break
        
      case 'xlsx':
        fileContent = await convertToXLSX(exportData)
        fileName = `export-${Date.now()}.xlsx`
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        break
        
      case 'sql':
        fileContent = convertToSQL(exportData)
        fileName = `export-${Date.now()}.sql`
        mimeType = 'application/sql'
        break
        
      default:
        throw new Error(`Unsupported format: ${format}`)
    }

    // Compress if requested
    if (compression) {
      // In a real implementation, you would compress the file here
      fileName = fileName.replace(/\.[^/.]+$/, '.zip')
      mimeType = 'application/zip'
    }

    return {
      success: true,
      fileSize: fileContent.length,
      recordCount: totalRecords,
      fileName,
      mimeType,
      downloadUrl: `/api/admin/export/download/${fileName}` // Mock download URL
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Convert data to CSV format
function convertToCSV(data) {
  const csvRows = []
  
  for (const [collectionName, collectionData] of Object.entries(data)) {
    if (Array.isArray(collectionData)) {
      // Simple array of objects
      if (collectionData.length > 0) {
        const headers = Object.keys(collectionData[0])
        csvRows.push(`# Collection: ${collectionName}`)
        csvRows.push(headers.join(','))
        
        for (const row of collectionData) {
          const values = headers.map(header => {
            const value = row[header]
            if (value === null || value === undefined) {
              return ''
            }
            if (typeof value === 'object') {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`
            }
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          })
          csvRows.push(values.join(','))
        }
        csvRows.push('') // Empty line between collections
      }
    } else if (collectionData.metadata) {
      // Data with metadata
      if (collectionData.data.length > 0) {
        const headers = Object.keys(collectionData.data[0])
        csvRows.push(`# Collection: ${collectionName}`)
        csvRows.push(`# Records: ${collectionData.metadata.recordCount}`)
        csvRows.push(`# Exported: ${collectionData.metadata.exportedAt}`)
        csvRows.push(headers.join(','))
        
        for (const row of collectionData.data) {
          const values = headers.map(header => {
            const value = row[header]
            if (value === null || value === undefined) {
              return ''
            }
            if (typeof value === 'object') {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`
            }
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          })
          csvRows.push(values.join(','))
        }
        csvRows.push('') // Empty line between collections
      }
    }
  }
  
  return csvRows.join('\n')
}

// Convert data to XLSX format (mock implementation)
async function convertToXLSX(data) {
  // In a real implementation, you would use a library like 'xlsx' to create Excel files
  // For now, return a mock Excel file content
  return Buffer.from('Mock Excel file content')
}

// Convert data to SQL format
function convertToSQL(data) {
  const sqlStatements = []
  
  for (const [collectionName, collectionData] of Object.entries(data)) {
    if (Array.isArray(collectionData)) {
      // Simple array of objects
      if (collectionData.length > 0) {
        const tableName = collectionName
        const headers = Object.keys(collectionData[0])
        
        // Create table statement
        sqlStatements.push(`-- Table: ${tableName}`)
        sqlStatements.push(`CREATE TABLE IF NOT EXISTS ${tableName} (`)
        sqlStatements.push(`  id VARCHAR(255) PRIMARY KEY,`)
        headers.forEach(header => {
          sqlStatements.push(`  ${header} TEXT,`)
        })
        sqlStatements.push(`  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`)
        sqlStatements.push(`);`)
        sqlStatements.push('')
        
        // Insert statements
        for (const row of collectionData) {
          const values = headers.map(header => {
            const value = row[header]
            if (value === null || value === undefined) {
              return 'NULL'
            }
            if (typeof value === 'string') {
              return `'${value.replace(/'/g, "''")}'`
            }
            if (typeof value === 'object') {
              return `'${JSON.stringify(value).replace(/'/g, "''")}'`
            }
            return value
          })
          
          sqlStatements.push(`INSERT INTO ${tableName} (id, ${headers.join(', ')}) VALUES ('${row._id || 'unknown'}', ${values.join(', ')});`)
        }
        sqlStatements.push('')
      }
    }
  }
  
  return sqlStatements.join('\n')
}

// Get export templates
router.get('/templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 'full-backup',
        name: 'Full Database Backup',
        description: 'Complete backup of all collections',
        type: 'full',
        format: 'json',
        collections: ['orders', 'users', 'models', 'blog_posts', 'policies', 'notifications'],
        includeMetadata: true,
        compression: true
      },
      {
        id: 'orders-export',
        name: 'Orders Export',
        description: 'Export all order data for analysis',
        type: 'selective',
        format: 'csv',
        collections: ['orders'],
        includeMetadata: false,
        compression: false
      },
      {
        id: 'user-data',
        name: 'User Data Export',
        description: 'Export user information and activity',
        type: 'selective',
        format: 'xlsx',
        collections: ['users'],
        includeMetadata: true,
        compression: false
      },
      {
        id: 'content-export',
        name: 'Content Export',
        description: 'Export blog posts and policies',
        type: 'selective',
        format: 'json',
        collections: ['blog_posts', 'policies'],
        includeMetadata: true,
        compression: false
      }
    ]

    res.json({
      success: true,
      data: templates
    })
  } catch (error) {
    console.error('Export templates API error:', error)
    res.status(500).json({ error: 'Failed to fetch export templates' })
  }
})

// Create export from template
router.post('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params
    const { name, description, customizations = {} } = req.body
    
    const db = await getDb()
    const exportsCollection = db.collection('data_exports')

    // Get template
    const templates = await getExportTemplates()
    const template = templates.find(t => t.id === templateId)
    
    if (!template) {
      return res.status(404).json({ error: 'Export template not found' })
    }

    // Create export from template
    const exportData = {
      ...template,
      name: name || template.name,
      description: description || template.description,
      ...customizations,
      createdBy: req.adminUser?.userId || 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'pending',
      progress: 0,
      fileSize: 0,
      recordCount: 0,
      lastExecutedAt: null,
      executionCount: 0
    }

    const result = await exportsCollection.insertOne(exportData)

    res.status(201).json({
      success: true,
      data: { _id: result.insertedId, ...exportData }
    })
  } catch (error) {
    console.error('Export template creation API error:', error)
    res.status(500).json({ error: 'Failed to create export from template' })
  }
})

// Get export templates helper
async function getExportTemplates() {
  return [
    {
      id: 'full-backup',
      name: 'Full Database Backup',
      description: 'Complete backup of all collections',
      type: 'full',
      format: 'json',
      collections: ['orders', 'users', 'models', 'blog_posts', 'policies', 'notifications'],
      includeMetadata: true,
      compression: true
    },
    {
      id: 'orders-export',
      name: 'Orders Export',
      description: 'Export all order data for analysis',
      type: 'selective',
      format: 'csv',
      collections: ['orders'],
      includeMetadata: false,
      compression: false
    },
    {
      id: 'user-data',
      name: 'User Data Export',
      description: 'Export user information and activity',
      type: 'selective',
      format: 'xlsx',
      collections: ['users'],
      includeMetadata: true,
      compression: false
    },
    {
      id: 'content-export',
      name: 'Content Export',
      description: 'Export blog posts and policies',
      type: 'selective',
      format: 'json',
      collections: ['blog_posts', 'policies'],
      includeMetadata: true,
      compression: false
    }
  ]
}

// Get backup status
router.get('/backup/status', async (req, res) => {
  try {
    const db = await getDb()
    const exportsCollection = db.collection('data_exports')

    // Get recent backups
    const recentBackups = await exportsCollection
      .find({ type: 'full' })
      .sort({ lastExecutedAt: -1 })
      .limit(10)
      .toArray()

    // Get backup statistics
    const backupStats = await exportsCollection.aggregate([
      { $match: { type: 'full' } },
      { $group: {
        _id: null,
        totalBackups: { $sum: 1 },
        successfulBackups: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        totalSize: { $sum: '$fileSize' },
        lastBackup: { $max: '$lastExecutedAt' }
      }}
    ]).toArray()

    res.json({
      success: true,
      data: {
        recentBackups,
        statistics: backupStats[0] || {},
        health: {
          status: recentBackups.length > 0 && recentBackups[0].status === 'completed' ? 'healthy' : 'warning',
          lastBackup: recentBackups[0]?.lastExecutedAt || null,
          daysSinceLastBackup: recentBackups[0]?.lastExecutedAt ? 
            Math.floor((Date.now() - new Date(recentBackups[0].lastExecutedAt).getTime()) / (1000 * 60 * 60 * 24)) : null
        }
      }
    })
  } catch (error) {
    console.error('Backup status API error:', error)
    res.status(500).json({ error: 'Failed to fetch backup status' })
  }
})

// Delete export
router.delete('/:exportId', async (req, res) => {
  try {
    const { exportId } = req.params
    const db = await getDb()
    const exportsCollection = db.collection('data_exports')

    const exportData = await exportsCollection.findOne({ _id: exportId })
    if (!exportData) {
      return res.status(404).json({ error: 'Export not found' })
    }

    await exportsCollection.deleteOne({ _id: exportId })

    // Create audit log
    await db.collection('audit_logs').insertOne({
      resource: 'data_export',
      resourceId: exportId,
      action: 'delete',
      changes: { deleted: true },
      userId: req.adminUser?.userId || 'system',
      timestamp: new Date(),
      severity: 'warning'
    })

    res.json({
      success: true,
      message: 'Export deleted successfully'
    })
  } catch (error) {
    console.error('Export deletion API error:', error)
    res.status(500).json({ error: 'Failed to delete export' })
  }
})

export default router
