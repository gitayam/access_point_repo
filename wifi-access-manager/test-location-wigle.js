const axios = require('axios');
const fs = require('fs');

async function testLocationBasedWigleSearch() {
  try {
    const token = fs.readFileSync('/tmp/token.txt', 'utf8').trim();

    // Test searching at a specific location (near winterbloom in NC)
    console.log('Testing location-based WiGLE search near winterbloom location:');
    const response = await axios.post('http://localhost:3001/api/wigle/search', {
      latitude: 35.0534,
      longitude: -78.8807,
      radius: 0.5  // 500m radius
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Found ${response.data.count} networks`);
    console.log(`Total results available: ${response.data.totalResults}`);

    if (response.data.networks && response.data.networks.length > 0) {
      console.log('\nFirst 10 networks found:');
      response.data.networks.slice(0, 10).forEach(network => {
        console.log(`- ${network.ssid || 'HIDDEN'} (${network.bssid})`);
        console.log(`  Type: ${network.securityType}, Location: (${network.latitude}, ${network.longitude})`);
      });
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testLocationBasedWigleSearch();