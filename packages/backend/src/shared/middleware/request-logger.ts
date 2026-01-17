/**
 * Request Logger Middleware
 * Logs incoming requests for debugging
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../../config/environment';

export function requestLogger(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    if (!config.isDev) {
        return next();
    }

    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const statusColor =
            status >= 500 ? '\x1b[31m' : // Red
                status >= 400 ? '\x1b[33m' : // Yellow
                    status >= 300 ? '\x1b[36m' : // Cyan
                        '\x1b[32m'; // Green

        console.log(
            `${statusColor}${status}\x1b[0m ${req.method} ${req.path} - ${duration}ms`
        );
    });

    next();
}
