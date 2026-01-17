/**
 * Authentication & Authorization Middleware
 * JWT-based auth with role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import type { UserRole } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface JwtPayload {
    userId: string;
    email: string;
    organizationId: string;
    role: UserRole;
}

export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
}

// ═══════════════════════════════════════════════════════════════════
// JWT UTILITIES
// ═══════════════════════════════════════════════════════════════════

const JWT_SECRET = process.env.JWT_SECRET || 'veroscale-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';

export function generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════

/**
 * Authenticate request using JWT Bearer token
 */
export function authenticate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'UNAUTHORIZED',
        });
        return;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
        res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
            code: 'INVALID_TOKEN',
        });
        return;
    }

    req.user = payload;
    next();
}

/**
 * Require specific roles for access
 */
export function requireRoles(...allowedRoles: UserRole[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'UNAUTHORIZED',
            });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                code: 'FORBIDDEN',
                requiredRoles: allowedRoles,
            });
            return;
        }

        next();
    };
}

/**
 * Require organization membership
 */
export function requireOrganization(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void {
    const { organizationId } = req.params;

    if (!req.user) {
        res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'UNAUTHORIZED',
        });
        return;
    }

    // Admins can access any organization
    if (req.user.role === 'ADMIN') {
        next();
        return;
    }

    // Regular users can only access their own organization
    if (organizationId && organizationId !== req.user.organizationId) {
        res.status(403).json({
            success: false,
            error: 'Access denied to this organization',
            code: 'ORG_FORBIDDEN',
        });
        return;
    }

    next();
}

/**
 * Optional authentication (for public endpoints that benefit from auth)
 */
export function optionalAuth(
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = verifyToken(token);
        if (payload) {
            req.user = payload;
        }
    }

    next();
}

// ═══════════════════════════════════════════════════════════════════
// AUTH SERVICE
// ═══════════════════════════════════════════════════════════════════

export class AuthService {
    /**
     * Login with email (simplified - in production use proper password hashing)
     */
    async login(email: string, _password: string): Promise<{ token: string; user: JwtPayload } | null> {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { organization: true },
        });

        if (!user) {
            return null;
        }

        // In production: verify password with bcrypt
        // For dev, we accept any password

        const payload: JwtPayload = {
            userId: user.id,
            email: user.email,
            organizationId: user.organizationId,
            role: user.role,
        };

        return {
            token: generateToken(payload),
            user: payload,
        };
    }

    /**
     * Register new user
     */
    async register(
        email: string,
        name: string,
        organizationId: string,
        role: UserRole = 'MEMBER'
    ): Promise<{ token: string; user: JwtPayload }> {
        const user = await prisma.user.create({
            data: {
                email,
                name,
                organizationId,
                role,
            },
        });

        const payload: JwtPayload = {
            userId: user.id,
            email: user.email,
            organizationId: user.organizationId,
            role: user.role,
        };

        return {
            token: generateToken(payload),
            user: payload,
        };
    }

    /**
     * Get current user from token
     */
    async getCurrentUser(userId: string) {
        return prisma.user.findUnique({
            where: { id: userId },
            include: { organization: true },
        });
    }

    /**
     * Refresh token
     */
    refreshToken(payload: JwtPayload): string {
        return generateToken(payload);
    }
}

export const authService = new AuthService();
