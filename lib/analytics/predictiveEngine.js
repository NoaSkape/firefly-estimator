// Enterprise Predictive Analytics Engine
// Advanced forecasting, seasonal analysis, and customer lifetime value calculations

import { SimpleLinearRegression, PolynomialRegression } from 'ml-regression'
import * as ss from 'simple-statistics'
import moment from 'moment-timezone'
import _ from 'lodash'

export class PredictiveAnalyticsEngine {
  constructor() {
    this.timezone = 'America/Chicago' // Default timezone for business
    this.forecastPeriods = 12 // Default 12 periods ahead
    this.confidenceInterval = 0.95
  }

  /**
   * Advanced Revenue Forecasting using multiple models
   * @param {Array} historicalData - Array of {date, revenue} objects
   * @param {number} periods - Number of periods to forecast
   * @returns {Object} Forecast results with confidence intervals
   */
  async forecastRevenue(historicalData, periods = 12) {
    if (!historicalData || historicalData.length < 3) {
      throw new Error('Insufficient historical data for forecasting (minimum 3 data points)')
    }

    // Prepare data for analysis
    const preparedData = this._prepareTimeSeriesData(historicalData)
    
    // Multiple forecasting models
    const models = {
      linear: this._linearTrendForecast(preparedData, periods),
      seasonal: this._seasonalForecast(preparedData, periods),
      polynomial: this._polynomialForecast(preparedData, periods),
      exponential: this._exponentialSmoothingForecast(preparedData, periods)
    }

    // Ensemble forecast (weighted average of models)
    const ensembleForecast = this._createEnsembleForecast(models, periods)

    // Calculate forecast accuracy metrics
    const accuracy = this._calculateForecastAccuracy(preparedData)

    return {
      forecast: ensembleForecast,
      models: models,
      accuracy: accuracy,
      metadata: {
        dataPoints: historicalData.length,
        forecastPeriods: periods,
        confidenceInterval: this.confidenceInterval,
        generatedAt: new Date().toISOString(),
        timezone: this.timezone
      }
    }
  }

  /**
   * Seasonal Analysis - Identify patterns and seasonality
   * @param {Array} historicalData - Time series data
   * @returns {Object} Seasonal analysis results
   */
  async analyzeSeasonality(historicalData) {
    const preparedData = this._prepareTimeSeriesData(historicalData)
    
    // Decompose time series into trend, seasonal, and residual components
    const decomposition = this._decomposeTimeSeries(preparedData)
    
    // Identify seasonal patterns
    const seasonalPatterns = this._identifySeasonalPatterns(decomposition.seasonal)
    
    // Calculate seasonal indices
    const seasonalIndices = this._calculateSeasonalIndices(preparedData)
    
    // Peak and trough analysis
    const peakTroughAnalysis = this._analyzePeaksAndTroughs(preparedData)

    return {
      decomposition: decomposition,
      patterns: seasonalPatterns,
      indices: seasonalIndices,
      peakTrough: peakTroughAnalysis,
      recommendations: this._generateSeasonalRecommendations(seasonalPatterns),
      metadata: {
        analysisDate: new Date().toISOString(),
        dataSpan: {
          start: preparedData[0].date,
          end: preparedData[preparedData.length - 1].date,
          totalDays: preparedData.length
        }
      }
    }
  }

