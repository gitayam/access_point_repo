import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getDatabase } from '../db/connection';
import { io } from '../index';

const router = Router();

// Temporary mock implementation due to speedtest-net not supporting Apple Silicon
// TODO: Replace with a real speed test library that supports arm64
// Note: The speedtest-net package throws "darwin on arm64 not supported" error

const SpeedTestResultSchema = z.object({
  accessPointId: z.string().uuid(),
  downloadSpeed: z.number(),
  uploadSpeed: z.number(),
  ping: z.number(),
  testServer: z.string()
});

// Mock speed test function that simulates realistic values
function simulateSpeedTest() {
  // Generate realistic random values
  const downloadSpeed = 20 + Math.random() * 80; // 20-100 Mbps
  const uploadSpeed = 10 + Math.random() * 40;  // 10-50 Mbps
  const ping = 10 + Math.random() * 40;          // 10-50 ms

  return {
    download: { bandwidth: downloadSpeed * 125000 },
    upload: { bandwidth: uploadSpeed * 125000 },
    ping: { latency: ping },
    server: { name: 'Mock Test Server (Local)' }
  };
}

router.post('/run', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { accessPointId } = req.body;

    if (!accessPointId) {
      throw new AppError('Access point ID is required', 400);
    }

    io.emit('speed-test-start', { accessPointId, userId: req.user!.id });

    // Simulate a delay for realistic feel
    setTimeout(async () => {
      try {
        const data = simulateSpeedTest();
        const db = getDatabase();

        const result = {
          access_point_id: accessPointId,
          user_id: req.user!.id,
          download_speed: data.download.bandwidth / 125000,
          upload_speed: data.upload.bandwidth / 125000,
          ping: data.ping.latency,
          test_server: data.server.name || 'Unknown'
        };

        const [speedTest] = await db('speed_tests')
          .insert(result)
          .returning('*');

        io.emit('speed-test-complete', speedTest);

        res.json({
          success: true,
          result: {
            downloadSpeed: result.download_speed,
            uploadSpeed: result.upload_speed,
            ping: result.ping,
            testServer: result.test_server,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('Error saving speed test:', error);
        io.emit('speed-test-error', { accessPointId, error: 'Failed to save speed test results' });
        next(error);
      }
    }, 3000); // 3 second delay to simulate test

  } catch (error) {
    next(error);
  }
});

router.get('/history/:accessPointId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { accessPointId } = req.params;
    const db = getDatabase();

    const speedTests = await db('speed_tests')
      .where('access_point_id', accessPointId)
      .orderBy('tested_at', 'desc')
      .limit(20);

    const avgSpeed = await db('speed_tests')
      .where('access_point_id', accessPointId)
      .select(
        db.raw('AVG(download_speed) as avg_download'),
        db.raw('AVG(upload_speed) as avg_upload'),
        db.raw('AVG(ping) as avg_ping'),
        db.raw('COUNT(*) as total_tests')
      )
      .first();

    res.json({
      tests: speedTests,
      statistics: avgSpeed
    });
  } catch (error) {
    next(error);
  }
});

router.post('/save', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const data = SpeedTestResultSchema.parse(req.body);
    const db = getDatabase();

    const [speedTest] = await db('speed_tests')
      .insert({
        access_point_id: data.accessPointId,
        user_id: req.user!.id,
        download_speed: data.downloadSpeed,
        upload_speed: data.uploadSpeed,
        ping: data.ping,
        test_server: data.testServer
      })
      .returning('*');

    res.status(201).json(speedTest);
  } catch (error) {
    next(error);
  }
});

export default router;