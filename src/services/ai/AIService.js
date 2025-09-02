class AIService {
  constructor() {
    this.baseURL = '/api/ai' // Use our backend proxy
    this.apiKey = import.meta.env.VITE_AI_API_KEY
    this.model = import.meta.env.VITE_AI_MODEL || 'claude-3-5-sonnet-20241022'
    this.maxTokens = 2000
  }

  // Initialize AI service (no authentication required for this service)
  async initialize() {
    try {
      // Check if API key is configured
      if (!this.apiKey) {
        throw new Error('AI API key not configured')
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
      const response = await fetch(`${this.baseURL}/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic,
          template,
          sections,
          type: 'full'
        })
      })

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('AI content generation failed:', error)
      throw error
    }
  }

  // Generate specific section content
  async generateSectionContent(topic, template, sectionKey, customPrompt = '') {
    try {
      const response = await fetch(`${this.baseURL}/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic,
          template,
          sections: [sectionKey],
          type: 'section'
        })
      })

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Section content generation failed:', error)
      throw error
    }
  }

  // Build prompt for specific section (kept for backward compatibility)
  buildSectionPrompt(topic, template, sectionKey, customPrompt = '') {
    const sectionInfo = this.getSectionInfo(sectionKey)
    const templateInfo = this.getTemplateInfo(template)
    
    return `
Write a ${sectionInfo.label} section for a blog post about: "${topic}"

Template Style: ${templateInfo.name}
Section Purpose: ${sectionInfo.description}

${customPrompt ? `Custom Instructions: ${customPrompt}` : ''}

Requirements:
- Write in a conversational, expert tone
- Include specific examples and actionable tips
- Optimize for SEO with relevant keywords
- Include local Texas references when relevant
- Make it engaging for tiny home enthusiasts
- Word count: 150-300 words for this section
- Use proper HTML formatting (paragraphs, lists, etc.)

Please provide just the section content in HTML format, no additional formatting needed.
    `.trim()
  }

  // Get section information
  getSectionInfo(sectionKey) {
    const sections = {
      'introduction': {
        label: 'Introduction',
        description: 'Hook readers with an engaging opening that sets the stage for the topic'
      },
      'keyBenefits': {
        label: 'Key Benefits',
        description: 'List and explain the main advantages and positive aspects'
      },
      'personalStory': {
        label: 'Personal Story',
        description: 'Share a relevant personal experience or customer story'
      },
      'proTips': {
        label: 'Pro Tips',
        description: 'Provide expert advice and actionable tips'
      },
      'comparison': {
        label: 'Comparison',
        description: 'Compare different options, approaches, or perspectives'
      },
      'conclusion': {
        label: 'Conclusion',
        description: 'Wrap up with a compelling call-to-action and summary'
      }
    }
    return sections[sectionKey] || sections['introduction']
  }

  // Build intelligent prompt for blog generation (kept for backward compatibility)
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

  // Get system prompt for AI behavior (kept for backward compatibility)
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

  // Parse Claude response into structured content (kept for backward compatibility)
  parseClaudeResponse(data, topic, template) {
    try {
      const content = data.content?.[0]?.text || ''
      return this.parseContent(content, topic, template)
    } catch (error) {
      console.error('Failed to parse Claude response:', error)
      throw new Error('Failed to parse Claude-generated content')
    }
  }

  // Parse OpenAI response into structured content (kept for backward compatibility)
  parseOpenAIResponse(data, topic, template) {
    try {
      const content = data.choices?.[0]?.message?.content || ''
      return this.parseContent(content, topic, template)
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error)
      throw new Error('Failed to parse OpenAI-generated content')
    }
  }

  // Parse section response into structured content (kept for backward compatibility)
  parseSectionResponse(data, sectionKey) {
    try {
      const content = data.content?.[0]?.text || ''
      return {
        sectionKey: sectionKey,
        content: content,
        aiGenerated: true,
        generatedAt: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to parse section response:', error)
      throw new Error('Failed to parse section-generated content')
    }
  }

  // Parse content from either AI provider (kept for backward compatibility)
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

export default AIService
