// Enterprise Conversion Funnel Analytics
// Track user journey, identify drop-off points, and optimize conversion rates

import { getDb } from '../db.js'
import moment from 'moment-timezone'
import _ from 'lodash'

export class ConversionFunnelAnalyzer {
  constructor() {
    this.funnelSteps = {
      // Website engagement
      'homepage_view': { order: 1, category: 'awareness', name: 'Homepage View' },
      'model_view': { order: 2, category: 'interest', name: 'Model View' },
      'estimator_start': { order: 3, category: 'consideration', name: 'Estimator Started' },
      
      // Build process
      'build_started': { order: 4, category: 'consideration', name: 'Build Started' },
      'customization_complete': { order: 5, category: 'consideration', name: 'Customization Complete' },
      'pricing_viewed': { order: 6, category: 'consideration', name: 'Pricing Viewed' },
      
      // Conversion process
      'financing_selected': { order: 7, category: 'intent', name: 'Financing Selected' },
      'buyer_info_complete': { order: 8, category: 'intent', name: 'Buyer Info Complete' },
      'review_complete': { order: 9, category: 'intent', name: 'Review Complete' },
      
      // Transaction completion
      'payment_initiated': { order: 10, category: 'action', name: 'Payment Initiated' },
      'contract_signed': { order: 11, category: 'action', name: 'Contract Signed' },
      'order_confirmed': { order: 12, category: 'conversion', name: 'Order Confirmed' }
    }
    
    this.conversionGoals = {
      primary: 'order_confirmed',
      secondary: ['contract_signed', 'payment_initiated'],
      micro: ['build_started', 'customization_complete']
    }
  }

  /**
   * Analyze complete conversion funnel with drop-off analysis
   * @param {Object} options - Analysis configuration
   * @returns {Object} Comprehensive funnel analysis
   */
  async analyzeFunnel(options = {}) {
    const config = {
      timeRange: options.timeRange || '30d',
      segmentation: options.segmentation || null, // 'device', 'source', 'location'
      cohortPeriod: options.cohortPeriod || 'weekly',
      ...options
    }

    const db = await getDb()
    const analyticsCollection = db.collection('analytics')
    
    // Calculate date range
    const endDate = moment().tz(this.timezone)
    const startDate = this._calculateStartDate(endDate, config.timeRange)
    
    // Get funnel data
    const funnelData = await this._getFunnelData(analyticsCollection, startDate, endDate, config)
    
    // Calculate conversion rates
    const conversionRates = this._calculateConversionRates(funnelData)
    
    // Identify drop-off points
    const dropOffAnalysis = this._analyzeDropOffs(funnelData, conversionRates)
    
    // Cohort analysis
    const cohortAnalysis = await this._performCohortAnalysis(analyticsCollection, startDate, endDate, config)
    
    // User journey analysis
    const journeyAnalysis = await this._analyzeUserJourneys(analyticsCollection, startDate, endDate)
    
    // Optimization recommendations
    const optimizations = this._generateOptimizationRecommendations(dropOffAnalysis, cohortAnalysis, journeyAnalysis)

    return {
      funnel: {
        steps: funnelData,
        conversionRates: conversionRates,
        overallConversion: conversionRates.overall
      },
      dropOffs: dropOffAnalysis,
      cohorts: cohortAnalysis,
      journeys: journeyAnalysis,
      optimizations: optimizations,
      metadata: {
        timeRange: config.timeRange,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        segmentation: config.segmentation,
        generatedAt: new Date().toISOString()
      }
    }
  }

  /**
   * Real-time conversion tracking
   * @param {string} userId - User identifier
   * @param {string} step - Funnel step
   * @param {Object} metadata - Additional tracking data
   */
  async trackConversion(userId, step, metadata = {}) {
    if (!this.funnelSteps[step]) {
      throw new Error(`Invalid funnel step: ${step}`)
    }

    const db = await getDb()
    const analyticsCollection = db.collection('analytics')
    
    const event = {
      userId: userId,
      sessionId: metadata.sessionId || `session_${Date.now()}`,
      step: step,
      stepOrder: this.funnelSteps[step].order,
      category: this.funnelSteps[step].category,
      timestamp: new Date(),
      metadata: {
        userAgent: metadata.userAgent,
        referrer: metadata.referrer,
        source: metadata.source,
        medium: metadata.medium,
        campaign: metadata.campaign,
        device: metadata.device,
        location: metadata.location,
        ...metadata
      }
    }
    
    await analyticsCollection.insertOne(event)
    
    // Check for conversion completion
    const conversionComplete = await this._checkConversionComplete(userId, analyticsCollection)
    
    return {
      tracked: true,
      step: step,
      stepOrder: this.funnelSteps[step].order,
      conversionComplete: conversionComplete,
      nextSteps: this._getNextSteps(step)
    }
  }

