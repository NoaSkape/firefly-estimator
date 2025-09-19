// Enterprise Analytics Features
// KPI Alerts, Report Scheduling, Advanced Filtering, and Monitoring

import cron from 'node-cron'
import nodemailer from 'nodemailer'
import { getDb } from '../db.js'
import moment from 'moment-timezone'
import _ from 'lodash'
import { v4 as uuidv4 } from 'uuid'

export class EnterpriseAnalyticsManager {
  constructor() {
    this.timezone = 'America/Chicago'
    this.alertThresholds = new Map()
    this.scheduledReports = new Map()
    this.activeMonitors = new Map()
    this.emailTransporter = null
    
    this._initializeEmailTransporter()
    this._startScheduler()
  }

  /**
   * KPI Alert System - Monitor metrics and send alerts when thresholds are breached
   */
  async setupKPIAlert(config) {
    const alertId = uuidv4()
    const alert = {
      id: alertId,
      name: config.name,
      metric: config.metric, // 'revenue', 'orders', 'conversion_rate', etc.
      threshold: config.threshold,
      condition: config.condition, // 'above', 'below', 'equals', 'change_percent'
      timeWindow: config.timeWindow || '1h', // How often to check
      recipients: config.recipients || [],
      enabled: true,
      createdAt: new Date(),
      lastTriggered: null,
      triggerCount: 0
    }
    
    // Store alert configuration
    const db = await getDb()
    await db.collection('kpi_alerts').insertOne(alert)
    
    // Set up monitoring
    this._startKPIMonitoring(alert)
    
    return {
      alertId: alertId,
      status: 'active',
      nextCheck: moment().add(this._parseTimeWindow(config.timeWindow), 'minutes').toISOString()
    }
  }

  /**
   * Advanced Report Scheduling System
   */
  async scheduleReport(config) {
    const scheduleId = uuidv4()
    const schedule = {
      id: scheduleId,
      name: config.name,
      reportType: config.reportType, // 'executive', 'operational', 'financial', 'custom'
      frequency: config.frequency, // 'daily', 'weekly', 'monthly', 'quarterly'
      time: config.time || '09:00', // Time to send (24h format)
      timezone: config.timezone || this.timezone,
      recipients: config.recipients || [],
      filters: config.filters || {},
      format: config.format || 'pdf', // 'pdf', 'csv', 'excel', 'dashboard_link'
      enabled: true,
      createdAt: new Date(),
      lastSent: null,
      nextSend: this._calculateNextSendTime(config.frequency, config.time, config.timezone)
    }
    
    // Store schedule configuration
    const db = await getDb()
    await db.collection('report_schedules').insertOne(schedule)
    
    // Set up cron job
    this._setupReportCron(schedule)
    
    return {
      scheduleId: scheduleId,
      status: 'scheduled',
      nextSend: schedule.nextSend
    }
  }

  /**
   * Advanced Filtering System for Analytics
   */
  async applyAdvancedFilters(baseQuery, filters) {
    const query = { ...baseQuery }
    
    // Date range filtering
    if (filters.dateRange) {
      const { start, end } = filters.dateRange
      query.timestamp = {
        $gte: moment(start).toDate(),
        $lte: moment(end).toDate()
      }
    }
    
    // User segment filtering
    if (filters.userSegment) {
      query['metadata.userSegment'] = filters.userSegment
    }
    
    // Geographic filtering
    if (filters.location) {
      if (filters.location.country) {
        query['metadata.country'] = filters.location.country
      }
      if (filters.location.state) {
        query['metadata.state'] = filters.location.state
      }
      if (filters.location.city) {
        query['metadata.city'] = filters.location.city
      }
    }
    
    // Device filtering
    if (filters.device) {
      query['metadata.device'] = filters.device
    }
    
    // Traffic source filtering
    if (filters.source) {
      query['metadata.source'] = filters.source
    }
    
    // Custom field filtering
    if (filters.custom) {
      Object.entries(filters.custom).forEach(([key, value]) => {
        query[`metadata.${key}`] = value
      })
    }
    
    // Value range filtering
    if (filters.valueRange) {
      const { min, max } = filters.valueRange
      query.value = {}
      if (min !== undefined) query.value.$gte = min
      if (max !== undefined) query.value.$lte = max
    }
    
    return query
  }

