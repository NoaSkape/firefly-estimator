# Firefly Estimator Admin Panel API Documentation

## Overview

The Firefly Estimator Admin Panel provides a comprehensive REST API for managing all aspects of the tiny home business. This documentation covers all available endpoints, request/response formats, and authentication requirements.

## Base URL

```
https://fireflyestimator.com/api/admin
```

## Authentication

All admin endpoints require authentication using Clerk JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "pagination": {
    // Pagination info (when applicable)
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Endpoints

### 1. Dashboard

#### GET /dashboard
Get dashboard overview with key metrics.

**Query Parameters:**
- `range` (string): Time range for metrics (`7d`, `30d`, `90d`, `1y`)

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalUsers": 150,
      "newUsers": 25,
      "activeBuilds": 12,
      "totalOrders": 89,
      "totalRevenue": 2500000,
      "revenueChange": 15.5
    },
    "trends": {
      "dailyRevenue": [...],
      "orderStatus": [...]
    },
    "recentActivity": {
      "orders": [...],
      "builds": [...]
    },
    "topModels": [...]
  }
}
```

### 2. Analytics

#### GET /analytics
Get comprehensive analytics data.

**Query Parameters:**
- `range` (string): Time range (`7d`, `30d`, `90d`, `1y`)

**Response:**
```json
{
  "success": true,
  "data": {
    "timeRange": "30d",
    "metrics": {
      "revenue": {
        "current": 2500000,
        "previous": 2000000,
        "change": 25.0,
        "daily": [...]
      },
      "orders": {
        "current": 89,
        "byStatus": [...]
      },
      "customers": {
        "bySource": [...]
      },
      "models": {
        "topPerformers": [...]
      }
    }
  }
}
```

#### GET /analytics/predictive/revenue
Get revenue forecasting data.

**Query Parameters:**
- `months` (number): Number of months to forecast (default: 6)

**Response:**
```json
{
  "success": true,
  "data": {
    "historical": [...],
    "forecast": [
      {
        "year": 2025,
        "month": 2,
        "predictedRevenue": 2750000,
        "confidence": "high"
      }
    ],
    "model": {
      "slope": 25000,
      "intercept": 2000000,
      "rSquared": 0.85
    }
  }
}
```

### 3. Orders

#### GET /orders
Get orders with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `status` (string): Filter by status
- `search` (string): Search term
- `dateFrom` (string): Start date (ISO format)
- `dateTo` (string): End date (ISO format)

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "_id": "order_id",
        "orderNumber": "FF-2025-001",
        "customerName": "John Doe",
        "modelName": "Firefly 20",
        "status": "production",
        "totalAmount": 75000,
        "createdAt": "2025-01-10T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 89,
      "pages": 5
    },
    "summary": {
      "statusDistribution": [...],
      "priorityDistribution": [...]
    }
  }
}
```

#### PATCH /orders/:orderId
Update order status and details.

**Request Body:**
```json
{
  "status": "ready",
  "notes": "Production completed",
  "estimatedDelivery": "2025-02-15T00:00:00Z",
  "priority": "high"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "order_id",
    "status": "ready",
    "updatedAt": "2025-01-10T15:30:00Z"
  }
}
```

### 4. Financial

#### GET /financial/dashboard
Get financial dashboard data.

**Query Parameters:**
- `range` (string): Time range (`7d`, `30d`, `90d`, `1y`)
- `includeProjections` (boolean): Include revenue projections

**Response:**
```json
{
  "success": true,
  "data": {
    "timeRange": "30d",
    "metrics": {
      "current": {
        "totalRevenue": 2500000,
        "orderCount": 89,
        "averageOrderValue": 28089
      },
      "previous": {
        "totalRevenue": 2000000,
        "orderCount": 75
      },
      "growth": {
        "revenue": 25.0,
        "orders": 18.7
      }
    },
    "trends": {
      "daily": [...],
      "monthly": [...]
    },
    "breakdown": {
      "byPaymentStatus": [...],
      "byModel": [...]
    }
  }
}
```

#### GET /financial/forecast
Get financial forecasting data.

**Query Parameters:**
- `months` (number): Number of months to forecast
- `confidence` (string): Confidence level (`low`, `medium`, `high`)

**Response:**
```json
{
  "success": true,
  "data": {
    "historical": [...],
    "forecast": [
      {
        "year": 2025,
        "month": 2,
        "predictedRevenue": 2750000,
        "confidence": "high"
      }
    ],
    "model": {
      "method": "linear_regression",
      "dataPoints": 12
    }
  }
}
```

