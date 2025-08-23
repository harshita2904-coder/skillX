import fetch from 'node-fetch';

async function testCORS() {
  const testUrl = 'http://localhost:4000/auth/login';
  const origin = 'https://skill-x-client.vercel.app';
  
  console.log('Testing CORS preflight request...');
  
  try {
    // Test OPTIONS request (preflight)
    const optionsResponse = await fetch(testUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    console.log('Preflight Response Status:', optionsResponse.status);
    console.log('Preflight Response Headers:');
    optionsResponse.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    
    // Test actual POST request
    const postResponse = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Origin': origin,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: 'test@test.com', password: 'test' })
    });
    
    console.log('\nPOST Response Status:', postResponse.status);
    console.log('POST Response Headers:');
    postResponse.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    
  } catch (error) {
    console.error('Error testing CORS:', error);
  }
}

testCORS(); 