  /**
   * Customer Lifetime Value Calculation
   * @param {Array} customerData - Customer transaction history
   * @param {Object} options - Configuration options
   * @returns {Object} CLV analysis results
   */
  async calculateCustomerLifetimeValue(customerData, options = {}) {
    const config = {
      discountRate: options.discountRate || 0.1, // 10% annual discount rate
      predictionPeriod: options.predictionPeriod || 36, // 36 months
      churnThreshold: options.churnThreshold || 180, // 180 days inactive = churned
      ...options
    }

    // Calculate key CLV metrics for each customer
    const clvMetrics = customerData.map(customer => {
      const transactions = customer.transactions || []
      
      // Basic metrics
      const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0)
      const transactionCount = transactions.length
      const avgOrderValue = transactionCount > 0 ? totalRevenue / transactionCount : 0
      
      // Time-based analysis
      const firstPurchase = new Date(Math.min(...transactions.map(t => new Date(t.date))))
      const lastPurchase = new Date(Math.max(...transactions.map(t => new Date(t.date))))
      const customerLifespan = (lastPurchase - firstPurchase) / (1000 * 60 * 60 * 24) // days
      
      // Purchase frequency
      const purchaseFrequency = customerLifespan > 0 ? transactionCount / (customerLifespan / 30) : 0 // per month
      
      // Churn probability
      const daysSinceLastPurchase = (new Date() - lastPurchase) / (1000 * 60 * 60 * 24)
      const churnProbability = this._calculateChurnProbability(daysSinceLastPurchase, config.churnThreshold)
      
      // Predicted CLV
      const predictedClv = this._calculatePredictedCLV({
        avgOrderValue,
        purchaseFrequency,
        churnProbability,
        discountRate: config.discountRate,
        predictionPeriod: config.predictionPeriod
      })

      return {
        customerId: customer.id,
        historicalClv: totalRevenue,
        predictedClv: predictedClv,
        avgOrderValue: avgOrderValue,
        purchaseFrequency: purchaseFrequency,
        customerLifespan: customerLifespan,
        churnProbability: churnProbability,
        transactionCount: transactionCount,
        firstPurchase: firstPurchase,
        lastPurchase: lastPurchase,
        segment: this._segmentCustomer(predictedClv, avgOrderValue, purchaseFrequency)
      }
    })

    // Aggregate insights
    const aggregateInsights = this._calculateAggregateCLVInsights(clvMetrics)

