import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getDatabase } from '../db/connection';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(100),
  password: z.string().min(8),
  organizationSlug: z.string().optional()
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

router.post('/register', async (req, res, next) => {
  try {
    const { email, username, password, organizationSlug } = RegisterSchema.parse(req.body);
    const db = getDatabase();

    const existingUser = await db('users')
      .where('email', email)
      .orWhere('username', username)
      .first();

    if (existingUser) {
      throw new AppError('User already exists', 400);
    }

    let organizationId = null;
    if (organizationSlug) {
      const org = await db('organizations')
        .where('slug', organizationSlug)
        .first();
      if (org) {
        organizationId = org.id;
      }
    }

    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '10'));

    const [user] = await db('users')
      .insert({
        email,
        username,
        password_hash: passwordHash,
        organization_id: organizationId
      })
      .returning(['id', 'email', 'username', 'organization_id']);

    const token = jwt.sign(
      { id: user.id, email: user.email, organizationId: user.organization_id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        organizationId: user.organization_id
      },
      token
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    const db = getDatabase();

    const user = await db('users')
      .where('email', email)
      .first();

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, organizationId: user.organization_id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        organizationId: user.organization_id
      },
      token
    });
  } catch (error) {
    next(error);
  }
});

export default router;