  /**
   * Advanced user journey mapping
   * @param {string} userId - User to analyze
   * @returns {Object} Detailed user journey
   */
  async mapUserJourney(userId) {
    const db = await getDb()
    const analyticsCollection = db.collection('analytics')
    
    const userEvents = await analyticsCollection
      .find({ userId: userId })
      .sort({ timestamp: 1 })
      .toArray()
    
    // Build journey path
    const journey = this._buildJourneyPath(userEvents)
    
    // Calculate journey metrics
    const metrics = this._calculateJourneyMetrics(journey)
    
    // Identify bottlenecks
    const bottlenecks = this._identifyJourneyBottlenecks(journey)
    
    return {
      userId: userId,
      journey: journey,
      metrics: metrics,
      bottlenecks: bottlenecks,
      recommendations: this._generateJourneyRecommendations(journey, metrics, bottlenecks)
    }
  }

  // Private helper methods

  async _getFunnelData(collection, startDate, endDate, config) {
    const pipeline = [
      {
        $match: {
          timestamp: { $gte: startDate.toDate(), $lte: endDate.toDate() },
          step: { $in: Object.keys(this.funnelSteps) }
        }
      },
      {
        $group: {
          _id: {
            step: '$step',
            ...(config.segmentation ? { segment: `$metadata.${config.segmentation}` } : {})
          },
          uniqueUsers: { $addToSet: '$userId' },
          totalEvents: { $sum: 1 }
        }
      },
      {
        $project: {
          step: '$_id.step',
          segment: '$_id.segment',
          uniqueUsers: { $size: '$uniqueUsers' },
          totalEvents: '$totalEvents'
        }
      },
      { $sort: { step: 1 } }
    ]
    
    const results = await collection.aggregate(pipeline).toArray()
    
    // Organize by funnel step order
    const organizedData = {}
    Object.keys(this.funnelSteps).forEach(step => {
      const stepData = results.filter(r => r.step === step)
      organizedData[step] = {
        step: step,
        name: this.funnelSteps[step].name,
        order: this.funnelSteps[step].order,
        category: this.funnelSteps[step].category,
        uniqueUsers: stepData.reduce((sum, d) => sum + d.uniqueUsers, 0),
        totalEvents: stepData.reduce((sum, d) => sum + d.totalEvents, 0),
        segments: config.segmentation ? stepData : null
      }
    })
    
    return organizedData
  }

  _calculateConversionRates(funnelData) {
    const steps = Object.values(funnelData).sort((a, b) => a.order - b.order)
    const conversionRates = {}
    
    // Calculate step-to-step conversion rates
    for (let i = 0; i < steps.length - 1; i++) {
      const currentStep = steps[i]
      const nextStep = steps[i + 1]
      
      const rate = currentStep.uniqueUsers > 0 ? 
        (nextStep.uniqueUsers / currentStep.uniqueUsers) * 100 : 0
      
      conversionRates[`${currentStep.step}_to_${nextStep.step}`] = {
        from: currentStep.step,
        to: nextStep.step,
        rate: rate,
        fromUsers: currentStep.uniqueUsers,
        toUsers: nextStep.uniqueUsers,
        dropOff: currentStep.uniqueUsers - nextStep.uniqueUsers
      }
    }
    
    // Calculate overall conversion rate (first step to final conversion)
    const firstStep = steps[0]
    const finalStep = steps.find(s => s.step === this.conversionGoals.primary)
    
    conversionRates.overall = {
      rate: firstStep && finalStep && firstStep.uniqueUsers > 0 ? 
        (finalStep.uniqueUsers / firstStep.uniqueUsers) * 100 : 0,
      topOfFunnel: firstStep?.uniqueUsers || 0,
      conversions: finalStep?.uniqueUsers || 0
    }
    
    return conversionRates
  }

