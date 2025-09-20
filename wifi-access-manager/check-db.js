const knex = require('knex');

const db = knex({
  client: 'postgresql',
  connection: 'postgresql://postgres:postgres@localhost:5432/wifi_access_manager'
});

async function checkDatabase() {
  try {
    // Count total access points
    const [{ count: total }] = await db('access_points').count();
    console.log(`Total access points in database: ${total}`);

    // Check for winterbloom
    const winterbloomAPs = await db('access_points')
      .where('ssid', 'ilike', '%winterbloom%')
      .select('id', 'ssid', 'latitude', 'longitude', 'created_at');

    console.log(`\nWinterbloom access points: ${winterbloomAPs.length}`);
    winterbloomAPs.forEach(ap => {
      console.log(`- ${ap.ssid} at (${ap.latitude}, ${ap.longitude})`);
    });

    // Get latest 10 access points
    const latest = await db('access_points')
      .orderBy('created_at', 'desc')
      .limit(10)
      .select('id', 'ssid', 'latitude', 'longitude', 'created_at');

    console.log('\nLatest 10 access points:');
    latest.forEach(ap => {
      console.log(`- ${ap.ssid || 'NULL SSID'} at (${ap.latitude}, ${ap.longitude}) - ${ap.created_at}`);
    });

    // Check for access points near a specific location (e.g., Fayetteville)
    const lat = 36.0526;
    const lng = -94.1574;
    const nearby = await db.raw(`
      SELECT ssid, latitude, longitude,
        ST_Distance(
          location::geography,
          ST_MakePoint(?, ?)::geography
        ) as distance
      FROM access_points
      WHERE ST_DWithin(
        location::geography,
        ST_MakePoint(?, ?)::geography,
        50000  -- 50km radius
      )
      ORDER BY distance
      LIMIT 10
    `, [lng, lat, lng, lat]);

    console.log(`\nAccess points near Fayetteville (${lat}, ${lng}):`);
    if (nearby.rows.length === 0) {
      console.log('No access points found near this location');
    } else {
      nearby.rows.forEach(ap => {
        console.log(`- ${ap.ssid} at ${Math.round(ap.distance)}m away`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

checkDatabase();