  /**
   * Real-time KPI Monitoring Dashboard
   */
  async getKPIMonitoringData() {
    const db = await getDb()
    
    // Get active alerts
    const activeAlerts = await db.collection('kpi_alerts')
      .find({ enabled: true })
      .toArray()
    
    // Get recent alert triggers
    const recentTriggers = await db.collection('alert_history')
      .find({})
      .sort({ triggeredAt: -1 })
      .limit(50)
      .toArray()
    
    // Get scheduled reports status
    const scheduledReports = await db.collection('report_schedules')
      .find({ enabled: true })
      .toArray()
    
    // Calculate system health metrics
    const systemHealth = await this._calculateSystemHealth()
    
    return {
      alerts: {
        active: activeAlerts.length,
        triggered: recentTriggers.filter(t => 
          moment(t.triggeredAt).isAfter(moment().subtract(24, 'hours'))
        ).length,
        configurations: activeAlerts.map(alert => ({
          id: alert.id,
          name: alert.name,
          metric: alert.metric,
          status: this._getAlertStatus(alert),
          lastTriggered: alert.lastTriggered
        }))
      },
      reports: {
        scheduled: scheduledReports.length,
        nextDue: this._getNextReportDue(scheduledReports),
        configurations: scheduledReports.map(report => ({
          id: report.id,
          name: report.name,
          frequency: report.frequency,
          nextSend: report.nextSend,
          lastSent: report.lastSent
        }))
      },
      systemHealth: systemHealth,
      monitoring: {
        uptime: this._calculateUptime(),
        responseTime: this._getAverageResponseTime(),
        errorRate: this._calculateErrorRate()
      }
    }
  }

  // Private implementation methods

