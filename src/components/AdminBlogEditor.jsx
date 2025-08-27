import { useState, useRef } from 'react'
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
  CheckIcon
} from '@heroicons/react/24/outline'

export default function AdminBlogEditor({ post = null, onClose, onSaved }) {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('content')
  const fileInputRef = useRef(null)
  const debug = (import.meta.env?.VITE_DEBUG_ADMIN === 'true')
  const isAdmin = canEditModelsClient(user)

  // Blog post state
  const [postData, setPostData] = useState(post || {
    title: '',
    excerpt: '',
    content: '',
    category: '',
    template: 'story', // story, educational, inspiration
    featuredImage: '',
    slug: '',
    metaDescription: '',
    tags: [],
    status: 'draft', // draft, published
    publishDate: new Date().toISOString().split('T')[0]
  })

  const categories = [
    'Buying Guides',
    'Design & Inspiration', 
    'Financing & Investment',
    'Location & Zoning',
    'Lifestyle & Stories',
    'Sustainability'
  ]

  const templates = [
    {
      id: 'story',
      name: 'Story-Driven',
      icon: BookOpenIcon,
      description: 'Personal experience and narrative flow',
      color: 'bg-blue-500'
    },
    {
      id: 'educational',
      name: 'Educational',
      icon: DocumentTextIcon,
      description: 'How-to guides and step-by-step content',
      color: 'bg-green-500'
    },
    {
      id: 'inspiration',
      name: 'Inspiration',
      icon: PaintBrushIcon,
      description: 'Visual showcase and design inspiration',
      color: 'bg-purple-500'
    }
  ]

  const handleSave = async () => {
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

      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      const url = post ? `/api/blog/${post.id}` : '/api/blog'
      const method = post ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(postData)
      })

      if (!response.ok) {
        throw new Error('Failed to save blog post')
      }

      const savedPost = await response.json()
      if (debug) {
        console.log('[DEBUG_ADMIN] Blog post saved', { id: savedPost.id, title: savedPost.title })
      }

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
          folder: 'blog-images',
          tags: 'blog-featured'
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

      setPostData(prev => ({
        ...prev,
        featuredImage: uploadResult.secure_url
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
            onClick={handleSave}
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
        <div className="border-b">
          <div className="flex">
            {['content', 'settings', 'preview'].map((tab) => (
              <button 
                key={tab} 
                className={`px-4 py-3 ${activeTab === tab ? 'border-b-2 border-yellow-500 text-yellow-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'content' && <DocumentTextIcon className="w-4 h-4 inline mr-2" />}
                {tab === 'settings' && <EyeIcon className="w-4 h-4 inline mr-2" />}
                {tab === 'preview' && <EyeIcon className="w-4 h-4 inline mr-2" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
                        onClick={() => setPostData(prev => ({ ...prev, template: template.id }))}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          postData.template === template.id
                            ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                            : 'border-gray-200 hover:border-gray-300'
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
                        src={postData.featuredImage} 
                        alt="Featured" 
                        className="w-full max-w-md h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => setPostData(prev => ({ ...prev, featuredImage: '' }))}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
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
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      <PhotoIcon className="w-5 h-5" />
                      {uploading ? 'Uploading...' : 'Upload Featured Image'}
                    </button>
                  </div>
                </div>
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
                <p className="text-xs text-gray-500 mt-1">
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
                <p className="text-xs text-gray-500 mt-1">
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
                <p className="text-xs text-gray-500 mt-1">
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
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {postData.tags.map(tag => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                      >
                        <TagIcon className="w-3 h-3" />
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-600"
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
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="bg-white border rounded-lg p-6">
                <h1 className="text-3xl font-bold mb-4">{postData.title || 'Preview Title'}</h1>
                {postData.excerpt && (
                  <p className="text-lg text-gray-600 mb-6 italic">{postData.excerpt}</p>
                )}
                {postData.featuredImage && (
                  <img 
                    src={postData.featuredImage} 
                    alt="Featured" 
                    className="w-full h-64 object-cover rounded-lg mb-6"
                  />
                )}
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: postData.content || '<p>Your content will appear here...</p>' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
