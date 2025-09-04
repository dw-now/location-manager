// ============================================
// netlify/functions/share-db.js
// Alternative version using Netlify Blobs for persistent storage
// (Requires Netlify Blobs to be enabled in your project)

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

      const code = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      
      // Store in Netlify Blobs with 24-hour expiration
      await store.setJSON(code, {
        locations: data.locations,
        timestamp: Date.now(),
        created: new Date().toISOString()
      }, {
        metadata: {
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          code: code,
          url: `${process.env.URL}/?share=${code}`,
          expiresIn: '24 hours'
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
      const shareData = await store.getJSON(code);
      
      if (!shareData) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Share code not found or expired' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(shareData)
      };
    } catch (error) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Share code not found' })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};