    return {
      customerMetrics: clvMetrics,
      aggregateInsights: aggregateInsights,
      segmentation: this._performCLVSegmentation(clvMetrics),
      recommendations: this._generateCLVRecommendations(clvMetrics, aggregateInsights),
      metadata: {
        totalCustomers: customerData.length,
        analysisDate: new Date().toISOString(),
        configuration: config
      }
    }
  }

  /**
   * Market Trend Analysis
   * @param {Array} marketData - External market indicators
   * @param {Array} businessData - Internal business metrics
   * @returns {Object} Market trend analysis
   */
  async analyzeMarketTrends(marketData, businessData) {
    // Correlation analysis between market indicators and business performance
    const correlations = this._calculateCorrelations(marketData, businessData)
    
    // Market sentiment analysis
    const sentiment = this._analyzeSentiment(marketData)
    
    // Competitive positioning
    const positioning = this._analyzeCompetitivePosition(marketData, businessData)

    return {
      correlations: correlations,
      sentiment: sentiment,
      positioning: positioning,
      insights: this._generateMarketInsights(correlations, sentiment, positioning)
    }
  }

  // Private helper methods

  _prepareTimeSeriesData(data) {
    return data
      .map(item => ({
        date: moment(item.date).format('YYYY-MM-DD'),
        value: parseFloat(item.revenue || item.value || 0),
        timestamp: moment(item.date).valueOf()
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((item, index) => ({ ...item, index }))
  }

  _linearTrendForecast(data, periods) {
    const x = data.map(d => d.index)
    const y = data.map(d => d.value)
    
    const regression = new SimpleLinearRegression(x, y)
    const forecast = []
    
    for (let i = 1; i <= periods; i++) {
      const nextIndex = data.length + i - 1
      const predictedValue = regression.predict(nextIndex)
      const futureDate = moment(data[data.length - 1].date).add(i, 'days').format('YYYY-MM-DD')
      
      forecast.push({
        date: futureDate,
        value: Math.max(0, predictedValue), // Ensure non-negative
        confidence: this._calculateLinearConfidence(regression, nextIndex, data)
      })
    }
    
    return {
      type: 'linear',
      forecast: forecast,
      r2: regression.score(x, y),
      slope: regression.slope,
      intercept: regression.intercept
    }
  }

  _seasonalForecast(data, periods) {
    // Identify seasonal pattern (weekly, monthly, quarterly)
    const seasonalPeriod = this._identifySeasonalPeriod(data)
    
    if (seasonalPeriod === 0) {
      // No seasonality detected, fall back to trend
      return this._linearTrendForecast(data, periods)
    }

    const seasonalIndices = this._calculateSeasonalIndices(data, seasonalPeriod)
    const detrended = this._detrend(data)
    const trendForecast = this._linearTrendForecast(detrended, periods)
    
    // Apply seasonal adjustment to trend forecast
    const forecast = trendForecast.forecast.map((item, index) => {
      const seasonalIndex = seasonalIndices[index % seasonalPeriod]
      return {
        ...item,
        value: item.value * seasonalIndex,
        seasonalAdjustment: seasonalIndex
      }
    })

    return {
      type: 'seasonal',
      forecast: forecast,
      seasonalPeriod: seasonalPeriod,
      seasonalIndices: seasonalIndices
    }
  }

  _polynomialForecast(data, periods) {
    const x = data.map(d => d.index)
    const y = data.map(d => d.value)
    
    // Use degree 2 polynomial for most business data
    const regression = new PolynomialRegression(x, y, 2)
    const forecast = []
    
    for (let i = 1; i <= periods; i++) {
      const nextIndex = data.length + i - 1
      const predictedValue = regression.predict(nextIndex)
      const futureDate = moment(data[data.length - 1].date).add(i, 'days').format('YYYY-MM-DD')
      
      forecast.push({
        date: futureDate,
        value: Math.max(0, predictedValue),
        confidence: this._calculatePolynomialConfidence(regression, nextIndex, data)
      })
    }
    
    return {
      type: 'polynomial',
      forecast: forecast,
      degree: 2,
      coefficients: regression.coefficients
    }
  }

  _exponentialSmoothingForecast(data, periods) {
    // Holt-Winters exponential smoothing
    const alpha = 0.3 // Level smoothing
    const beta = 0.3  // Trend smoothing
    const gamma = 0.3 // Seasonal smoothing
    
    const smoothed = this._applyExponentialSmoothing(data, alpha, beta, gamma)
    const forecast = []
    
    for (let i = 1; i <= periods; i++) {
      const futureDate = moment(data[data.length - 1].date).add(i, 'days').format('YYYY-MM-DD')
      const predictedValue = smoothed.level + (i * smoothed.trend)
      
      forecast.push({
        date: futureDate,
        value: Math.max(0, predictedValue),
        level: smoothed.level,
        trend: smoothed.trend
      })
    }
    
    return {
      type: 'exponential_smoothing',
      forecast: forecast,
      parameters: { alpha, beta, gamma },
      finalState: smoothed
    }
  }

  _createEnsembleForecast(models, periods) {
    // Weighted ensemble based on model performance
    const weights = {
      linear: 0.2,
      seasonal: 0.3,
      polynomial: 0.2,
      exponential: 0.3
    }
    
    const ensembleForecast = []
    
    for (let i = 0; i < periods; i++) {
      let weightedSum = 0
      let totalWeight = 0
      let date = null
      
      Object.entries(models).forEach(([modelType, model]) => {
        if (model.forecast && model.forecast[i]) {
          const weight = weights[modelType] || 0.25
          weightedSum += model.forecast[i].value * weight
          totalWeight += weight
          date = model.forecast[i].date
        }
      })
      
      const ensembleValue = totalWeight > 0 ? weightedSum / totalWeight : 0
      
      // Calculate prediction interval
      const modelValues = Object.values(models)
        .filter(m => m.forecast && m.forecast[i])
        .map(m => m.forecast[i].value)
      
      const std = ss.standardDeviation(modelValues)
      const mean = ss.mean(modelValues)
      
      ensembleForecast.push({
        date: date,
        value: ensembleValue,
        upperBound: ensembleValue + (1.96 * std), // 95% confidence
        lowerBound: Math.max(0, ensembleValue - (1.96 * std)),
        standardDeviation: std,
        modelAgreement: this._calculateModelAgreement(modelValues)
      })
    }
    
    return ensembleForecast
  }

  _calculateForecastAccuracy(data) {
    // Use last 20% of data for validation
    const validationSize = Math.floor(data.length * 0.2)
    const trainData = data.slice(0, -validationSize)
    const testData = data.slice(-validationSize)
    
    if (testData.length === 0) return null
    
    // Generate forecast for validation period
    const validationForecast = this._linearTrendForecast(trainData, testData.length)
    
    // Calculate accuracy metrics
    const actual = testData.map(d => d.value)
    const predicted = validationForecast.forecast.map(f => f.value)
    
    const mae = ss.meanAbsoluteError(actual, predicted)
    const mse = ss.meanSquaredError(actual, predicted)
    const rmse = Math.sqrt(mse)
    const mape = this._calculateMAPE(actual, predicted)
    
    return {
      mae: mae,
      mse: mse,
      rmse: rmse,
      mape: mape,
      validationPeriod: validationSize
    }
  }

  _calculateMAPE(actual, predicted) {
    let sum = 0
    let count = 0
    
    for (let i = 0; i < actual.length; i++) {
      if (actual[i] !== 0) {
        sum += Math.abs((actual[i] - predicted[i]) / actual[i])
        count++
      }
    }
    
    return count > 0 ? (sum / count) * 100 : 0
  }

  _decomposeTimeSeries(data) {
    // Simple moving average decomposition
    const windowSize = Math.min(7, Math.floor(data.length / 4))
    const trend = this._calculateMovingAverage(data.map(d => d.value), windowSize)
    
    // Calculate seasonal component
    const seasonal = data.map((d, i) => {
      const trendValue = trend[i] || d.value
      return d.value - trendValue
    })
    
    // Residual component
    const residual = data.map((d, i) => {
      const trendValue = trend[i] || 0
      const seasonalValue = seasonal[i] || 0
      return d.value - trendValue - seasonalValue
    })
    
    return {
      original: data.map(d => d.value),
      trend: trend,
      seasonal: seasonal,
      residual: residual
    }
  }

  _calculateMovingAverage(values, windowSize) {
    const result = []
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2))
      const end = Math.min(values.length, i + Math.floor(windowSize / 2) + 1)
      const window = values.slice(start, end)
      result.push(ss.mean(window))
    }
    return result
  }

  _identifySeasonalPatterns(seasonalData) {
    // Analyze different seasonal periods (weekly, monthly, quarterly)
    const patterns = {
      weekly: this._analyzePattern(seasonalData, 7),
      monthly: this._analyzePattern(seasonalData, 30),
      quarterly: this._analyzePattern(seasonalData, 90)
    }
    
    return patterns
  }

  _analyzePattern(data, period) {
    if (data.length < period * 2) return null
    
    const cycles = Math.floor(data.length / period)
    const pattern = new Array(period).fill(0)
    
    for (let i = 0; i < cycles; i++) {
      for (let j = 0; j < period; j++) {
        const index = i * period + j
        if (index < data.length) {
          pattern[j] += data[index]
        }
      }
    }
    
    // Average the pattern
    return pattern.map(sum => sum / cycles)
  }

  _calculatePredictedCLV({ avgOrderValue, purchaseFrequency, churnProbability, discountRate, predictionPeriod }) {
    // CLV = (AOV × Purchase Frequency × Gross Margin) / (1 + Discount Rate - Retention Rate)
    const retentionRate = 1 - churnProbability
    const grossMargin = 0.7 // Assume 70% gross margin
    
    let clv = 0
    let currentRetention = retentionRate
    
    for (let month = 1; month <= predictionPeriod; month++) {
      const monthlyValue = avgOrderValue * purchaseFrequency * grossMargin * currentRetention
      const discountFactor = Math.pow(1 + discountRate / 12, -month)
      clv += monthlyValue * discountFactor
      currentRetention *= retentionRate // Compound retention
    }
    
    return clv
  }

  _calculateChurnProbability(daysSinceLastPurchase, churnThreshold) {
    // Sigmoid function for churn probability
    const x = daysSinceLastPurchase / churnThreshold
    return 1 / (1 + Math.exp(-5 * (x - 1)))
  }

  _segmentCustomer(clv, aov, frequency) {
    if (clv > 10000 && aov > 1000) return 'VIP'
    if (clv > 5000 && frequency > 0.5) return 'High Value'
    if (clv > 2000) return 'Medium Value'
    if (frequency > 0.2) return 'Frequent'
    return 'Standard'
  }

  _calculateAggregateCLVInsights(metrics) {
    const totalClv = metrics.reduce((sum, m) => sum + m.predictedClv, 0)
    const avgClv = totalClv / metrics.length
    const medianClv = ss.median(metrics.map(m => m.predictedClv))
    
    return {
      totalPredictedClv: totalClv,
      averageClv: avgClv,
      medianClv: medianClv,
      clvDistribution: this._calculateDistribution(metrics.map(m => m.predictedClv)),
      topCustomersContribution: this._calculateTopCustomersContribution(metrics)
    }
  }

  _calculateDistribution(values) {
    const sorted = values.sort((a, b) => a - b)
    return {
      min: sorted[0],
      q1: ss.quantile(sorted, 0.25),
      median: ss.median(sorted),
      q3: ss.quantile(sorted, 0.75),
      max: sorted[sorted.length - 1],
      std: ss.standardDeviation(sorted)
    }
  }

  _calculateTopCustomersContribution(metrics) {
    const sorted = metrics.sort((a, b) => b.predictedClv - a.predictedClv)
    const totalClv = sorted.reduce((sum, m) => sum + m.predictedClv, 0)
    
    const top10Percent = Math.ceil(sorted.length * 0.1)
    const top20Percent = Math.ceil(sorted.length * 0.2)
    
    const top10Clv = sorted.slice(0, top10Percent).reduce((sum, m) => sum + m.predictedClv, 0)
    const top20Clv = sorted.slice(0, top20Percent).reduce((sum, m) => sum + m.predictedClv, 0)
    
    return {
      top10PercentContribution: totalClv > 0 ? (top10Clv / totalClv) * 100 : 0,
      top20PercentContribution: totalClv > 0 ? (top20Clv / totalClv) * 100 : 0,
      paretoRatio: totalClv > 0 ? (top20Clv / totalClv) : 0
    }
  }

  _generateSeasonalRecommendations(patterns) {
    const recommendations = []
    
    // Analyze weekly patterns
    if (patterns.weekly) {
      const weeklyPeak = patterns.weekly.indexOf(Math.max(...patterns.weekly))
      const weeklyTrough = patterns.weekly.indexOf(Math.min(...patterns.weekly))
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      
      recommendations.push({
        type: 'weekly',
        insight: `Peak performance on ${days[weeklyPeak]}, lowest on ${days[weeklyTrough]}`,
        recommendation: `Focus marketing efforts on ${days[weeklyPeak]} and consider promotions on ${days[weeklyTrough]}`
      })
    }
    
    return recommendations
  }

  _generateCLVRecommendations(metrics, insights) {
    const recommendations = []
    
    // High-value customer retention
    const vipCustomers = metrics.filter(m => m.segment === 'VIP').length
    if (vipCustomers > 0) {
      recommendations.push({
        type: 'retention',
        priority: 'high',
        insight: `${vipCustomers} VIP customers contribute significantly to CLV`,
        recommendation: 'Implement dedicated VIP customer success program with personalized service'
      })
    }
    
    // Churn risk mitigation
    const highChurnRisk = metrics.filter(m => m.churnProbability > 0.7).length
    if (highChurnRisk > 0) {
      recommendations.push({
        type: 'churn_prevention',
        priority: 'urgent',
        insight: `${highChurnRisk} customers at high risk of churning`,
        recommendation: 'Launch immediate win-back campaign with personalized offers'
      })
    }
    
    return recommendations
  }
}

export default PredictiveAnalyticsEngine
