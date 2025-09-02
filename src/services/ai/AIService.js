import { getToken } from '@clerk/clerk-react'

class AIService {
  constructor() {
    this.baseURL = import.meta.env.VITE_AI_API_URL || 'https://api.anthropic.com/v1'
    this.apiKey = import.meta.env.VITE_AI_API_KEY
    this.model = import.meta.env.VITE_AI_MODEL || 'claude-3-5-sonnet-20241022'
    this.maxTokens = 2000
  }

  // Initialize AI service with authentication
  async initialize() {
    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required')
      }
      return true
    } catch (error) {
      console.error('AI Service initialization failed:', error)
      return false
    }
  }

  // Generate blog post content using AI
  async generateBlogPost(topic, template, sections = []) {
    try {
      const prompt = this.buildBlogPrompt(topic, template, sections)
      
      // Check if using Claude or OpenAI
      const isClaude = this.baseURL.includes('anthropic.com')
      
      if (isClaude) {
        // Claude API format
        const response = await fetch(`${this.baseURL}/messages`, {
          method: 'POST',
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.model,
            max_tokens: this.maxTokens,
            messages: [
              {
                role: 'user',
                content: `${this.getSystemPrompt()}\n\n${prompt}`
              }
            ]
          })
        })

        if (!response.ok) {
          throw new Error(`Claude API error: ${response.status}`)
        }

        const data = await response.json()
        return this.parseClaudeResponse(data, topic, template)
      } else {
        // OpenAI API format
        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              {
                role: 'system',
                content: this.getSystemPrompt()
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: this.maxTokens,
            temperature: 0.7
          })
        })

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`)
        }

        const data = await response.json()
        return this.parseOpenAIResponse(data, topic, template)
      }
    } catch (error) {
      console.error('AI content generation failed:', error)
      throw error
    }
  }

  // Build intelligent prompt for blog generation
  buildBlogPrompt(topic, template, sections = []) {
    const templateInfo = this.getTemplateInfo(template)
    
    return `
Create a high-quality blog post about: "${topic}"

Template: ${templateInfo.name}
Style: ${templateInfo.description}

Required sections: ${sections.join(', ')}

Requirements:
- Write in a conversational, expert tone
- Include specific examples and actionable tips
- Optimize for SEO with relevant keywords
- Include local Texas references when relevant
- Make it engaging for tiny home enthusiasts
- Word count: 800-1200 words
- Include a compelling call-to-action

Please provide the content in this format:
TITLE: [Engaging title]
META_DESCRIPTION: [SEO-optimized description]
CONTENT: [Full blog post content with HTML formatting]
TAGS: [Relevant tags separated by commas]
CATEGORY: [Appropriate category]
SLUG: [URL-friendly slug]
    `.trim()
  }

  // Get system prompt for AI behavior
  getSystemPrompt() {
    return `You are an expert content writer specializing in tiny homes, park model homes, and sustainable living. 

Your expertise includes:
- Tiny home design and construction
- Park model home regulations and benefits
- Sustainable living practices
- Texas-specific housing information
- Real estate and investment insights

Write content that is:
- Informative and educational
- Engaging and conversational
- SEO-optimized
- Actionable with practical tips
- Authentic and trustworthy

Always include specific examples, real scenarios, and actionable advice. Make content that helps readers make informed decisions about tiny home living.`
  }

  // Get template information
  getTemplateInfo(template) {
    const templates = {
      'story': {
        name: 'Story-Driven Template',
        description: 'Narrative-focused with personal experiences and customer stories'
      },
      'educational': {
        name: 'Educational Template',
        description: 'Informative and instructional content with clear explanations'
      },
      'inspiration': {
        name: 'Inspirational Template',
        description: 'Motivational content that inspires action and dreams'
      }
    }
    return templates[template] || templates['story']
  }

  // Parse Claude response into structured content
  parseClaudeResponse(data, topic, template) {
    try {
      const content = data.content?.[0]?.text || ''
      return this.parseContent(content, topic, template)
    } catch (error) {
      console.error('Failed to parse Claude response:', error)
      throw new Error('Failed to parse Claude-generated content')
    }
  }

  // Parse OpenAI response into structured content
  parseOpenAIResponse(data, topic, template) {
    try {
      const content = data.choices?.[0]?.message?.content || ''
      return this.parseContent(content, topic, template)
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error)
      throw new Error('Failed to parse OpenAI-generated content')
    }
  }

  // Parse content from either AI provider
  parseContent(content, topic, template) {
    try {
      // Extract structured content from AI response
      const titleMatch = content.match(/TITLE:\s*(.+)/i)
      const metaMatch = content.match(/META_DESCRIPTION:\s*(.+)/i)
      const contentMatch = content.match(/CONTENT:\s*([\s\S]*?)(?=TAGS:|CATEGORY:|SLUG:|$)/i)
      const tagsMatch = content.match(/TAGS:\s*(.+)/i)
      const categoryMatch = content.match(/CATEGORY:\s*(.+)/i)
      const slugMatch = content.match(/SLUG:\s*(.+)/i)

      return {
        title: titleMatch?.[1]?.trim() || topic,
        metaDescription: metaMatch?.[1]?.trim() || `Discover everything about ${topic.toLowerCase()}`,
        content: contentMatch?.[1]?.trim() || content,
        tags: tagsMatch?.[1]?.split(',').map(tag => tag.trim()) || ['tiny homes', 'park model homes'],
        category: categoryMatch?.[1]?.trim() || 'tiny home living',
        slug: slugMatch?.[1]?.trim() || this.generateSlug(topic),
        template: template,
        status: 'draft',
        aiGenerated: true,
        generatedAt: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to parse AI content:', error)
      throw new Error('Failed to parse AI-generated content')
    }
  }

  // Generate URL-friendly slug
  generateSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-')
  }

  // Validate AI-generated content
  validateContent(content) {
    const errors = []
    
    if (!content.title || content.title.length < 10) {
      errors.push('Title is too short or missing')
    }
    
    if (!content.content || content.content.length < 500) {
      errors.push('Content is too short or missing')
    }
    
    if (!content.metaDescription || content.metaDescription.length < 50) {
      errors.push('Meta description is too short or missing')
    }
    
    if (!content.tags || content.tags.length === 0) {
      errors.push('Tags are missing')
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    }
  }
}

export default new AIService()
