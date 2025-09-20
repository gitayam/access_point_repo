const axios = require('axios');
const fs = require('fs');

async function testNearby() {
  try {
    const token = fs.readFileSync('/tmp/token.txt', 'utf8').trim();

    // Test near the winterbloom locations (North Carolina)
    console.log('Testing near winterbloom locations (North Carolina):');
    const ncResponse = await axios.get('http://localhost:3001/api/access-points/nearby', {
      params: {
        lat: 35.0534,
        lng: -78.8807,
        radius: 5
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Found ${ncResponse.data.length} access points near NC location`);
    ncResponse.data.slice(0, 5).forEach(ap => {
      console.log(`- ${ap.ssid} at ${ap.distance}m away`);
    });

    // Test near Fayetteville, Arkansas (current map view)
    console.log('\nTesting near Fayetteville, Arkansas:');
    const arResponse = await axios.get('http://localhost:3001/api/access-points/nearby', {
      params: {
        lat: 36.0526,
        lng: -94.1574,
        radius: 50
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Found ${arResponse.data.length} access points near AR location`);

    // Test near San Francisco (where TestWifi is)
    console.log('\nTesting near San Francisco:');
    const sfResponse = await axios.get('http://localhost:3001/api/access-points/nearby', {
      params: {
        lat: 37.7749,
        lng: -122.4194,
        radius: 5
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Found ${sfResponse.data.length} access points near SF location`);
    sfResponse.data.slice(0, 5).forEach(ap => {
      console.log(`- ${ap.ssid} at ${Math.round(ap.distance)}m away`);
    });

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testNearby();