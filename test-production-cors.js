import fetch from 'node-fetch';

async function testProductionCORS() {
  const testUrl = 'https://skillx-production-5d56.up.railway.app';
  const origin = 'https://skill-x-client.vercel.app';
  
  console.log('Testing production CORS...');
  
  try {
    // Test 1: Test the simple endpoint
    console.log('\n1. Testing /test-cors endpoint...');
    const testResponse = await fetch(`${testUrl}/test-cors`, {
      method: 'GET',
      headers: {
        'Origin': origin
      }
    });
    
    console.log('Test endpoint status:', testResponse.status);
    console.log('Test endpoint headers:');
    testResponse.headers.forEach((value, key) => {
      if (key.toLowerCase().includes('access-control')) {
        console.log(`  ${key}: ${value}`);
      }
    });
    
    // Test 2: Test OPTIONS preflight
    console.log('\n2. Testing OPTIONS preflight...');
    const optionsResponse = await fetch(`${testUrl}/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    console.log('Preflight status:', optionsResponse.status);
    console.log('Preflight headers:');
    optionsResponse.headers.forEach((value, key) => {
      if (key.toLowerCase().includes('access-control')) {
        console.log(`  ${key}: ${value}`);
      }
    });
    
    // Test 3: Test actual POST request
    console.log('\n3. Testing POST login request...');
    const postResponse = await fetch(`${testUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Origin': origin,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: 'test@test.com', password: 'test' })
    });
    
    console.log('POST status:', postResponse.status);
    console.log('POST headers:');
    postResponse.headers.forEach((value, key) => {
      if (key.toLowerCase().includes('access-control')) {
        console.log(`  ${key}: ${value}`);
      }
    });
    
    const responseText = await postResponse.text();
    console.log('POST response body:', responseText.substring(0, 200) + '...');
    
  } catch (error) {
    console.error('Error testing CORS:', error);
  }
}

testProductionCORS(); 