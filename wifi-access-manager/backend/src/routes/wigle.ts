import { Router } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getDatabase } from '../db/connection';

const router = Router();

const WigleSearchSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().min(0.01).max(10).default(1),
  ssid: z.string().optional()
});

const wigleApi = axios.create({
  baseURL: process.env.WIGLE_API_BASE_URL || 'https://api.wigle.net/api/v2',
  headers: {
    'Accept': 'application/json',
    'Authorization': `Basic ${Buffer.from(
      `${process.env.WIGLE_API_ID}:${process.env.WIGLE_API_KEY}`
    ).toString('base64')}`
  }
});

router.post('/search', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const data = WigleSearchSchema.parse(req.body);

    const params: any = {
      onlymine: false,
      freenet: false,
      paynet: false,
      latrange1: data.latitude - (data.radius / 111),
      latrange2: data.latitude + (data.radius / 111),
      longrange1: data.longitude - (data.radius / (111 * Math.cos(data.latitude * Math.PI / 180))),
      longrange2: data.longitude + (data.radius / (111 * Math.cos(data.latitude * Math.PI / 180)))
    };

    if (data.ssid) {
      params.ssid = data.ssid;
    }

    const response = await wigleApi.get('/network/search', { params });

    if (!response.data.success) {
      throw new AppError('WiGLE API error', 500);
    }

    const networks = response.data.results || [];
    const db = getDatabase();

    const formattedNetworks = networks.map((network: any) => ({
      ssid: network.ssid,
      bssid: network.netid,
      securityType: network.encryption,
      isOpen: network.encryption === 'Open',
      latitude: network.trilat,
      longitude: network.trilong,
      lastSeen: network.lasttime,
      channel: network.channel,
      qos: network.qos,
      manufacturer: network.dhcp || null,
      accuracy: network.accuracy || null
    }));

    for (const network of formattedNetworks) {
      // Skip networks without SSID
      if (!network.ssid || network.ssid === '') {
        continue;
      }

      await db('access_points')
        .insert({
          ssid: network.ssid,
          bssid: network.bssid,
          security_type: network.securityType,
          is_open: network.isOpen,
          latitude: network.latitude,
          longitude: network.longitude,
          location: db.raw('ST_MakePoint(?, ?)', [network.longitude, network.latitude]),
          last_seen: network.lastSeen,
          created_by: req.user?.id || null,
          organization_id: req.user?.organizationId || null
        })
        .onConflict(['ssid', 'bssid', 'latitude', 'longitude'])
        .merge({
          last_seen: network.lastSeen,
          updated_at: db.fn.now()
        });
    }

    res.json({
      success: true,
      count: formattedNetworks.length,
      networks: formattedNetworks
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('WiGLE API Error:', error.response?.data);
      throw new AppError('Failed to fetch from WiGLE API', 500);
    }
    next(error);
  }
});

router.get('/statistics', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const response = await wigleApi.get('/stats/site');

    if (!response.data.success) {
      throw new AppError('WiGLE API error', 500);
    }

    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('WiGLE API Error:', error.response?.data);
      throw new AppError('Failed to fetch WiGLE statistics', 500);
    }
    next(error);
  }
});

export default router;