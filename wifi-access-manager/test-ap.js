const axios = require('axios');
const fs = require('fs');

async function testCreateAccessPoint() {
  try {
    const token = fs.readFileSync('/tmp/token.txt', 'utf8').trim();

    const response = await axios.post('http://localhost:3001/api/access-points', {
      ssid: 'TestWifi',
      bssid: '00:11:22:33:44:55',
      securityType: 'WPA2',
      isOpen: false,
      requiresLogin: false,
      latitude: 37.7749,
      longitude: -122.4194,
      address: 'Test Address',
      venueName: 'Test Venue',
      venueType: 'cafe'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testCreateAccessPoint();