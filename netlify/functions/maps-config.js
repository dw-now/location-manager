// netlify/functions/maps-config.js
// This function provides the Google Maps API key to your frontend

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check if API key is configured
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error('GOOGLE_MAPS_API_KEY is not configured in environment variables');
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Maps API key not configured',
        message: 'Please set GOOGLE_MAPS_API_KEY in Netlify environment variables'
      })
    };
  }

  // Return the API key
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      // CORS headers if needed
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify({
      apiKey: apiKey
    })
  };
};