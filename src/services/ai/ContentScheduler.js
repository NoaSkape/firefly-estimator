import AIService from './AIService'

class ContentScheduler {
  constructor() {
    this.schedule = {
      frequency: 'weekly', // weekly, bi-weekly, monthly
      dayOfWeek: 1, // Monday = 1, Sunday = 0
      time: '09:00', // 24-hour format
      timezone: 'America/Chicago', // Texas timezone
      autoPublish: false, // Set to true for automatic publishing
      requireApproval: true // Require admin approval before publishing
    }
    
    this.topics = [
      'Park Model Homes vs Traditional Housing: A Complete Comparison',
      'Tiny Home Living in Texas: Regulations and Benefits',
      'Customizing Your Tiny Home Interior: Design Tips and Ideas',
      'Tiny Home Financing Options: What You Need to Know',
      'Tiny Home Community Living: Building Connections',
      'Tiny Home Maintenance Tips: Keeping Your Home in Top Shape',
      'Tiny Home Energy Efficiency: Sustainable Living Solutions',
      'Tiny Home Zoning and Regulations: Navigating the Legal Landscape',
      'Tiny Home Design Trends: What\'s Hot in 2024',
      'Tiny Home Investment Potential: Building Wealth Through Smart Choices',
      'Tiny Home vs RV Living: Which is Right for You?',
      'Tiny Home Storage Solutions: Maximizing Your Space',
      'Tiny Home Insurance: Protecting Your Investment',
      'Tiny Home Resale Value: Factors That Matter',
      'Tiny Home Community Events: Building Your Network',
      'Tiny Home Pet-Friendly Features: Accommodating Your Furry Friends',
      'Tiny Home Winter Preparation: Staying Cozy in Cold Weather',
      'Tiny Home Summer Cooling: Beat the Texas Heat',
      'Tiny Home Security: Keeping Your Home Safe',
      'Tiny Home Internet and Technology: Staying Connected'
    ]
    
    this.templates = ['story', 'educational', 'inspiration']
    this.currentTopicIndex = 0
    this.currentTemplateIndex = 0
    this.lastGenerated = null
    this.isRunning = false
    this.timer = null
  }

  // Initialize the scheduler
  async initialize() {
    try {
      const isInitialized = await AIService.initialize()
      if (!isInitialized) {
        throw new Error('AI Service failed to initialize')
      }
      
      this.loadSchedule()
      this.startScheduler()
      return true
    } catch (error) {
      console.error('Content Scheduler initialization failed:', error)
      return false
    }
  }

  // Load schedule from localStorage or API
  loadSchedule() {
    try {
      const savedSchedule = localStorage.getItem('aiContentSchedule')
      if (savedSchedule) {
        this.schedule = { ...this.schedule, ...JSON.parse(savedSchedule) }
      }
      
      const savedIndexes = localStorage.getItem('aiContentIndexes')
      if (savedIndexes) {
        const indexes = JSON.parse(savedIndexes)
        this.currentTopicIndex = indexes.topicIndex || 0
        this.currentTemplateIndex = indexes.templateIndex || 0
      }
    } catch (error) {
      console.error('Failed to load schedule:', error)
    }
  }

  // Save schedule to localStorage
  saveSchedule() {
    try {
      localStorage.setItem('aiContentSchedule', JSON.stringify(this.schedule))
      localStorage.setItem('aiContentIndexes', JSON.stringify({
        topicIndex: this.currentTopicIndex,
        templateIndex: this.currentTemplateIndex
      }))
    } catch (error) {
      console.error('Failed to save schedule:', error)
    }
  }

  // Start the scheduler
  startScheduler() {
    if (this.isRunning) return
    
    this.isRunning = true
    this.scheduleNextGeneration()
    console.log('AI Content Scheduler started')
  }

