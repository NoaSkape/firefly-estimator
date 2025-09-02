// Temporary debug endpoint to test API routing
export default async function handler(req, res) {
  console.log('[DEBUG] Test endpoint called:', {
    method: req.method,
    url: req.url,
    headers: {
      authorization: req.headers.authorization ? 'PRESENT' : 'MISSING',
      'user-agent': req.headers['user-agent']?.slice(0, 50) + '...'
    }
  })
  
  res.status(200).json({ 
    message: 'Debug test endpoint working',
    timestamp: new Date().toISOString(),
    hasAuth: !!req.headers.authorization
  })
}
