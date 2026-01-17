/**
 * Global Error Handler Middleware
 * Transforms errors into consistent API responses
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../../config/environment';

export interface ApiError extends Error {
    statusCode?: number;
    code?: string;
    details?: unknown;
}

export class AppError extends Error implements ApiError {
    statusCode: number;
    code: string;
    details?: unknown;

    constructor(
        message: string,
        statusCode: number = 500,
        code: string = 'INTERNAL_ERROR',
        details?: unknown
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Common error factories
export const errors = {
    notFound: (resource: string) =>
        new AppError(`${resource} not found`, 404, 'NOT_FOUND'),

    unauthorized: (message = 'Unauthorized') =>
        new AppError(message, 401, 'UNAUTHORIZED'),

    forbidden: (message = 'Forbidden') =>
        new AppError(message, 403, 'FORBIDDEN'),

    badRequest: (message: string, details?: unknown) =>
        new AppError(message, 400, 'BAD_REQUEST', details),

    conflict: (message: string) =>
        new AppError(message, 409, 'CONFLICT'),

    capacityExceeded: (details: unknown) =>
        new AppError('Pitch capacity exceeded', 422, 'CAPACITY_EXCEEDED', details),

    ipAirlockBlocked: (reason: string) =>
        new AppError('IP Agreement required', 403, 'IP_AIRLOCK_BLOCKED', { reason }),

    andonActive: () =>
        new AppError('System in Andon state - deployments blocked', 503, 'ANDON_ACTIVE'),
};

export function errorHandler(
    err: ApiError,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    // Handle Zod validation errors
    if (err instanceof ZodError) {
        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request data',
                details: err.errors,
            },
        });
        return;
    }

    // Handle known application errors
    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';

    // Log error in dev
    if (config.isDev) {
        console.error('Error:', err);
    }

    const errorResponse: Record<string, unknown> = {
        code,
        message: err.message,
    };

    if (config.isDev && err.details) {
        errorResponse.details = err.details;
    }
    if (config.isDev) {
        errorResponse.stack = err.stack;
    }

    res.status(statusCode).json({
        success: false,
        error: errorResponse,
    });
}