  // Stop the scheduler
  stopScheduler() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.isRunning = false
    console.log('AI Content Scheduler stopped')
  }

  // Schedule next content generation
  scheduleNextGeneration() {
    if (!this.isRunning) return
    
    const now = new Date()
    const nextRun = this.getNextScheduledTime()
    const delay = nextRun.getTime() - now.getTime()
    
    if (delay > 0) {
      this.timer = setTimeout(() => {
        this.generateScheduledContent()
      }, delay)
      
      console.log(`Next AI content generation scheduled for: ${nextRun.toLocaleString()}`)
    } else {
      // If we're past the scheduled time, run immediately
      this.generateScheduledContent()
    }
  }

  // Get next scheduled time
  getNextScheduledTime() {
    const now = new Date()
    const [hours, minutes] = this.schedule.time.split(':')
    
    let nextRun = new Date(now)
    nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    
    // If today's time has passed, move to next scheduled day
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1)
    }
    
    // Adjust to next scheduled day of week
    while (nextRun.getDay() !== this.schedule.dayOfWeek) {
      nextRun.setDate(nextRun.getDate() + 1)
    }
    
    return nextRun
  }

  // Generate scheduled content
  async generateScheduledContent() {
    try {
      console.log('Starting scheduled AI content generation...')
      
      const topic = this.getNextTopic()
      const template = this.getNextTemplate()
      
      // Generate content using AI
      const generatedContent = await AIService.generateBlogPost(topic, template)
      
      // Validate content
      const validation = AIService.validateContent(generatedContent)
      if (!validation.isValid) {
        throw new Error(`Content validation failed: ${validation.errors.join(', ')}`)
      }
      
      // Save generated content
      await this.saveGeneratedContent(generatedContent)
      
      // Update indexes for next generation
      this.advanceIndexes()
      
      // Schedule next generation
      this.scheduleNextGeneration()
      
      console.log('Scheduled AI content generation completed successfully')
      
      // Trigger notification or callback
      this.onContentGenerated(generatedContent)
      
    } catch (error) {
      console.error('Scheduled content generation failed:', error)
      
      // Retry in 1 hour if failed
      setTimeout(() => {
        this.generateScheduledContent()
      }, 60 * 60 * 1000)
    }
  }

  // Get next topic from rotation
  getNextTopic() {
    const topic = this.topics[this.currentTopicIndex]
    return topic
  }

  // Get next template from rotation
  getNextTemplate() {
    const template = this.templates[this.currentTemplateIndex]
    return template
  }

  // Advance indexes for next generation
  advanceIndexes() {
    this.currentTopicIndex = (this.currentTopicIndex + 1) % this.topics.length
    this.currentTemplateIndex = (this.currentTemplateIndex + 1) % this.templates.length
    this.saveSchedule()
  }

  // Save generated content to database
  async saveGeneratedContent(content) {
    try {
      const token = await this.getAuthToken()
      
      const response = await fetch('/api/admin/content/blog', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...content,
          status: this.schedule.autoPublish ? 'published' : 'draft',
          aiGenerated: true,
          scheduledFor: new Date().toISOString()
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to save generated content: ${response.status}`)
      }
      
      const savedContent = await response.json()
      this.lastGenerated = savedContent
      
      return savedContent
    } catch (error) {
      console.error('Failed to save generated content:', error)
      throw error
    }
  }

  // Get authentication token
  async getAuthToken() {
    // This would be implemented based on your auth system
    // For now, we'll assume it's available globally
    return window.authToken || localStorage.getItem('authToken')
  }

  // Manual content generation
  async generateCustomContent(topic, template, sections = []) {
    try {
      console.log('Starting custom AI content generation...')
      
      const generatedContent = await AIService.generateBlogPost(topic, template, sections)
      
      // Validate content
      const validation = AIService.validateContent(generatedContent)
      if (!validation.isValid) {
        throw new Error(`Content validation failed: ${validation.errors.join(', ')}`)
      }
      
      return generatedContent
    } catch (error) {
      console.error('Custom content generation failed:', error)
      throw error
    }
  }

  // Update schedule settings
  updateSchedule(newSchedule) {
    this.schedule = { ...this.schedule, ...newSchedule }
    this.saveSchedule()
    
    // Restart scheduler with new settings
    if (this.isRunning) {
      this.stopScheduler()
      this.startScheduler()
    }
  }

  // Add new topics
  addTopics(newTopics) {
    this.topics = [...this.topics, ...newTopics]
    this.saveSchedule()
  }

  // Remove topics
  removeTopic(topicIndex) {
    this.topics.splice(topicIndex, 1)
    if (this.currentTopicIndex >= this.topics.length) {
      this.currentTopicIndex = 0
    }
    this.saveSchedule()
  }

  // Get current schedule status
  getStatus() {
    const nextRun = this.getNextScheduledTime()
    return {
      isRunning: this.isRunning,
      nextScheduledRun: nextRun,
      lastGenerated: this.lastGenerated,
      currentTopicIndex: this.currentTopicIndex,
      currentTemplateIndex: this.currentTemplateIndex,
      totalTopics: this.topics.length,
      schedule: this.schedule
    }
  }

  // Callback for when content is generated
  onContentGenerated(content) {
    // This can be overridden or used to trigger notifications
    console.log('New AI-generated content:', content.title)
    
    // Example: Send notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('AI Content Generated', {
        body: `New blog post: ${content.title}`,
        icon: '/logo/firefly-logo.png'
      })
    }
  }

  // Emergency stop
  emergencyStop() {
    this.stopScheduler()
    this.isRunning = false
    console.log('AI Content Scheduler emergency stopped')
  }
}

export default new ContentScheduler()
