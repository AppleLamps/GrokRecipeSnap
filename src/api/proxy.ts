import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Proxy endpoint for handling image requests to bypass CORS restrictions
 * @param req Next.js API request
 * @param res Next.js API response
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    // Validate URL
    const parsedUrl = new URL(url);
    if (!parsedUrl.hostname.endsWith('x.ai')) {
      return res.status(400).json({ error: 'Invalid domain' });
    }

    // Fetch the image
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Failed to fetch image: ${response.statusText}` 
      });
    }

    // Get content type
    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Stream the response
    return res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('[ProxyAPI] Error proxying image:', error);
    return res.status(500).json({ error: 'Failed to proxy image' });
  }
} 