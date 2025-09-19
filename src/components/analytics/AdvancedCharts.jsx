// Enterprise-Grade Advanced Visualization Components
// Professional charts using Nivo and D3 for business intelligence

import React, { useMemo, useState } from 'react'
import { ResponsiveLine } from '@nivo/line'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsivePie } from '@nivo/pie'
import { ResponsiveHeatMap } from '@nivo/heatmap'
import { ResponsiveCalendar } from '@nivo/calendar'
import * as d3 from 'd3'

// Enterprise Chart Theme
const enterpriseTheme = {
  background: '#ffffff',
  text: {
    fontSize: 12,
    fill: '#374151',
    outlineWidth: 0,
    outlineColor: 'transparent'
  },
  axis: {
    domain: {
      line: {
        stroke: '#e5e7eb',
        strokeWidth: 1
      }
    },
    legend: {
      text: {
        fontSize: 13,
        fill: '#374151',
        fontWeight: 600
      }
    },
    ticks: {
      line: {
        stroke: '#e5e7eb',
        strokeWidth: 1
      },
      text: {
        fontSize: 11,
        fill: '#6b7280'
      }
    }
  },
  grid: {
    line: {
      stroke: '#f3f4f6',
      strokeWidth: 1
    }
  },
  legends: {
    title: {
      text: {
        fontSize: 13,
        fill: '#374151',
        fontWeight: 600
      }
    },
    text: {
      fontSize: 12,
      fill: '#6b7280'
    }
  },
  annotations: {
    text: {
      fontSize: 12,
      fill: '#374151',
      outlineWidth: 2,
      outlineColor: '#ffffff',
      outlineOpacity: 1
    },
    link: {
      stroke: '#000000',
      strokeWidth: 1,
      outlineWidth: 2,
      outlineColor: '#ffffff',
      outlineOpacity: 1
    },
    outline: {
      stroke: '#000000',
      strokeWidth: 2,
      outlineWidth: 2,
      outlineColor: '#ffffff',
      outlineOpacity: 1
    },
    symbol: {
      fill: '#000000',
      outlineWidth: 2,
      outlineColor: '#ffffff',
      outlineOpacity: 1
    }
  },
  tooltip: {
    container: {
      background: '#ffffff',
      color: '#374151',
      fontSize: 12,
      borderRadius: '6px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      border: '1px solid #e5e7eb'
    }
  }
}

// Color schemes for different chart types
const colorSchemes = {
  revenue: ['#059669', '#10b981', '#34d399', '#6ee7b7', '#9decf9'],
  orders: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'],
  users: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'],
  performance: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7'],
  status: ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'],
  geographic: d3.schemeBlues[9]
}

/**
 * Advanced Revenue Forecasting Chart
 */
