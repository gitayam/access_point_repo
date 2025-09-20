import { Router } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import { getDatabase } from '../db/connection';
import { authenticateToken, optionalAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { io } from '../index';

const router = Router();

const CreateAccessPointSchema = z.object({
  ssid: z.string().min(1).max(255),
  bssid: z.string().optional(),
  securityType: z.string().optional(),
  password: z.string().optional(),
  isOpen: z.boolean().default(false),
  requiresLogin: z.boolean().default(false),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  venueName: z.string().optional(),
  venueType: z.string().optional()
});

const RatingSchema = z.object({
  overallRating: z.number().min(1).max(5),
  speedRating: z.number().min(1).max(5).optional(),
  reliabilityRating: z.number().min(1).max(5).optional(),
  comment: z.string().optional()
});

const ServiceBlockSchema = z.object({
  serviceName: z.string(),
  isBlocked: z.boolean()
});

router.get('/nearby', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { lat, lng, radius = 5 } = req.query;

    if (!lat || !lng) {
      throw new AppError('Latitude and longitude are required', 400);
    }

    const db = getDatabase();

    const accessPoints = await db.raw(`
      SELECT
        ap.*,
        ST_Distance(
          location::geography,
          ST_MakePoint(?, ?)::geography
        ) as distance,
        COALESCE(AVG(r.overall_rating), 0) as avg_rating,
        COUNT(DISTINCT r.id) as rating_count,
        EXISTS(
          SELECT 1 FROM access_point_passwords
          WHERE access_point_id = ap.id
          AND is_current = true
        ) as has_password
      FROM access_points ap
      LEFT JOIN ratings r ON ap.id = r.access_point_id
      WHERE ST_DWithin(
        location::geography,
        ST_MakePoint(?, ?)::geography,
        ? * 1000
      )
      GROUP BY ap.id
      ORDER BY distance
      LIMIT 50
    `, [lng, lat, lng, lat, radius]);

    res.json(accessPoints.rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const accessPoint = await db('access_points')
      .where('id', id)
      .first();

    if (!accessPoint) {
      throw new AppError('Access point not found', 404);
    }

    const [ratings, speedTests, serviceBlocks] = await Promise.all([
      db('ratings')
        .where('access_point_id', id)
        .orderBy('created_at', 'desc')
        .limit(10),
      db('speed_tests')
        .where('access_point_id', id)
        .orderBy('tested_at', 'desc')
        .limit(5),
      db('service_blocks')
        .where('access_point_id', id)
    ]);

    let password = null;
    if (req.user) {
      const passwordRecord = await db('access_point_passwords')
        .where('access_point_id', id)
        .where('is_current', true)
        .where(function() {
          this.whereNull('organization_id')
            .orWhere('organization_id', req.user!.organizationId);
        })
        .first();

      if (passwordRecord) {
        password = passwordRecord.password;
      }
    }

    res.json({
      ...accessPoint,
      ratings,
      speedTests,
      serviceBlocks,
      password
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const data = CreateAccessPointSchema.parse(req.body);
    const db = getDatabase();

    const [accessPoint] = await db('access_points')
      .insert({
        ssid: data.ssid,
        bssid: data.bssid,
        security_type: data.securityType,
        is_open: data.isOpen,
        requires_login: data.requiresLogin,
        latitude: data.latitude,
        longitude: data.longitude,
        location: db.raw('ST_MakePoint(?, ?)', [data.longitude, data.latitude]),
        address: data.address,
        venue_name: data.venueName,
        venue_type: data.venueType,
        created_by: req.user!.id,
        organization_id: req.user!.organizationId
      })
      .returning('*');

    if (data.password && !data.isOpen) {
      await db('access_point_passwords').insert({
        access_point_id: accessPoint.id,
        password: data.password,
        added_by: req.user!.id,
        organization_id: req.user!.organizationId,
        is_current: true
      });
    }

    if (req.user!.organizationId) {
      io.to(`org-${req.user!.organizationId}`).emit('new-access-point', accessPoint);
    }

    res.status(201).json(accessPoint);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/password', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      throw new AppError('Password is required', 400);
    }

    const db = getDatabase();

    await db('access_point_passwords')
      .where('access_point_id', id)
      .update({ is_current: false });

    const [passwordRecord] = await db('access_point_passwords')
      .insert({
        access_point_id: id,
        password,
        added_by: req.user!.id,
        organization_id: req.user!.organizationId,
        is_current: true
      })
      .returning('*');

    res.status(201).json(passwordRecord);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/rating', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const data = RatingSchema.parse(req.body);
    const db = getDatabase();

    const [rating] = await db('ratings')
      .insert({
        access_point_id: id,
        user_id: req.user!.id,
        overall_rating: data.overallRating,
        speed_rating: data.speedRating,
        reliability_rating: data.reliabilityRating,
        comment: data.comment
      })
      .onConflict(['access_point_id', 'user_id'])
      .merge()
      .returning('*');

    res.json(rating);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/service-block', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const data = ServiceBlockSchema.parse(req.body);
    const db = getDatabase();

    const [serviceBlock] = await db('service_blocks')
      .insert({
        access_point_id: id,
        service_name: data.serviceName,
        is_blocked: data.isBlocked,
        reported_by: req.user!.id
      })
      .onConflict(['access_point_id', 'service_name'])
      .merge({
        is_blocked: data.isBlocked,
        verified_count: db.raw('service_blocks.verified_count + 1')
      })
      .returning('*');

    res.json(serviceBlock);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/qr-code', async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const accessPoint = await db('access_points')
      .where('id', id)
      .first();

    if (!accessPoint) {
      throw new AppError('Access point not found', 404);
    }

    const password = await db('access_point_passwords')
      .where('access_point_id', id)
      .where('is_current', true)
      .first();

    const wifiString = `WIFI:T:${accessPoint.security_type || 'WPA'};S:${accessPoint.ssid};P:${password?.password || ''};;`;

    const qrCodeDataUrl = await QRCode.toDataURL(wifiString, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    });

    res.json({
      qrCode: qrCodeDataUrl,
      wifiString
    });
  } catch (error) {
    next(error);
  }
});

export default router;