### 5. Content Management

#### GET /content/blog
Get blog posts with filtering.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Filter by status (`draft`, `published`, `archived`)
- `category` (string): Filter by category
- `search` (string): Search term

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "_id": "post_id",
        "title": "Welcome to Firefly Tiny Homes",
        "slug": "welcome-to-firefly-tiny-homes",
        "status": "published",
        "createdAt": "2025-01-10T10:00:00Z",
        "views": 150,
        "likes": 25
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "pages": 1
    }
  }
}
```

#### POST /content/blog
Create new blog post.

**Request Body:**
```json
{
  "title": "New Blog Post",
  "slug": "new-blog-post",
  "content": "Blog post content...",
  "excerpt": "Short description",
  "status": "draft",
  "tags": ["tiny-homes", "lifestyle"],
  "category": "lifestyle"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "new_post_id",
    "title": "New Blog Post",
    "slug": "new-blog-post",
    "status": "draft",
    "createdAt": "2025-01-10T15:30:00Z"
  }
}
```

### 6. User Management

#### GET /users
Get users with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `role` (string): Filter by role (`customer`, `admin`, `staff`, `manager`)
- `status` (string): Filter by status (`active`, `inactive`, `suspended`)
- `search` (string): Search term

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "user_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "role": "customer",
        "status": "active",
        "createdAt": "2025-01-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    },
    "statistics": {
      "byRole": [...],
      "byStatus": [...],
      "orderStats": {...}
    }
  }
}
```

#### PATCH /users/:userId
Update user information.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "role": "admin",
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "firstName": "John",
    "lastName": "Smith",
    "role": "admin",
    "status": "active",
    "updatedAt": "2025-01-10T15:30:00Z"
  }
}
```

### 7. Notifications

#### GET /notifications
Get notifications with filtering.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `type` (string): Filter by type (`info`, `warning`, `error`, `success`, `urgent`)
- `status` (string): Filter by status (`unread`, `read`, `all`)
- `category` (string): Filter by category

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "notification_id",
        "title": "New Order Received",
        "message": "Order FF-2025-001 has been placed",
        "type": "info",
        "category": "order",
        "priority": "normal",
        "createdAt": "2025-01-10T10:00:00Z",
        "readBy": []
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    },
    "statistics": {
      "unreadCount": 12
    }
  }
}
```

#### PATCH /notifications/:notificationId/read
Mark notification as read.

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### 8. AI Insights

#### GET /ai-insights/insights
Get AI-powered business insights.

**Query Parameters:**
- `type` (string): Filter by type (`revenue`, `customer`, `inventory`, `marketing`, `operational`, `financial`)
- `priority` (string): Filter by priority (`low`, `medium`, `high`, `critical`)
- `limit` (number): Number of insights to return

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "id": "insight_id",
        "type": "revenue",
        "priority": "high",
        "title": "Focus on Top Performing Model",
        "description": "Firefly 20 is generating 45% of total revenue",
        "recommendation": "Increase marketing spend and inventory for this model",
        "impact": "high",
        "confidence": 95,
        "actionItems": [
          "Increase marketing budget for top model",
          "Ensure adequate inventory levels"
        ],
        "estimatedValue": 375000
      }
    ],
    "generatedAt": "2025-01-10T15:30:00Z",
    "totalInsights": 8
  }
}
```

### 9. Reports

#### GET /reports
Get custom reports.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `type` (string): Filter by type (`financial`, `operational`, `customer`, `inventory`, `marketing`, `custom`)
- `isPublic` (boolean): Filter by public status

**Response:**
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "_id": "report_id",
        "name": "Revenue Summary Report",
        "description": "Comprehensive revenue analysis",
        "type": "financial",
        "isPublic": false,
        "createdAt": "2025-01-10T10:00:00Z",
        "lastRunAt": "2025-01-10T14:30:00Z",
        "runCount": 5
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "pages": 1
    }
  }
}
```

#### POST /reports/:reportId/execute
Execute a report.

**Request Body:**
```json
{
  "format": "csv",
  "filters": {
    "dateFrom": "2025-01-01T00:00:00Z",
    "dateTo": "2025-01-31T23:59:59Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "report": {
      "id": "report_id",
      "name": "Revenue Summary Report",
      "type": "financial"
    },
    "data": [...],
    "executedAt": "2025-01-10T15:30:00Z",
    "recordCount": 89
  }
}
```