  _initializeEmailTransporter() {
    try {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      })
    } catch (error) {
      console.error('[ENTERPRISE_ANALYTICS] Email transporter setup failed:', error.message)
    }
  }

  _startScheduler() {
    // Run every minute to check for due alerts and reports
    cron.schedule('* * * * *', async () => {
      try {
        await this._checkDueAlerts()
        await this._checkDueReports()
      } catch (error) {
        console.error('[ENTERPRISE_ANALYTICS] Scheduler error:', error.message)
      }
    })
  }

  async _checkDueAlerts() {
    const db = await getDb()
    const alerts = await db.collection('kpi_alerts')
      .find({ enabled: true })
      .toArray()
    
    for (const alert of alerts) {
      try {
        const shouldCheck = this._shouldCheckAlert(alert)
        if (shouldCheck) {
          await this._evaluateAlert(alert)
        }
      } catch (error) {
        console.error(`[ENTERPRISE_ANALYTICS] Alert ${alert.id} evaluation failed:`, error.message)
      }
    }
  }

  async _checkDueReports() {
    const db = await getDb()
    const reports = await db.collection('report_schedules')
      .find({ 
        enabled: true,
        nextSend: { $lte: new Date() }
      })
      .toArray()
    
    for (const report of reports) {
      try {
        await this._generateAndSendReport(report)
      } catch (error) {
        console.error(`[ENTERPRISE_ANALYTICS] Report ${report.id} generation failed:`, error.message)
      }
    }
  }

  async _evaluateAlert(alert) {
    // Get current metric value
    const currentValue = await this._getCurrentMetricValue(alert.metric)
    
    // Check if threshold is breached
    const isTriggered = this._evaluateThreshold(currentValue, alert.threshold, alert.condition)
    
    if (isTriggered) {
      await this._triggerAlert(alert, currentValue)
    }
  }

  async _getCurrentMetricValue(metric) {
    // Implementation depends on specific metrics
    const db = await getDb()
    
    switch (metric) {
      case 'revenue_24h':
        return this._getRevenueLast24Hours(db)
      case 'orders_1h':
        return this._getOrdersLastHour(db)
      case 'conversion_rate':
        return this._getCurrentConversionRate(db)
      case 'error_rate':
        return this._getCurrentErrorRate(db)
      default:
        throw new Error(`Unknown metric: ${metric}`)
    }
  }

  async _triggerAlert(alert, currentValue) {
    const db = await getDb()
    
    // Log alert trigger
    await db.collection('alert_history').insertOne({
      alertId: alert.id,
      alertName: alert.name,
      metric: alert.metric,
      currentValue: currentValue,
      threshold: alert.threshold,
      condition: alert.condition,
      triggeredAt: new Date()
    })
    
    // Update alert record
    await db.collection('kpi_alerts').updateOne(
      { id: alert.id },
      { 
        $set: { 
          lastTriggered: new Date(),
          triggerCount: alert.triggerCount + 1
        }
      }
    )
    
    // Send notifications
    await this._sendAlertNotifications(alert, currentValue)
  }

  async _sendAlertNotifications(alert, currentValue) {
    if (!this.emailTransporter || !alert.recipients.length) return
    
    const subject = `🚨 KPI Alert: ${alert.name}`
    const html = this._generateAlertEmailHTML(alert, currentValue)
    
    for (const recipient of alert.recipients) {
      try {
        await this.emailTransporter.sendMail({
          from: process.env.SMTP_FROM || 'alerts@fireflyestimator.com',
          to: recipient,
          subject: subject,
          html: html
        })
      } catch (error) {
        console.error(`[ENTERPRISE_ANALYTICS] Failed to send alert to ${recipient}:`, error.message)
      }
    }
  }

  _generateAlertEmailHTML(alert, currentValue) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
          <h2 style="color: #dc2626; margin: 0 0 16px 0;">🚨 KPI Alert Triggered</h2>
          
          <div style="background: white; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
            <h3 style="margin: 0 0 8px 0; color: #374151;">${alert.name}</h3>
            <p style="margin: 0; color: #6b7280;">Alert triggered at ${moment().tz(this.timezone).format('YYYY-MM-DD HH:mm:ss z')}</p>
          </div>
          
          <div style="background: white; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Metric:</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${alert.metric}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Current Value:</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">${currentValue}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Threshold:</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${alert.condition} ${alert.threshold}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #fef3c7; padding: 16px; border-radius: 6px; border-left: 4px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: #92400e;">Recommended Actions:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #92400e;">
              <li>Review the Analytics Dashboard immediately</li>
              <li>Check for any system issues or anomalies</li>
              <li>Consider adjusting business operations if needed</li>
            </ul>
          </div>
          
          <div style="margin-top: 20px; text-align: center;">
            <a href="https://www.fireflyestimator.com/admin/analytics" 
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Analytics Dashboard
            </a>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Advanced Report Generation and Scheduling
   */
  async generateExecutiveReport(filters = {}) {
    const db = await getDb()
    const endDate = moment().tz(this.timezone)
    const startDate = endDate.clone().subtract(30, 'days')
    
    // Gather comprehensive business metrics
    const metrics = await this._gatherExecutiveMetrics(db, startDate, endDate, filters)
    
    // Generate insights and recommendations
    const insights = await this._generateExecutiveInsights(metrics)
    
    // Create visualizations data
    const visualizations = await this._prepareExecutiveVisualizations(metrics)
    
    return {
      reportType: 'executive',
      period: {
        start: startDate.format('YYYY-MM-DD'),
        end: endDate.format('YYYY-MM-DD'),
        label: 'Last 30 Days'
      },
      executiveSummary: {
        keyMetrics: metrics.summary,
        highlights: insights.highlights,
        concerns: insights.concerns,
        recommendations: insights.recommendations
      },
      detailedMetrics: metrics.detailed,
      visualizations: visualizations,
      appendices: {
        methodology: this._getReportMethodology(),
        dataQuality: metrics.dataQuality,
        glossary: this._getMetricsGlossary()
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: 'Enterprise Analytics Engine',
        version: '1.0',
        confidentiality: 'Internal Use Only'
      }
    }
  }

  /**
   * Real-time Analytics Monitoring
   */
  async startRealTimeMonitoring(config = {}) {
    const monitorId = uuidv4()
    const monitor = {
      id: monitorId,
      metrics: config.metrics || ['revenue', 'orders', 'users', 'errors'],
      interval: config.interval || 60000, // 1 minute default
      thresholds: config.thresholds || {},
      callbacks: config.callbacks || [],
      startedAt: new Date(),
      isActive: true
    }
    
    this.activeMonitors.set(monitorId, monitor)
    
    // Start monitoring loop
    const intervalId = setInterval(async () => {
      try {
        await this._performMonitoringCheck(monitor)
      } catch (error) {
        console.error(`[ENTERPRISE_ANALYTICS] Monitor ${monitorId} error:`, error.message)
      }
    }, monitor.interval)
    
    monitor.intervalId = intervalId
    
    return {
      monitorId: monitorId,
      status: 'active',
      metrics: monitor.metrics,
      interval: monitor.interval
    }
  }

  /**
   * Advanced Filtering Interface
   */
  getAvailableFilters() {
    return {
      dateRange: {
        type: 'date_range',
        label: 'Date Range',
        options: ['today', 'yesterday', 'last_7_days', 'last_30_days', 'last_90_days', 'custom']
      },
      userSegment: {
        type: 'select',
        label: 'User Segment',
        options: ['new', 'returning', 'vip', 'at_risk', 'churned']
      },
      location: {
        type: 'nested',
        label: 'Geographic Location',
        fields: {
          country: { type: 'select', options: this._getCountryOptions() },
          state: { type: 'select', options: this._getStateOptions() },
          city: { type: 'autocomplete' }
        }
      },
      device: {
        type: 'select',
        label: 'Device Type',
        options: ['desktop', 'mobile', 'tablet']
      },
      source: {
        type: 'select',
        label: 'Traffic Source',
        options: ['organic', 'paid', 'social', 'email', 'direct', 'referral']
      },
      orderValue: {
        type: 'range',
        label: 'Order Value Range',
        min: 0,
        max: 200000,
        step: 1000
      },
      customerType: {
        type: 'multi_select',
        label: 'Customer Type',
        options: ['first_time', 'repeat', 'corporate', 'individual']
      }
    }
  }

  // Private helper methods

  _startKPIMonitoring(alert) {
    const checkInterval = this._parseTimeWindow(alert.timeWindow)
    
    const intervalId = setInterval(async () => {
      try {
        await this._evaluateAlert(alert)
      } catch (error) {
        console.error(`[ENTERPRISE_ANALYTICS] KPI monitoring error for ${alert.id}:`, error.message)
      }
    }, checkInterval * 60 * 1000) // Convert to milliseconds
    
    this.alertThresholds.set(alert.id, {
      ...alert,
      intervalId: intervalId
    })
  }

  _parseTimeWindow(timeWindow) {
    // Parse time windows like '1h', '30m', '1d'
    const match = timeWindow.match(/^(\d+)([hmsd])$/)
    if (!match) return 60 // Default 60 minutes
    
    const [, value, unit] = match
    const multipliers = { m: 1, h: 60, d: 1440, s: 1/60 }
    
    return parseInt(value) * (multipliers[unit] || 60)
  }

  _calculateNextSendTime(frequency, time, timezone) {
    const now = moment().tz(timezone)
    const [hour, minute] = time.split(':').map(Number)
    
    let nextSend = now.clone().hour(hour).minute(minute).second(0)
    
    switch (frequency) {
      case 'daily':
        if (nextSend.isBefore(now)) {
          nextSend.add(1, 'day')
        }
        break
      case 'weekly':
        nextSend.day(1) // Monday
        if (nextSend.isBefore(now)) {
          nextSend.add(1, 'week')
        }
        break
      case 'monthly':
        nextSend.date(1) // First of month
        if (nextSend.isBefore(now)) {
          nextSend.add(1, 'month')
        }
        break
      case 'quarterly':
        const currentQuarter = Math.floor((now.month()) / 3)
        nextSend.month(currentQuarter * 3).date(1)
        if (nextSend.isBefore(now)) {
          nextSend.add(3, 'months')
        }
        break
    }
    
    return nextSend.toDate()
  }

  async _gatherExecutiveMetrics(db, startDate, endDate, filters) {
    // This would integrate with all our analytics APIs
    // to gather comprehensive business metrics
    
    const ordersCollection = db.collection('Orders')
    const buildsCollection = db.collection('Builds')
    
    // Revenue metrics
    const revenueMetrics = await this._calculateRevenueMetrics(ordersCollection, startDate, endDate)
    
    // Customer metrics
    const customerMetrics = await this._calculateCustomerMetrics(ordersCollection, startDate, endDate)
    
    // Operational metrics
    const operationalMetrics = await this._calculateOperationalMetrics(buildsCollection, startDate, endDate)
    
    return {
      summary: {
        totalRevenue: revenueMetrics.total,
        totalOrders: customerMetrics.totalOrders,
        newCustomers: customerMetrics.newCustomers,
        conversionRate: revenueMetrics.conversionRate
      },
      detailed: {
        revenue: revenueMetrics,
        customers: customerMetrics,
        operations: operationalMetrics
      },
      dataQuality: this._assessDataQuality(revenueMetrics, customerMetrics, operationalMetrics)
    }
  }

  async _generateExecutiveInsights(metrics) {
    const insights = {
      highlights: [],
      concerns: [],
      recommendations: []
    }
    
    // Revenue insights
    if (metrics.detailed.revenue.growth > 20) {
      insights.highlights.push(`Strong revenue growth of ${metrics.detailed.revenue.growth.toFixed(1)}%`)
    }
    
    if (metrics.detailed.revenue.growth < -10) {
      insights.concerns.push(`Revenue decline of ${Math.abs(metrics.detailed.revenue.growth).toFixed(1)}%`)
      insights.recommendations.push('Investigate revenue decline causes and implement recovery strategy')
    }
    
    return insights
  }

  _getCountryOptions() {
    return ['US', 'CA', 'MX', 'UK', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK']
  }

  _getStateOptions() {
    return ['TX', 'CA', 'FL', 'NY', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI', 'NJ', 'VA', 'WA', 'AZ', 'MA']
  }
}

export default EnterpriseAnalyticsManager
