import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getDatabase } from '../db/connection';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Get user's favorite access points
router.get('/favorites', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const db = getDatabase();

    const favorites = await db('user_favorites')
      .join('access_points', 'user_favorites.access_point_id', 'access_points.id')
      .where('user_favorites.user_id', req.user!.id)
      .select('access_points.*')
      .orderBy('user_favorites.created_at', 'desc');

    res.json(favorites);
  } catch (error) {
    next(error);
  }
});

// Add access point to favorites
router.post('/favorites/:accessPointId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { accessPointId } = req.params;
    const db = getDatabase();

    // Check if already favorited
    const existing = await db('user_favorites')
      .where({
        user_id: req.user!.id,
        access_point_id: accessPointId
      })
      .first();

    if (existing) {
      throw new AppError('Already in favorites', 400);
    }

    await db('user_favorites').insert({
      user_id: req.user!.id,
      access_point_id: accessPointId
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Remove access point from favorites
router.delete('/favorites/:accessPointId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { accessPointId } = req.params;
    const db = getDatabase();

    await db('user_favorites')
      .where({
        user_id: req.user!.id,
        access_point_id: accessPointId
      })
      .delete();

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get user's recent activity
router.get('/activity', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const db = getDatabase();
    const userId = req.user!.id;

    // Get recent activities (access points added, ratings, speed tests)
    const activities = [];

    // Recent access points added
    const recentAPs = await db('access_points')
      .where('created_by', userId)
      .orderBy('created_at', 'desc')
      .limit(5)
      .select('ssid', 'created_at');

    recentAPs.forEach(ap => {
      activities.push({
        type: 'access_point_added',
        description: `Added access point: ${ap.ssid}`,
        created_at: ap.created_at
      });
    });

    // Recent ratings
    const recentRatings = await db('ratings')
      .join('access_points', 'ratings.access_point_id', 'access_points.id')
      .where('ratings.user_id', userId)
      .orderBy('ratings.created_at', 'desc')
      .limit(5)
      .select('access_points.ssid', 'ratings.overall_rating', 'ratings.created_at');

    recentRatings.forEach(rating => {
      activities.push({
        type: 'rating_added',
        description: `Rated ${rating.ssid}: ${rating.overall_rating} stars`,
        created_at: rating.created_at
      });
    });

    // Recent speed tests
    const recentTests = await db('speed_tests')
      .join('access_points', 'speed_tests.access_point_id', 'access_points.id')
      .where('speed_tests.user_id', userId)
      .orderBy('speed_tests.tested_at', 'desc')
      .limit(5)
      .select('access_points.ssid', 'speed_tests.download_speed', 'speed_tests.tested_at');

    recentTests.forEach(test => {
      activities.push({
        type: 'speed_test',
        description: `Speed test on ${test.ssid}: ${Number(test.download_speed).toFixed(1)} Mbps`,
        created_at: test.tested_at
      });
    });

    // Sort all activities by date
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json(activities.slice(0, 10));
  } catch (error) {
    next(error);
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const db = getDatabase();

    const user = await db('users')
      .where('id', req.user!.id)
      .select('id', 'email', 'username', 'organization_id', 'created_at')
      .first();

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Get statistics
    const [accessPointCount] = await db('access_points')
      .where('created_by', req.user!.id)
      .count('* as count');

    const [ratingCount] = await db('ratings')
      .where('user_id', req.user!.id)
      .count('* as count');

    const [speedTestCount] = await db('speed_tests')
      .where('user_id', req.user!.id)
      .count('* as count');

    const [favoriteCount] = await db('user_favorites')
      .where('user_id', req.user!.id)
      .count('* as count');

    res.json({
      ...user,
      stats: {
        access_points_added: parseInt(accessPointCount?.count as string) || 0,
        ratings_given: parseInt(ratingCount?.count as string) || 0,
        speed_tests_run: parseInt(speedTestCount?.count as string) || 0,
        favorites: parseInt(favoriteCount?.count as string) || 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { username } = req.body;
    const db = getDatabase();

    if (!username) {
      throw new AppError('Username is required', 400);
    }

    // Check if username is taken
    const existing = await db('users')
      .where('username', username)
      .whereNot('id', req.user!.id)
      .first();

    if (existing) {
      throw new AppError('Username already taken', 400);
    }

    await db('users')
      .where('id', req.user!.id)
      .update({ username });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;