  _analyzeDropOffs(funnelData, conversionRates) {
    const dropOffs = []
    
    Object.values(conversionRates).forEach(conversion => {
      if (conversion.rate !== undefined && conversion.rate < 50) { // Less than 50% conversion
        dropOffs.push({
          step: conversion.from,
          nextStep: conversion.to,
          dropOffRate: 100 - conversion.rate,
          usersLost: conversion.dropOff,
          severity: this._calculateDropOffSeverity(conversion.rate),
          recommendations: this._getDropOffRecommendations(conversion.from, conversion.to, conversion.rate)
        })
      }
    })
    
    return dropOffs.sort((a, b) => b.dropOffRate - a.dropOffRate)
  }

  _calculateDropOffSeverity(conversionRate) {
    if (conversionRate < 10) return 'critical'
    if (conversionRate < 25) return 'high'
    if (conversionRate < 50) return 'medium'
    return 'low'
  }

  _getDropOffRecommendations(fromStep, toStep, rate) {
    const recommendations = []
    
    // Step-specific recommendations
    if (fromStep === 'model_view' && toStep === 'estimator_start') {
      recommendations.push('Add prominent "Start Building" CTA on model pages')
      recommendations.push('Simplify estimator entry process')
    }
    
    if (fromStep === 'build_started' && toStep === 'customization_complete') {
      recommendations.push('Improve customization UI/UX')
      recommendations.push('Add progress indicators')
      recommendations.push('Implement save-and-continue functionality')
    }
    
    if (fromStep === 'review_complete' && toStep === 'payment_initiated') {
      recommendations.push('Optimize payment flow')
      recommendations.push('Add trust signals and security badges')
      recommendations.push('Offer multiple payment options')
    }
    
    // Generic recommendations based on severity
    if (rate < 25) {
      recommendations.push('Consider A/B testing different approaches')
      recommendations.push('Implement exit-intent surveys to understand barriers')
    }
    
    return recommendations
  }

  async _performCohortAnalysis(collection, startDate, endDate, config) {
    // Group users by their first interaction date
    const cohortPipeline = [
      {
        $match: {
          timestamp: { $gte: startDate.toDate(), $lte: endDate.toDate() }
        }
      },
      {
        $group: {
          _id: '$userId',
          firstInteraction: { $min: '$timestamp' },
          steps: { $addToSet: '$step' },
          lastInteraction: { $max: '$timestamp' }
        }
      },
      {
        $project: {
          userId: '$_id',
          cohortPeriod: {
            $dateToString: {
              format: config.cohortPeriod === 'weekly' ? '%Y-W%U' : '%Y-%m',
              date: '$firstInteraction'
            }
          },
          daysSinceFirst: {
            $divide: [
              { $subtract: ['$lastInteraction', '$firstInteraction'] },
              1000 * 60 * 60 * 24
            ]
          },
          stepsCompleted: { $size: '$steps' },
          converted: { $in: [this.conversionGoals.primary, '$steps'] }
        }
      },
      {
        $group: {
          _id: '$cohortPeriod',
          totalUsers: { $sum: 1 },
          conversions: { $sum: { $cond: ['$converted', 1, 0] } },
          avgStepsCompleted: { $avg: '$stepsCompleted' },
          avgDaysToConvert: { $avg: '$daysSinceFirst' }
        }
      },
      { $sort: { '_id': 1 } }
    ]
    
    const cohortResults = await collection.aggregate(cohortPipeline).toArray()
    
    return {
      cohorts: cohortResults.map(cohort => ({
        period: cohort._id,
        totalUsers: cohort.totalUsers,
        conversions: cohort.conversions,
        conversionRate: cohort.totalUsers > 0 ? (cohort.conversions / cohort.totalUsers) * 100 : 0,
        avgStepsCompleted: Math.round(cohort.avgStepsCompleted * 10) / 10,
        avgDaysToConvert: Math.round(cohort.avgDaysToConvert * 10) / 10
      })),
      summary: this._summarizeCohortAnalysis(cohortResults)
    }
  }

