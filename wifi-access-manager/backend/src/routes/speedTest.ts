import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getDatabase } from '../db/connection';
import { io } from '../index';

const router = Router();

const speedtest = require('speedtest-net');

const SpeedTestResultSchema = z.object({
  accessPointId: z.string().uuid(),
  downloadSpeed: z.number(),
  uploadSpeed: z.number(),
  ping: z.number(),
  testServer: z.string()
});

router.post('/run', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { accessPointId } = req.body;

    if (!accessPointId) {
      throw new AppError('Access point ID is required', 400);
    }

    io.emit('speed-test-start', { accessPointId, userId: req.user!.id });

    const test = speedtest({ acceptLicense: true, acceptGdpr: true });

    test.on('data', async (data: any) => {
      try {
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
        next(error);
      }
    });

    test.on('error', (err: any) => {
      console.error('Speed test error:', err);
      io.emit('speed-test-error', { accessPointId, error: err.message });
      throw new AppError('Speed test failed', 500);
    });

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