export const RevenueForecastChart = ({ data, height = 400, onPointClick }) => {
  const chartData = useMemo(() => {
    if (!data) return []
    
    return [
      {
        id: 'Historical Revenue',
        data: data.historical?.map(point => ({
          x: point.date,
          y: point.value
        })) || []
      },
      {
        id: 'Forecasted Revenue',
        data: data.forecast?.map(point => ({
          x: point.date,
          y: point.value,
          upperBound: point.upperBound,
          lowerBound: point.lowerBound
        })) || []
      },
      {
        id: 'Confidence Interval',
        data: data.forecast?.map(point => ({
          x: point.date,
          y: point.upperBound
        })) || []
      }
    ]
  }, [data])

  return (
    <div style={{ height }}>
      <ResponsiveLine
        data={chartData}
        theme={enterpriseTheme}
        margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
        xScale={{ type: 'time', format: '%Y-%m-%d', useUTC: false }}
        xFormat="time:%Y-%m-%d"
        yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false }}
        yFormat=" >-.2f"
        curve="catmullRom"
        axisTop={null}
        axisRight={null}
        axisBottom={{
          format: '%b %d',
          tickValues: 'every 7 days',
          legend: 'Date',
          legendOffset: 36,
          legendPosition: 'middle'
        }}
        axisLeft={{
          legend: 'Revenue ($)',
          legendOffset: -40,
          legendPosition: 'middle',
          format: value => `$${(value / 1000).toFixed(0)}K`
        }}
        pointSize={6}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabelYOffset={-12}
        enableSlices="x"
        useMesh={true}
        colors={colorSchemes.revenue}
        legends={[
          {
            anchor: 'bottom-right',
            direction: 'column',
            justify: false,
            translateX: 100,
            translateY: 0,
            itemsSpacing: 0,
            itemDirection: 'left-to-right',
            itemWidth: 80,
            itemHeight: 20,
            itemOpacity: 0.75,
            symbolSize: 12,
            symbolShape: 'circle',
            symbolBorderColor: 'rgba(0, 0, 0, .5)',
            effects: [
              {
                on: 'hover',
                style: {
                  itemBackground: 'rgba(0, 0, 0, .03)',
                  itemOpacity: 1
                }
              }
            ]
          }
        ]}
        onClick={(point) => onPointClick?.(point)}
      />
    </div>
  )
}

/**
 * Conversion Funnel Visualization
 */
