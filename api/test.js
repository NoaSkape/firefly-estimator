export default async function handler(req, res) {
  console.log('Test endpoint called with method:', req.method);
  console.log('req.query:', req.query);
  console.log('req.url:', req.url);
  
  res.status(200).json({ 
    message: 'Test endpoint working',
    method: req.method,
    query: req.query,
    url: req.url
  });
}