### 10. Integrations

#### GET /integrations
Get third-party integrations.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `type` (string): Filter by type (`payment`, `shipping`, `marketing`, `analytics`, `communication`, `storage`, `other`)
- `status` (string): Filter by status (`active`, `inactive`, `error`, `pending`)
- `isEnabled` (boolean): Filter by enabled status

**Response:**
```json
{
  "success": true,
  "data": {
    "integrations": [
      {
        "_id": "integration_id",
        "name": "Stripe Payment Integration",
        "type": "payment",
        "provider": "Stripe",
        "status": "active",
        "isEnabled": true,
        "lastSyncAt": "2025-01-10T14:30:00Z",
        "syncCount": 150
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8,
      "pages": 1
    },
    "statistics": {
      "byType": [...]
    }
  }
}
```

#### POST /integrations/:integrationId/test
Test integration connection.

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Integration connection successful",
    "timestamp": "2025-01-10T15:30:00Z",
    "details": {
      "provider": "Stripe",
      "status": "connected"
    }
  }
}
```

### 11. Security

#### GET /security/events
Get security events and audit logs.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `type` (string): Filter by type (`login`, `logout`, `failed_login`, `permission_denied`, `data_access`, `data_modification`, `system_change`, `suspicious_activity`)
- `severity` (string): Filter by severity (`low`, `medium`, `high`, `critical`)
- `userId` (string): Filter by user ID
- `dateFrom` (string): Start date (ISO format)
- `dateTo` (string): End date (ISO format)

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "_id": "event_id",
        "type": "failed_login",
        "severity": "medium",
        "description": "Failed login attempt for user john@example.com",
        "userId": "user_id",
        "ipAddress": "192.168.1.100",
        "timestamp": "2025-01-10T15:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 125,
      "pages": 3
    },
    "statistics": {
      "bySeverity": [...],
      "byType": [...]
    }
  }
}
```

#### GET /security/dashboard
Get security dashboard overview.

**Query Parameters:**
- `range` (string): Time range (`1d`, `7d`, `30d`)

**Response:**
```json
{
  "success": true,
  "data": {
    "timeRange": "7d",
    "metrics": {
      "totalEvents": 125,
      "criticalEvents": 2,
      "highEvents": 8,
      "failedLogins": 15,
      "permissionDenied": 5
    },
    "dailyTrends": [...],
    "topUsers": [...],
    "suspiciousActivities": [...]
  }
}
```

### 12. Workflows

#### GET /workflows
Get workflow automations.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `isActive` (boolean): Filter by active status
- `triggerType` (string): Filter by trigger type (`event`, `schedule`, `manual`, `webhook`)

**Response:**
```json
{
  "success": true,
  "data": {
    "workflows": [
      {
        "_id": "workflow_id",
        "name": "Order Confirmation Workflow",
        "description": "Automatically confirm orders and send confirmation emails",
        "trigger": {
          "type": "event",
          "event": "order.created"
        },
        "isActive": true,
        "executionCount": 45,
        "successCount": 43,
        "errorCount": 2,
        "lastExecutedAt": "2025-01-10T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8,
      "pages": 1
    }
  }
}
```

#### POST /workflows/:workflowId/execute
Execute workflow manually.

**Request Body:**
```json
{
  "context": {
    "orderId": "order_id",
    "customerEmail": "customer@example.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "results": [
      {
        "stepId": "step1",
        "stepName": "Update Order Status",
        "result": {
          "success": true,
          "modifiedCount": 1
        }
      }
    ],
    "executedAt": "2025-01-10T15:30:00Z"
  }
}
```

### 13. Monitoring

