import { useState, useRef, useEffect } from 'react'
import { useUser, useAuth } from '@clerk/clerk-react'
import { canEditModelsClient } from '../lib/canEditModels'
import { 
  DocumentTextIcon,
  PhotoIcon,
  PaintBrushIcon,
  BookOpenIcon,
  EyeIcon,
  CalendarIcon,
  TagIcon,
  ArrowLeftIcon,
  CheckIcon,
  BoltIcon
} from '@heroicons/react/24/outline'
import TemplateRenderer from './blog-templates/TemplateRenderer'
import DragDropSectionManager from './blog-templates/DragDropSectionManager'
import { TEMPLATE_REGISTRY, getDefaultSections } from './blog-templates/TemplateRegistry'
import InteractivePreview from './blog-templates/InteractivePreview'
import EngagementTracker from './blog-templates/EngagementTracker'
import AITopicGenerator from './blog-templates/AITopicGenerator'
import EnhancedAIGenerator from './blog-templates/EnhancedAIGenerator'
import DynamicTemplateSections from './blog-templates/DynamicTemplateSections'
import ConversionCTAManager from './blog-templates/ConversionCTAManager'
import SEOOptimizer from './blog-templates/SEOOptimizer'

export default function AdminBlogEditor({ post = null, onClose, onSaved }) {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('content')
  const [templateSections, setTemplateSections] = useState({})
  const [selectedTopic, setSelectedTopic] = useState(null)
  const fileInputRef = useRef(null)
  const debug = (import.meta.env?.VITE_DEBUG_ADMIN === 'true')
  const isAdmin = canEditModelsClient(user)

  // Blog post state
  const [postData, setPostData] = useState(() => {
    // Initialize with defaults
    const defaults = {
      title: '',
      excerpt: '',
      content: '',
      category: '',
      template: 'story', // story, educational, inspiration
      featuredImage: null,
      slug: '',
      metaDescription: '',
      tags: [],
      status: 'draft', // draft, published
      publishDate: new Date().toISOString().split('T')[0],
      ctas: []
    }
    
    // If editing existing post, merge with defaults and format dates properly
    if (post) {
      return {
        ...defaults,
        ...post,
        // Ensure publishDate is in correct format for input field
        publishDate: post.publishDate 
          ? new Date(post.publishDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      }
    }
    
    return defaults
  })

  // Fetch post data for editing if we have a post ID but no full post data
  useEffect(() => {
    const fetchPostForEditing = async () => {
      if (post?._id && !post.title) {
        try {
          const token = await getToken()
          if (!token) return
          
          const response = await fetch(`/api/admin/blog/${post._id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          
          if (response.ok) {
            const fetchedPost = await response.json()
            setPostData(prev => ({
              ...prev,
              ...fetchedPost,
              // Ensure publishDate is in correct format for input field
              publishDate: fetchedPost.publishDate 
                ? new Date(fetchedPost.publishDate).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0]
            }))
          }
        } catch (error) {
          console.error('Failed to fetch post for editing:', error)
        }
      }
    }
    
    fetchPostForEditing()
  }, [post?._id, getToken])
  
  // Template sections state
  const [activeSections, setActiveSections] = useState(post?.activeSections || getDefaultSections('story'))

  // AI test state
  const [aiTestMessage, setAiTestMessage] = useState('Hello AI')
  const [aiTestLoading, setAiTestLoading] = useState(false)
  const [aiTestResult, setAiTestResult] = useState('')
  const [aiTestError, setAiTestError] = useState('')

  const categories = [
    'Buying Guides',
    'Design & Inspiration', 
    'Financing & Investment',
    'Location & Zoning',
    'Lifestyle & Stories',
    'Sustainability'
  ]

  const templates = Object.values(TEMPLATE_REGISTRY)

  const handleSave = async (forcePublish = false) => {
    if (!postData.title || !postData.content) {
      alert('Please fill in the title and content')
      return
    }

    try {
      setSaving(true)
      const token = await getToken()
      if (!token) {
        alert('Authentication error: No Clerk token found. Please sign in.')
        return
      }

      // Determine final status - if forcePublish is true, set to published
      const finalStatus = forcePublish ? 'published' : postData.status

      // Debug logging - ALWAYS log saves
      console.log('[BLOG_SAVE] Starting blog post save', {
        isEdit: !!post,
        postId: post?._id || post?.id,
        title: postData.title,
        originalStatus: postData.status,
        finalStatus: finalStatus,
        forcePublish: forcePublish,
        hasToken: !!token,
        tokenLength: token?.length,
        url: post ? `/api/admin/blog/${post._id || post.id}` : '/api/blog',
        method: post ? 'PUT' : 'POST',
        dataKeys: Object.keys(postData)
      })

      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      const url = post ? `/api/admin/blog/${post._id || post.id}` : '/api/blog'
      const method = post ? 'PUT' : 'POST'

      // Ensure publishDate is properly formatted for the API
      const dataToSend = {
        ...postData,
        status: finalStatus,
        publishDate: postData.publishDate ? new Date(postData.publishDate).toISOString() : new Date().toISOString()
      }

      console.log('[BLOG_SAVE] Making API call', { url, method, bodySize: JSON.stringify(dataToSend).length })
      
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(dataToSend)
      })

      console.log('[BLOG_SAVE] API response received', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: errorText || 'Unknown error' }
        }
        
        console.error('[BLOG_SAVE] API error response:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          errorText
        })
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to save blog post`)
      }

      const savedPost = await response.json()
      console.log('[BLOG_SAVE] Blog post saved successfully', { 
        id: savedPost.id || savedPost._id, 
        title: savedPost.title,
        status: savedPost.status,
        slug: savedPost.slug
      })

      onSaved(savedPost)
    } catch (error) {
      console.error('Error saving blog post:', error)
      alert('Failed to save blog post: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUploadImage = async (file) => {
    if (!file) return

    try {
      setUploading(true)
      if (debug) {
        console.log('[DEBUG_ADMIN] Upload image start', { size: file.size, type: file.type, name: file.name })
      }

      // Get signed upload URL
      const token = await getToken()
      if (!token) {
        alert('Authentication error: No Clerk token found. Please sign in.')
        return
      }

      const signResponse = await fetch('/api/cloudinary/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          subfolder: 'blog-images',
          tags: ['blog-featured']
        })
      })

      if (!signResponse.ok) throw new Error('Failed to get upload signature')
      const params = await signResponse.json()

      // Upload to Cloudinary
      const form = new FormData()
      form.append('file', file)
      form.append('timestamp', params.timestamp)
      form.append('api_key', params.apiKey)
      form.append('signature', params.signature)
      form.append('folder', params.folder)
      form.append('tags', 'blog-featured')

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${params.cloudName}/image/upload`, {
        method: 'POST',
        body: form
      })

      if (!uploadRes.ok) throw new Error('Failed to upload image')
      const uploadResult = await uploadRes.json()

      if (debug) {
        console.log('[DEBUG_ADMIN] Upload result', { publicId: uploadResult.public_id, url: uploadResult.secure_url })
      }

      // Store image as an object with both URL and publicId for consistency
      setPostData(prev => ({
        ...prev,
        featuredImage: {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          alt: `Featured image for ${prev.title || 'blog post'}`
        }
      }))
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Failed to upload image: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-')
  }

  const handleTitleChange = (title) => {
    setPostData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title)
    }))
  }
  
  const handleTemplateChange = (templateId) => {
    setPostData(prev => ({ ...prev, template: templateId }))
    // Update active sections when template changes
    setActiveSections(getDefaultSections(templateId))
  }
  
  const handleSectionsChange = (newSections) => {
    setActiveSections(newSections)
  }

  const addTag = (tag) => {
    if (tag && !postData.tags.includes(tag)) {
      setPostData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }))
    }
  }

  const removeTag = (tagToRemove) => {
    setPostData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleContentGenerated = (generatedContent) => {
    // Update post data with AI-generated content
    setPostData(prev => ({
      ...prev,
      title: generatedContent.title || prev.title,
      content: generatedContent.content || prev.content,
      metaDescription: generatedContent.metaDescription || prev.metaDescription,
      tags: generatedContent.tags || prev.tags,
      category: generatedContent.category || prev.category,
      slug: generatedContent.slug || prev.slug
    }))
    
    // Show success message
    alert('AI content generated successfully! Review and customize as needed.')
  }

  const testAIConnection = async () => {
    if (!aiTestMessage.trim()) {
      setAiTestError('Please enter a test message')
      return
    }

    try {
      setAiTestLoading(true)
      setAiTestError('')
      setAiTestResult('')

      // Simple test call to the AI endpoint
      const response = await fetch('/ai/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(120000), // 2 minute timeout for AI processing
        body: JSON.stringify({
          topic: aiTestMessage,
          template: 'story',
          sections: ['introduction'],
          type: 'section'
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`HTTP ${response.status}: ${errorData.error || 'Failed to connect to AI service'}`)
      }

      const result = await response.json()
      setAiTestResult(JSON.stringify(result, null, 2))
      
      if (debug) {
        console.log('[DEBUG_ADMIN] AI test successful:', result)
      }
    } catch (error) {
      console.error('AI test failed:', error)
      setAiTestError(error.message)
    } finally {
      setAiTestLoading(false)
    }
  }

  const handleCTAsChange = (newCTAs) => {
    setPostData(prev => ({
      ...prev,
      ctas: newCTAs
    }))
  }

  if (!isAdmin) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
      <div className="w-full max-w-6xl h-full bg-white dark:bg-gray-900 shadow-xl flex flex-col text-gray-900 dark:text-gray-100">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <div className="font-semibold">
                {post ? 'Edit Blog Post' : 'Create New Blog Post'}
              </div>
              <div className="text-sm text-gray-500">
                {postData.template === 'story' && 'Story-Driven Template'}
                {postData.template === 'educational' && 'Educational Template'}
                {postData.template === 'inspiration' && 'Inspiration Template'}
              </div>
            </div>
          </div>
          <button
            onClick={() => handleSave(!post)} // Force publish for new posts, respect status for edits
            disabled={saving}
            className="px-4 py-2 bg-yellow-500 text-gray-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="w-4 h-4" />
                {post ? 'Update Post' : 'Publish Post'}
              </>
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            {['content', 'settings', 'preview', 'test'].map((tab) => (
              <button 
                key={tab} 
                className={`px-4 py-3 ${activeTab === tab ? 'border-b-2 border-yellow-500 text-yellow-600 dark:text-yellow-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'content' && <DocumentTextIcon className="w-4 h-4 inline mr-2" />}
                {tab === 'settings' && <EyeIcon className="w-4 h-4 inline mr-2" />}
                {tab === 'preview' && <EyeIcon className="w-4 h-4 inline mr-2" />}
                {tab === 'test' && <BoltIcon className="w-4 h-4 inline mr-2" />}
                {tab === 'test' ? 'Test' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'content' && (
            <div className="space-y-6">
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium mb-3">Choose Template</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {templates.map((template) => {
                    const IconComponent = template.icon
                    return (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateChange(template.id)}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          postData.template === template.id
                            ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center mb-2">
                          <div className={`w-8 h-8 ${template.color} rounded-lg flex items-center justify-center mr-3`}>
                            <IconComponent className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-semibold">{template.name}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{template.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* AI Topic Generator */}
              <div>
                <AITopicGenerator 
                  onTopicSelected={setSelectedTopic}
                  currentTitle={postData.title}
                  setPostData={setPostData}
                />
              </div>

              {/* Enhanced AI Content Generator */}
              <div>
                <EnhancedAIGenerator 
                  postData={postData}
                  setPostData={setPostData}
                  onContentGenerated={handleContentGenerated}
                  selectedTemplate={postData.template}
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  value={postData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  placeholder="Enter your blog post title..."
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-medium mb-2">Excerpt</label>
                <textarea
                  value={postData.excerpt}
                  onChange={(e) => setPostData(prev => ({ ...prev, excerpt: e.target.value }))}
                  rows={3}
                  className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  placeholder="Brief description of your post..."
                />
              </div>

              {/* Featured Image */}
              <div>
                <label className="block text-sm font-medium mb-2">Featured Image</label>
                <div className="space-y-4">
                  {postData.featuredImage && (
                    <div className="relative">
                      <img 
                        src={typeof postData.featuredImage === 'string' ? postData.featuredImage : postData.featuredImage.url} 
                        alt={typeof postData.featuredImage === 'string' ? 'Featured' : postData.featuredImage.alt} 
                        className="w-full max-w-md h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => setPostData(prev => ({ ...prev, featuredImage: null }))}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadImage(e.target.files[0])}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                    >
                      <PhotoIcon className="w-5 h-5" />
                      {uploading ? 'Uploading...' : 'Upload Featured Image'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Template Sections */}
              <div>
                <DynamicTemplateSections 
                  template={postData.template}
                  sections={templateSections}
                  onSectionsChange={setTemplateSections}
                />
              </div>
              
              {/* Content */}
              <div>
                <label className="block text-sm font-medium mb-2">Content *</label>
                <textarea
                  value={postData.content}
                  onChange={(e) => setPostData(prev => ({ ...prev, content: e.target.value }))}
                  rows={20}
                  className="w-full p-3 border rounded-lg font-mono text-sm dark:bg-gray-800 dark:border-gray-700"
                  placeholder="Write your blog post content here... You can use HTML tags for formatting."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  You can use HTML tags like &lt;h2&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;, &lt;li&gt;, etc.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={postData.category}
                  onChange={(e) => setPostData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium mb-2">URL Slug</label>
                <input
                  type="text"
                  value={postData.slug}
                  onChange={(e) => setPostData(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  placeholder="your-blog-post-url"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This will be the URL: /blog/{postData.slug}
                </p>
              </div>

              {/* Meta Description */}
              <div>
                <label className="block text-sm font-medium mb-2">Meta Description</label>
                <textarea
                  value={postData.metaDescription}
                  onChange={(e) => setPostData(prev => ({ ...prev, metaDescription: e.target.value }))}
                  rows={3}
                  className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  placeholder="SEO description for search engines..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {postData.metaDescription.length}/160 characters
                </p>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-2">Tags</label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a tag..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag(e.target.value.trim())
                          e.target.value = ''
                        }
                      }}
                      className="flex-1 p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    />
                    <button
                      onClick={(e) => {
                        const input = e.target.previousSibling
                        addTag(input.value.trim())
                        input.value = ''
                      }}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {postData.tags.map(tag => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-sm"
                      >
                        <TagIcon className="w-3 h-3" />
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-600 dark:hover:text-red-400"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={postData.status}
                  onChange={(e) => setPostData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>

              {/* Publish Date */}
              <div>
                <label className="block text-sm font-medium mb-2">Publish Date</label>
                <input
                  type="date"
                  value={postData.publishDate}
                  onChange={(e) => setPostData(prev => ({ ...prev, publishDate: e.target.value }))}
                  className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                />
              </div>

              {/* Conversion CTAs */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Conversion CTAs
                </h3>
                <ConversionCTAManager
                  ctas={postData.ctas}
                  onCTAsChange={handleCTAsChange}
                />
              </div>

              {/* SEO Optimization */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  SEO Optimization
                </h3>
                <SEOOptimizer postData={postData} />
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Interactive Template Preview</h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {postData.template === 'story' && 'Story-Driven Template'}
                    {postData.template === 'educational' && 'Educational Template'}
                    {postData.template === 'inspiration' && 'Inspirational Template'}
                  </span>
                </div>

                {/* Interactive Preview with Enhanced Controls */}
                <InteractivePreview
                  postData={postData}
                  templateId={postData.template}
                >
                  {/* Template Renderer */}
                  <TemplateRenderer
                    postData={postData}
                    templateId={postData.template}
                    activeSections={activeSections}
                    isPreview={true}
                    isEditing={false}
                  />
                  
                  {/* Engagement Tracker */}
                  <EngagementTracker postData={postData} />
                </InteractivePreview>
              </div>
            </div>
          )}

          {activeTab === 'test' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">🧪 AI Connection Test</h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Test the AI service connection and functionality
                  </span>
                </div>

                {/* Simple AI Test */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                    🧪 Simple AI Connection Test
                  </h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Enter a simple test message (e.g., 'Hello AI')"
                      className="w-full p-2 border rounded text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                      value={aiTestMessage}
                      onChange={(e) => setAiTestMessage(e.target.value)}
                    />
                    <button
                      onClick={testAIConnection}
                      disabled={aiTestLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      {aiTestLoading ? 'Testing...' : 'Test AI Connection'}
                    </button>
                    {aiTestResult && (
                      <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                        <strong>AI Response:</strong>
                        <pre className="whitespace-pre-wrap mt-1">{aiTestResult}</pre>
                      </div>
                    )}
                    {aiTestError && (
                      <div className="mt-3 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-sm">
                        <strong>Error:</strong> {aiTestError}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
