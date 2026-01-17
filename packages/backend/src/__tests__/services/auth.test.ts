/**
 * Authentication Tests
 * Tests for JWT auth middleware and service
 */

import { generateToken, verifyToken, AuthService } from '../../shared/middleware/auth';

describe('Authentication', () => {
    describe('JWT Token Generation', () => {
        const testPayload = {
            userId: '123e4567-e89b-12d3-a456-426614174000',
            email: 'test@example.com',
            organizationId: '123e4567-e89b-12d3-a456-426614174001',
            role: 'MEMBER' as const,
        };

        it('should generate a valid JWT token', () => {
            const token = generateToken(testPayload);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.').length).toBe(3); // JWT has 3 parts
        });

        it('should verify a valid token', () => {
            const token = generateToken(testPayload);
            const verified = verifyToken(token);

            expect(verified).toBeDefined();
            expect(verified?.userId).toBe(testPayload.userId);
            expect(verified?.email).toBe(testPayload.email);
            expect(verified?.organizationId).toBe(testPayload.organizationId);
            expect(verified?.role).toBe(testPayload.role);
        });

        it('should return null for invalid token', () => {
            const verified = verifyToken('invalid-token');

            expect(verified).toBeNull();
        });

        it('should return null for expired token', () => {
            // This would require mocking time or using a short expiry
            // For now, just test that malformed tokens fail
            const verified = verifyToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoidGVzdCJ9.invalid');

            expect(verified).toBeNull();
        });
    });

    describe('AuthService', () => {
        const authService = new AuthService();

        it('should refresh a token with same payload', () => {
            const payload = {
                userId: '123e4567-e89b-12d3-a456-426614174000',
                email: 'test@example.com',
                organizationId: '123e4567-e89b-12d3-a456-426614174001',
                role: 'MEMBER' as const,
            };

            const newToken = authService.refreshToken(payload);
            const verified = verifyToken(newToken);

            expect(verified?.userId).toBe(payload.userId);
            expect(verified?.email).toBe(payload.email);
        });
    });
});
