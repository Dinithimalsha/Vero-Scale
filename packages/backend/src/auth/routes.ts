/**
 * Authentication Routes
 * Login, register, refresh, and user info endpoints
 */

import { Router } from 'express';
import { z } from 'zod';
import { authService, authenticate, AuthenticatedRequest } from '../shared/middleware/auth';

const router = Router();

// Login
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const result = await authService.login(email, password);

        if (!result) {
            res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS',
            });
            return;
        }

        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

// Register
const registerSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    organizationId: z.string().uuid(),
    role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']).optional(),
});

router.post('/register', async (req, res, next) => {
    try {
        const input = registerSchema.parse(req.body);
        const result = await authService.register(
            input.email,
            input.name,
            input.organizationId,
            input.role as any
        );
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

// Get current user
router.get('/me', authenticate, async (req: AuthenticatedRequest, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }

        const user = await authService.getCurrentUser(req.user.userId);
        if (!user) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }

        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
});

// Refresh token
router.post('/refresh', authenticate, (req: AuthenticatedRequest, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
    }

    const token = authService.refreshToken(req.user);
    res.json({ success: true, data: { token } });
});

export { router as authRoutes };
