const axios = require('axios');
const fs = require('fs');

async function testQRCode() {
  try {
    // Get the token
    const token = fs.readFileSync('/tmp/token.txt', 'utf8').trim();

    // First get an access point ID
    const apResponse = await axios.get('http://localhost:3001/api/access-points/nearby?lat=35.0534&lng=-78.8807&radius=5', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (apResponse.data && apResponse.data.length > 0) {
      const apId = apResponse.data[0].id;
      console.log('Testing QR code for access point:', apId);

      // Now test the QR code endpoint
      const qrResponse = await axios.get(`http://localhost:3001/api/access-points/${apId}/qr-code`);

      console.log('QR Code response:');
      console.log('- Has qrCode:', !!qrResponse.data.qrCode);
      console.log('- WiFi String:', qrResponse.data.wifiString);
      console.log('- QR Code data URL length:', qrResponse.data.qrCode?.length || 0);

      if (qrResponse.data.qrCode) {
        console.log('QR code successfully generated!');
      }
    } else {
      console.log('No access points found');
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testQRCode();