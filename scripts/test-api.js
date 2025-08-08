import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testGet(id) {
  try {
    const res = await fetch(`${BASE_URL}/api/models/${id}`);
    const text = await res.text();
    console.log(`GET /api/models/${id} -> ${res.status} ${text}`);
  } catch (e) {
    console.error(`Error GET /api/models/${id}:`, e.message);
  }
}

async function testAPI() {
  console.log('Testing API endpoints...\n');
  console.log('Base URL:', BASE_URL);

  // Health
  try {
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    console.log('Health status:', healthResponse.status);
  } catch (e) {
    console.error('Health check failed:', e.message);
  }

  // Dual-resolution tests (may require auth depending on server guard)
  await testGet('aps-630');
  await testGet('APS-630');
  await testGet('magnolia');
}

testAPI();