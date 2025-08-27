import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminBlogEditor from '../components/AdminBlogEditor'

export default function BlogCreate() {
  const navigate = useNavigate()
  const [isEditorOpen, setIsEditorOpen] = useState(true)

  const handleSaved = (savedPost) => {
    // Redirect to the blog post or blog listing
    if (savedPost.status === 'published') {
      navigate(`/blog/${savedPost.slug}`)
    } else {
      navigate('/blog')
    }
  }

  const handleClose = () => {
    navigate('/blog')
  }

  return (
    <>
      {isEditorOpen && (
        <AdminBlogEditor
          onClose={handleClose}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