#### GET /monitoring/health
Get system health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "status": "healthy",
      "score": 95,
      "lastChecked": "2025-01-10T15:30:00Z"
    },
    "database": {
      "status": "healthy",
      "responseTime": 15,
      "stats": {
        "collections": 12,
        "dataSize": 1048576,
        "indexSize": 524288
      }
    },
    "api": {
      "status": "healthy",
      "responseTime": 25,
      "statusCode": 200
    },
    "external": [
      {
        "name": "Clerk Authentication",
        "status": "healthy",
        "responseTime": 150
      }
    ],
    "performance": {
      "responseTime": {
        "avgResponseTime": 45,
        "maxResponseTime": 250,
        "minResponseTime": 15
      },
      "errorRate": 0.5,
      "totalRequests": 1000
    },
    "system": {
      "memory": {
        "used": 52428800,
        "total": 104857600,
        "usagePercent": 50
      },
      "uptime": {
        "seconds": 86400,
        "formatted": "1d 0h 0m"
      }
    }
  }
}
```

#### GET /monitoring/performance
Get performance metrics.

**Query Parameters:**
- `range` (string): Time range (`1h`, `24h`, `7d`)

**Response:**
```json
{
  "success": true,
  "data": {
    "timeRange": "24h",
    "apiMetrics": [
      {
        "_id": {
          "hour": 14,
          "day": 10
        },
        "avgResponseTime": 45,
        "maxResponseTime": 250,
        "requestCount": 150,
        "errorCount": 2
      }
    ],
    "endpointMetrics": [
      {
        "_id": "orders",
        "avgResponseTime": 35,
        "requestCount": 500,
        "errorCount": 1
      }
    ],
    "errorTrends": [...]
  }
}
```

### 14. Export

#### GET /export
Get data exports.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `type` (string): Filter by type (`full`, `incremental`, `selective`)
- `format` (string): Filter by format (`json`, `csv`, `xlsx`, `sql`)

**Response:**
```json
{
  "success": true,
  "data": {
    "exports": [
      {
        "_id": "export_id",
        "name": "Full Database Backup",
        "description": "Complete backup of all collections",
        "type": "full",
        "format": "json",
        "status": "completed",
        "fileSize": 1048576,
        "recordCount": 5000,
        "lastExecutedAt": "2025-01-10T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "pages": 1
    }
  }
}
```

#### POST /export/:exportId/execute
Execute data export.

**Request Body:**
```json
{
  "format": "csv",
  "filters": {
    "orders": {
      "status": "completed"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "exportId": "export_id",
    "downloadUrl": "/api/admin/export/download/export-1641234567890.csv",
    "fileSize": 524288,
    "recordCount": 89,
    "executedAt": "2025-01-10T15:30:00Z"
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Authentication required |
| `AUTH_INVALID` | Invalid authentication token |
| `AUTH_EXPIRED` | Authentication token expired |
| `PERMISSION_DENIED` | Insufficient permissions |
| `VALIDATION_ERROR` | Request validation failed |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Resource conflict |
| `RATE_LIMITED` | Rate limit exceeded |
| `SERVER_ERROR` | Internal server error |

## Rate Limits

- **General API**: 100 requests per minute per user
- **Export Operations**: 10 requests per hour per user
- **Workflow Execution**: 50 requests per hour per user
- **Security Events**: 200 requests per minute per user

## Pagination

Most list endpoints support pagination with the following parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

Response includes pagination metadata:

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

## Filtering and Sorting

Many endpoints support filtering and sorting:

**Filtering:**
- Use query parameters to filter results
- Multiple filters can be combined
- Date ranges use ISO 8601 format

**Sorting:**
- `sort`: Field to sort by
- `order`: Sort direction (`asc` or `desc`)

## Webhooks

The system supports webhooks for real-time notifications:

**Webhook Events:**
- `order.created`
- `order.updated`
- `order.completed`
- `user.created`
- `user.updated`
- `workflow.executed`
- `security.alert`

**Webhook Payload:**
```json
{
  "event": "order.created",
  "timestamp": "2025-01-10T15:30:00Z",
  "data": {
    "orderId": "order_id",
    "orderNumber": "FF-2025-001",
    "customerName": "John Doe",
    "totalAmount": 75000
  }
}
```

## SDKs and Libraries

Official SDKs are available for:

- **JavaScript/Node.js**: `@firefly-estimator/admin-sdk`
- **Python**: `firefly-estimator-admin`
- **PHP**: `firefly-estimator/admin-php`
- **Ruby**: `firefly-estimator-admin`

## Support

For API support and questions:

- **Documentation**: https://docs.fireflyestimator.com
- **Support Email**: api-support@fireflyestimator.com
- **Status Page**: https://status.fireflyestimator.com
- **GitHub Issues**: https://github.com/firefly-estimator/admin-api/issues

## Changelog

### Version 3.0.0 (2025-01-10)
- Added AI insights and recommendations
- Added advanced reporting system
- Added integration hub
- Added workflow automation
- Added performance monitoring
- Added advanced security features
- Added data export and backup system

### Version 2.0.0 (2024-12-15)
- Added content management system
- Added user management
- Added notification system
- Added financial dashboard
- Added order management

### Version 1.0.0 (2024-11-01)
- Initial release
- Basic dashboard
- Analytics system
- Order tracking
