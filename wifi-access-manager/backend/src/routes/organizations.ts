import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getDatabase } from '../db/connection';

const router = Router();

const CreateOrganizationSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z.string().min(2).max(255).regex(/^[a-z0-9-]+$/)
});

router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const data = CreateOrganizationSchema.parse(req.body);
    const db = getDatabase();

    const existing = await db('organizations')
      .where('slug', data.slug)
      .first();

    if (existing) {
      throw new AppError('Organization slug already exists', 400);
    }

    const [organization] = await db('organizations')
      .insert({
        name: data.name,
        slug: data.slug
      })
      .returning('*');

    await db('users')
      .where('id', req.user!.id)
      .update({ organization_id: organization.id });

    res.status(201).json(organization);
  } catch (error) {
    next(error);
  }
});

router.get('/mine', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const db = getDatabase();

    if (!req.user!.organizationId) {
      res.json(null);
      return;
    }

    const organization = await db('organizations')
      .where('id', req.user!.organizationId)
      .first();

    const memberCount = await db('users')
      .where('organization_id', req.user!.organizationId)
      .count('* as count')
      .first();

    const accessPointCount = await db('access_points')
      .where('organization_id', req.user!.organizationId)
      .count('* as count')
      .first();

    res.json({
      ...organization,
      memberCount: memberCount?.count || 0,
      accessPointCount: accessPointCount?.count || 0
    });
  } catch (error) {
    next(error);
  }
});

router.post('/join', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { slug } = req.body;

    if (!slug) {
      throw new AppError('Organization slug is required', 400);
    }

    const db = getDatabase();

    const organization = await db('organizations')
      .where('slug', slug)
      .first();

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    await db('users')
      .where('id', req.user!.id)
      .update({ organization_id: organization.id });

    res.json({
      success: true,
      organization
    });
  } catch (error) {
    next(error);
  }
});

router.post('/leave', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const db = getDatabase();

    await db('users')
      .where('id', req.user!.id)
      .update({ organization_id: null });

    res.json({
      success: true
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:slug/access-points', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { slug } = req.params;
    const db = getDatabase();

    const organization = await db('organizations')
      .where('slug', slug)
      .first();

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    if (organization.id !== req.user!.organizationId) {
      throw new AppError('Unauthorized', 403);
    }

    const accessPoints = await db('access_points')
      .where('organization_id', organization.id)
      .orderBy('created_at', 'desc');

    res.json(accessPoints);
  } catch (error) {
    next(error);
  }
});

export default router;