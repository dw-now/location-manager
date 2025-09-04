// netlify/functions/share.js
// Using Netlify Blobs for persistent storage

const { getStore } = require("@netlify/blobs");

exports.handler = async (event, context) => {
  const { httpMethod, queryStringParameters, body } = event;
  
  // Initialize Netlify Blobs store
  const store = getStore("location-shares");
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight requests
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (httpMethod === 'POST') {
    try {
      const data = JSON.parse(body);
      
      if (!data.locations || !Array.isArray(data.locations)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid data format' })
        };
      }

      // Generate unique share code
      const code = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      
      // Store in Netlify Blobs
      await store.setJSON(code, {
        locations: data.locations,
        timestamp: Date.now(),
        created: new Date().toISOString()
      });

      // Set expiration for 7 days (optional - Blobs don't auto-expire)
      // You could implement cleanup in a scheduled function if needed

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          code: code,
          url: `${process.env.URL}/?share=${code}`,
          expiresIn: '7 days'
        })
      };
    } catch (error) {
      console.error('Error storing locations:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to store locations' })
      };
    }
    
  } else if (httpMethod === 'GET') {
    const { code } = queryStringParameters || {};
    
    if (!code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Share code required' })
      };
    }

    try {
      // Get from Netlify Blobs
      const shareData = await store.get(code, { type: 'json' });
      
      if (!shareData) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Share code not found or expired' })
        };
      }

      // Check if data is older than 7 days
      const age = Date.now() - shareData.timestamp;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      
      if (age > maxAge) {
        // Delete expired data
        await store.delete(code);
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Share code expired' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(shareData)
      };
    } catch (error) {
      console.error('Error retrieving locations:', error);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Share code not found' })
      };
    }
    
  } else if (httpMethod === 'DELETE') {
    // Optional: Clean up old entries
    const { code } = queryStringParameters || {};
    
    if (code === 'cleanup' && process.env.CLEANUP_KEY === event.headers['x-cleanup-key']) {
      try {
        // This would need to iterate through all entries
        // Not implemented here for simplicity
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Cleanup not implemented' })
        };
      } catch (error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Cleanup failed' })
        };
      }
    }
    
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};