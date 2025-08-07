import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  console.log('Testing API endpoints...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log('Health response:', healthData);
    console.log('');

    // Test model endpoint (this will fail without auth, but we can see the structure)
    console.log('2. Testing model endpoint...');
    try {
      const modelResponse = await fetch(`${BASE_URL}/api/models/aps-630`);
      console.log('Model response status:', modelResponse.status);
      if (modelResponse.ok) {
        const modelData = await modelResponse.json();
        console.log('Model data:', modelData);
      } else {
        console.log('Model endpoint requires authentication');
      }
    } catch (error) {
      console.log('Model endpoint error:', error.message);
    }
    console.log('');

    console.log('API test completed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAPI(); 