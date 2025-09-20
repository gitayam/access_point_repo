const axios = require('axios');
const fs = require('fs');

async function testWigleImproved() {
  try {
    const token = fs.readFileSync('/tmp/token.txt', 'utf8').trim();

    // Test searching for winterbloom with wildcard
    console.log('Testing WiGLE search for winterbloom (with location hint):');
    const response = await axios.post('http://localhost:3001/api/wigle/search', {
      latitude: 35.0534,  // Near where winterbloom was found
      longitude: -78.8807,
      radius: 10,
      ssid: 'winterbloom'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Found ${response.data.count} networks`);
    console.log(`Total results available: ${response.data.totalResults}`);

    if (response.data.networks) {
      console.log('\nFirst 5 networks:');
      response.data.networks.slice(0, 5).forEach(network => {
        console.log(`- ${network.ssid || 'NO_SSID'} (${network.bssid}) at (${network.latitude}, ${network.longitude})`);
        console.log(`  Security: ${network.securityType}, City: ${network.city || 'N/A'}, Region: ${network.region || 'N/A'}`);
      });
    }

    // Test searching without specific SSID (area search)
    console.log('\n\nTesting WiGLE area search (no SSID filter):');
    const areaResponse = await axios.post('http://localhost:3001/api/wigle/search', {
      latitude: 37.7749,  // San Francisco
      longitude: -122.4194,
      radius: 1  // 1km radius
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Found ${areaResponse.data.count} networks in SF area`);

    if (areaResponse.data.networks && areaResponse.data.networks.length > 0) {
      console.log('\nFirst 5 networks in SF:');
      areaResponse.data.networks.slice(0, 5).forEach(network => {
        console.log(`- ${network.ssid || 'NO_SSID'} (${network.bssid})`);
      });
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testWigleImproved();