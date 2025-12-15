// Health check endpoint
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'ok',
    message: 'Bharathi Medicals API running on Vercel!',
    timestamp: new Date().toISOString()
  });
}