  async _analyzeUserJourneys(collection, startDate, endDate) {
    // Get all user journeys in the time period
    const journeyPipeline = [
      {
        $match: {
          timestamp: { $gte: startDate.toDate(), $lte: endDate.toDate() }
        }
      },
      {
        $group: {
          _id: '$userId',
          journey: {
            $push: {
              step: '$step',
              timestamp: '$timestamp',
              metadata: '$metadata'
            }
          }
        }
      },
      {
        $project: {
          userId: '$_id',
          journey: {
            $sortArray: {
              input: '$journey',
              sortBy: { timestamp: 1 }
            }
          }
        }
      }
    ]
    
    const journeys = await collection.aggregate(journeyPipeline).toArray()
    
    // Analyze journey patterns
    const patterns = this._analyzeJourneyPatterns(journeys)
    
    // Calculate journey metrics
    const metrics = this._calculateJourneyMetrics(journeys)
    
    return {
      totalJourneys: journeys.length,
      patterns: patterns,
      metrics: metrics,
      commonPaths: this._identifyCommonPaths(journeys),
      abandonment: this._analyzeAbandonment(journeys)
    }
  }

  _analyzeJourneyPatterns(journeys) {
    const patterns = {
      linear: 0, // Users who follow the expected path
      backtrack: 0, // Users who go backwards in the funnel
      skip: 0, // Users who skip steps
      loop: 0 // Users who repeat steps
    }
    
    journeys.forEach(journey => {
      const steps = journey.journey.map(j => j.step)
      const stepOrders = steps.map(step => this.funnelSteps[step]?.order || 0)
      
      // Check if journey is linear
      const isLinear = this._isLinearJourney(stepOrders)
      if (isLinear) {
        patterns.linear++
        return
      }
      
      // Check for backtracking
      if (this._hasBacktracking(stepOrders)) {
        patterns.backtrack++
      }
      
      // Check for step skipping
      if (this._hasStepSkipping(stepOrders)) {
        patterns.skip++
      }
      
      // Check for looping
      if (this._hasLooping(steps)) {
        patterns.loop++
      }
    })
    
    const total = journeys.length
    return {
      counts: patterns,
      percentages: {
        linear: total > 0 ? (patterns.linear / total) * 100 : 0,
        backtrack: total > 0 ? (patterns.backtrack / total) * 100 : 0,
        skip: total > 0 ? (patterns.skip / total) * 100 : 0,
        loop: total > 0 ? (patterns.loop / total) * 100 : 0
      }
    }
  }

  _calculateJourneyMetrics(journeys) {
    const metrics = {
      avgJourneyLength: 0,
      avgTimeToConvert: 0,
      conversionRate: 0,
      abandonmentRate: 0,
      avgStepsToConversion: 0
    }
    
    if (journeys.length === 0) return metrics
    
    let totalSteps = 0
    let totalConversions = 0
    let totalTimeToConvert = 0
    let conversionsWithTime = 0
    
    journeys.forEach(journey => {
      const steps = journey.journey
      totalSteps += steps.length
      
      // Check if journey resulted in conversion
      const hasConversion = steps.some(step => step.step === this.conversionGoals.primary)
      if (hasConversion) {
        totalConversions++
        
        // Calculate time to conversion
        const firstStep = steps[0]
        const conversionStep = steps.find(step => step.step === this.conversionGoals.primary)
        
        if (firstStep && conversionStep) {
          const timeToConvert = (new Date(conversionStep.timestamp) - new Date(firstStep.timestamp)) / (1000 * 60 * 60) // hours
          totalTimeToConvert += timeToConvert
          conversionsWithTime++
        }
      }
    })
    
    metrics.avgJourneyLength = totalSteps / journeys.length
    metrics.conversionRate = (totalConversions / journeys.length) * 100
    metrics.abandonmentRate = 100 - metrics.conversionRate
    metrics.avgTimeToConvert = conversionsWithTime > 0 ? totalTimeToConvert / conversionsWithTime : 0
    metrics.avgStepsToConversion = totalConversions > 0 ? totalSteps / totalConversions : 0
    
    return metrics
  }

  _identifyCommonPaths(journeys) {
    const pathCounts = {}
    
    journeys.forEach(journey => {
      const path = journey.journey.map(j => j.step).join(' → ')
      pathCounts[path] = (pathCounts[path] || 0) + 1
    })
    
    // Get top 10 most common paths
    const commonPaths = Object.entries(pathCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([path, count]) => ({
        path: path,
        count: count,
        percentage: (count / journeys.length) * 100
      }))
    
    return commonPaths
  }