export const ConversionFunnelChart = ({ data, height = 500, onStepClick }) => {
  const funnelData = useMemo(() => {
    if (!data) return []
    
    return data.map((step, index) => ({
      id: step.name,
      label: step.name,
      value: step.users,
      conversionRate: step.conversionRate,
      dropOff: step.dropOff,
      color: colorSchemes.orders[index % colorSchemes.orders.length]
    }))
  }, [data])

  return (
    <div style={{ height }} className="relative">
      <svg width="100%" height={height} className="funnel-chart">
        {funnelData.map((step, index) => {
          const maxWidth = 300
          const stepHeight = 60
          const y = index * (stepHeight + 10) + 50
          const width = maxWidth * (step.value / (funnelData[0]?.value || 1))
          const x = (400 - width) / 2 // Center the funnel
          
          return (
            <g key={step.id}>
              {/* Funnel Step */}
              <rect
                x={x}
                y={y}
                width={width}
                height={stepHeight}
                fill={step.color}
                rx={4}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => onStepClick?.(step)}
              />
              
              {/* Step Label */}
              <text
                x={200}
                y={y + stepHeight / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="14"
                fontWeight="600"
              >
                {step.label}
              </text>
              
              {/* User Count */}
              <text
                x={200}
                y={y + stepHeight / 2 + 16}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="12"
              >
                {step.value.toLocaleString()} users
              </text>
              
              {/* Conversion Rate (if not first step) */}
              {index > 0 && (
                <text
                  x={x + width + 20}
                  y={y + stepHeight / 2}
                  dominantBaseline="middle"
                  fill="#374151"
                  fontSize="12"
                  fontWeight="500"
                >
                  {step.conversionRate?.toFixed(1)}%
                </text>
              )}
              
              {/* Drop-off indicator */}
              {index < funnelData.length - 1 && step.dropOff > 0 && (
                <text
                  x={x - 60}
                  y={y + stepHeight + 25}
                  textAnchor="middle"
                  fill="#ef4444"
                  fontSize="11"
                >
                  -{step.dropOff} users
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/**
 * Geographic Heatmap for Customer Distribution
 */
export const GeographicHeatMap = ({ data, height = 400 }) => {
  const heatmapData = useMemo(() => {
    if (!data) return []
    
    // Transform geographic data for heatmap
    return data.map(item => ({
      id: item.state,
      data: item.cities?.map(city => ({
        x: city.name,
        y: item.state,
        v: city.customers
      })) || []
    }))
  }, [data])

  return (
    <div style={{ height }}>
      <ResponsiveHeatMap
        data={heatmapData}
        theme={enterpriseTheme}
        margin={{ top: 60, right: 90, bottom: 60, left: 90 }}
        valueFormat=">-.0f"
        axisTop={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: '',
          legendPosition: 'middle',
          legendOffset: -40
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'States',
          legendPosition: 'middle',
          legendOffset: -40
        }}
        colors={{
          type: 'quantize',
          scheme: 'blues',
          minValue: 0,
          maxValue: 100
        }}
        emptyColor="#f1f5f9"
        hoverTarget="cell"
        cellHoverOthersOpacity={0.25}
      />
    </div>
  )
}

/**
 * Advanced KPI Widget with Sparklines
 */
export const AdvancedKPIWidget = ({ 
  title, 
  value, 
  change, 
  trend, 
  target, 
  sparklineData, 
  format = 'number',
  onClick 
}) => {
  const formattedValue = useMemo(() => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0
        }).format(value)
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'number':
      default:
        return value.toLocaleString()
    }
  }, [value, format])

  const sparklinePoints = useMemo(() => {
    if (!sparklineData || sparklineData.length === 0) return ''
    
    const width = 100
    const height = 30
    const maxValue = Math.max(...sparklineData)
    const minValue = Math.min(...sparklineData)
    const range = maxValue - minValue || 1
    
    return sparklineData
      .map((point, index) => {
        const x = (index / (sparklineData.length - 1)) * width
        const y = height - ((point - minValue) / range) * height
        return `${x},${y}`
      })
      .join(' ')
  }, [sparklineData])

  const trendColor = useMemo(() => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-500'
  }, [change])

  const progressToTarget = useMemo(() => {
    if (!target || target === 0) return null
    return Math.min((value / target) * 100, 100)
  }, [value, target])

  return (
    <div 
      className="bg-white rounded-lg shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow border border-gray-100"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
        {trend && (
          <div className={`flex items-center ${trendColor}`}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {trend === 'up' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              ) : trend === 'down' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              )}
            </svg>
            <span className="text-xs font-medium">
              {change > 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Main Value */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-gray-900 mb-1">
          {formattedValue}
        </div>
        {target && (
          <div className="text-sm text-gray-500">
            Target: {format === 'currency' ? 
              new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(target) :
              target.toLocaleString()
            }
          </div>
        )}
      </div>

      {/* Progress Bar (if target exists) */}
      {progressToTarget !== null && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Progress to Target</span>
            <span>{progressToTarget.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                progressToTarget >= 100 ? 'bg-green-500' :
                progressToTarget >= 75 ? 'bg-blue-500' :
                progressToTarget >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${progressToTarget}%` }}
            />
          </div>
        </div>
      )}

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-4">
          <svg width="100" height="30" className="w-full">
            <polyline
              fill="none"
              stroke={change >= 0 ? '#10b981' : '#ef4444'}
              strokeWidth="2"
              points={sparklinePoints}
              className="opacity-75"
            />
            {/* Fill area under sparkline */}
            <polygon
              fill={change >= 0 ? '#10b981' : '#ef4444'}
              fillOpacity="0.1"
              points={`0,30 ${sparklinePoints} 100,30`}
            />
          </svg>
        </div>
      )}
    </div>
  )
}

/**
 * Customer Lifetime Value Distribution Chart
 */
export const CLVDistributionChart = ({ data, height = 300 }) => {
  const chartData = useMemo(() => {
    if (!data) return []
    
    return data.map(segment => ({
      id: segment.segment,
      label: segment.segment,
      value: segment.count,
      clv: segment.averageClv
    }))
  }, [data])

  return (
    <div style={{ height }}>
      <ResponsivePie
        data={chartData}
        theme={enterpriseTheme}
        margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
        innerRadius={0.5}
        padAngle={0.7}
        cornerRadius={3}
        activeOuterRadiusOffset={8}
        colors={colorSchemes.users}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="#374151"
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
        tooltip={({ datum }) => (
          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
            <div className="font-medium text-gray-900">{datum.label}</div>
            <div className="text-sm text-gray-600">{datum.value} customers</div>
            <div className="text-sm text-gray-600">
              Avg CLV: ${datum.data.clv?.toLocaleString() || 0}
            </div>
          </div>
        )}
      />
    </div>
  )
}

/**
 * Revenue Heatmap Calendar
 */
export const RevenueCalendarHeatmap = ({ data, height = 200 }) => {
  const calendarData = useMemo(() => {
    if (!data) return []
    
    return data.map(day => ({
      day: day.date,
      value: day.revenue
    }))
  }, [data])

  return (
    <div style={{ height }}>
      <ResponsiveCalendar
        data={calendarData}
        theme={enterpriseTheme}
        from={moment().subtract(1, 'year').format('YYYY-MM-DD')}
        to={moment().format('YYYY-MM-DD')}
        emptyColor="#f1f5f9"
        colors={colorSchemes.geographic}
        margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
        yearSpacing={40}
        monthBorderColor="#ffffff"
        dayBorderWidth={2}
        dayBorderColor="#ffffff"
        tooltip={({ day, value, color }) => (
          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
            <div className="font-medium text-gray-900">{day}</div>
            <div className="text-sm text-gray-600">
              Revenue: ${value?.toLocaleString() || 0}
            </div>
          </div>
        )}
      />
    </div>
  )
}

/**
 * Model Performance Comparison Chart
 */
export const ModelPerformanceChart = ({ data, height = 400, metric = 'revenue' }) => {
  const chartData = useMemo(() => {
    if (!data) return []
    
    return data.map(model => ({
      model: model.name,
      revenue: model.totalRevenue || 0,
      orders: model.orderCount || 0,
      aov: model.averageOrder || 0,
      margin: model.margin || 0
    }))
  }, [data])

  return (
    <div style={{ height }}>
      <ResponsiveBar
        data={chartData}
        theme={enterpriseTheme}
        keys={[metric]}
        indexBy="model"
        margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
        padding={0.3}
        valueScale={{ type: 'linear' }}
        indexScale={{ type: 'band', round: true }}
        colors={colorSchemes.performance}
        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: 'Models',
          legendPosition: 'middle',
          legendOffset: 40
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: metric === 'revenue' ? 'Revenue ($)' : 'Orders',
          legendPosition: 'middle',
          legendOffset: -40,
          format: metric === 'revenue' ? 
            value => `$${(value / 1000).toFixed(0)}K` :
            value => value.toLocaleString()
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        animate={true}
        motionStiffness={90}
        motionDamping={15}
      />
    </div>
  )
}

/**
 * Real-time Metrics Dashboard
 */
export const RealTimeMetricsDashboard = ({ metrics, onMetricClick }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h')
  
  const timeframes = [
    { value: '1h', label: '1 Hour' },
    { value: '6h', label: '6 Hours' },
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' }
  ]

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Real-Time Metrics</h2>
        <div className="flex space-x-2">
          {timeframes.map(tf => (
            <button
              key={tf.value}
              onClick={() => setSelectedTimeframe(tf.value)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedTimeframe === tf.value
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics?.map((metric, index) => (
          <AdvancedKPIWidget
            key={metric.id}
            title={metric.title}
            value={metric.value}
            change={metric.change}
            trend={metric.trend}
            target={metric.target}
            sparklineData={metric.sparklineData}
            format={metric.format}
            onClick={() => onMetricClick?.(metric)}
          />
        ))}
      </div>

      {/* Live Update Indicator */}
      <div className="mt-4 flex items-center justify-center text-xs text-gray-500">
        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
        Live data - Updates every 30 seconds
      </div>
    </div>
  )
}

export default {
  RevenueForecastChart,
  ConversionFunnelChart,
  GeographicHeatMap,
  AdvancedKPIWidget,
  RealTimeMetricsDashboard
}