  _analyzeAbandonment(journeys) {
    const abandonmentPoints = {}
    
    journeys.forEach(journey => {
      const steps = journey.journey.map(j => j.step)
      const hasConversion = steps.includes(this.conversionGoals.primary)
      
      if (!hasConversion && steps.length > 0) {
        const lastStep = steps[steps.length - 1]
        abandonmentPoints[lastStep] = (abandonmentPoints[lastStep] || 0) + 1
      }
    })
    
    const totalAbandoned = Object.values(abandonmentPoints).reduce((sum, count) => sum + count, 0)
    
    return {
      totalAbandoned: totalAbandoned,
      abandonmentRate: journeys.length > 0 ? (totalAbandoned / journeys.length) * 100 : 0,
      abandonmentPoints: Object.entries(abandonmentPoints)
        .sort(([,a], [,b]) => b - a)
        .map(([step, count]) => ({
          step: step,
          name: this.funnelSteps[step]?.name || step,
          count: count,
          percentage: totalAbandoned > 0 ? (count / totalAbandoned) * 100 : 0
        }))
    }
  }

  _generateOptimizationRecommendations(dropOffs, cohorts, journeys) {
    const recommendations = []
    
    // High-priority drop-off recommendations
    dropOffs.slice(0, 3).forEach(dropOff => {
      if (dropOff.severity === 'critical') {
        recommendations.push({
          type: 'critical_optimization',
          priority: 'urgent',
          area: dropOff.step,
          issue: `Critical drop-off: ${dropOff.dropOffRate.toFixed(1)}% of users abandon at ${dropOff.step}`,
          impact: 'high',
          effort: 'medium',
          recommendations: dropOff.recommendations
        })
      }
    })
    
    // Journey optimization recommendations
    if (journeys.metrics.avgTimeToConvert > 24) { // More than 24 hours
      recommendations.push({
        type: 'journey_optimization',
        priority: 'high',
        area: 'conversion_speed',
        issue: `Long conversion time: ${journeys.metrics.avgTimeToConvert.toFixed(1)} hours average`,
        impact: 'high',
        effort: 'high',
        recommendations: [
          'Implement urgency indicators',
          'Add limited-time offers',
          'Simplify decision-making process',
          'Provide immediate value propositions'
        ]
      })
    }
    
    // Cohort-based recommendations
    if (cohorts.summary.declineRate > 20) {
      recommendations.push({
        type: 'cohort_optimization',
        priority: 'medium',
        area: 'user_acquisition',
        issue: `Declining cohort performance: ${cohorts.summary.declineRate.toFixed(1)}% decline`,
        impact: 'medium',
        effort: 'high',
        recommendations: [
          'Review user acquisition channels',
          'Improve onboarding experience',
          'Enhance value proposition communication'
        ]
      })
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { urgent: 3, high: 2, medium: 1, low: 0 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  _calculateStartDate(endDate, timeRange) {
    switch (timeRange) {
      case '7d': return endDate.clone().subtract(7, 'days')
      case '30d': return endDate.clone().subtract(30, 'days')
      case '90d': return endDate.clone().subtract(90, 'days')
      case '1y': return endDate.clone().subtract(1, 'year')
      default: return endDate.clone().subtract(30, 'days')
    }
  }

  _isLinearJourney(stepOrders) {
    for (let i = 1; i < stepOrders.length; i++) {
      if (stepOrders[i] <= stepOrders[i - 1]) {
        return false
      }
    }
    return true
  }

  _hasBacktracking(stepOrders) {
    for (let i = 1; i < stepOrders.length; i++) {
      if (stepOrders[i] < stepOrders[i - 1]) {
        return true
      }
    }
    return false
  }

  _hasStepSkipping(stepOrders) {
    const sortedOrders = [...stepOrders].sort((a, b) => a - b)
    for (let i = 1; i < sortedOrders.length; i++) {
      if (sortedOrders[i] - sortedOrders[i - 1] > 1) {
        return true
      }
    }
    return false
  }

  _hasLooping(steps) {
    const stepCounts = {}
    steps.forEach(step => {
      stepCounts[step] = (stepCounts[step] || 0) + 1
    })
    return Object.values(stepCounts).some(count => count > 1)
  }
}

export default ConversionFunnelAnalyzer
