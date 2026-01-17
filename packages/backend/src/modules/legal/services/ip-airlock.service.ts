/**
 * IP Airlock Service - Gatekeeper Pattern
 * Ensures all users have signed IP agreements before code access
 * 
 * CEO Review: Critical for protecting company IP
 */

import { prisma } from '../../../config/database';
import { IpAgreement, AgreementStatus, AgreementType } from '@prisma/client';
import { errors } from '../../../shared/middleware/error-handler';
import { Request, Response, NextFunction } from 'express';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface AccessCheck {
    allowed: boolean;
    reason?: 'NO_AGREEMENT' | 'AGREEMENT_NOT_SIGNED' | 'AGREEMENT_EXPIRED';
    action?: 'REDIRECT_TO_ONBOARDING' | 'REDIRECT_TO_SIGNATURE' | 'REDIRECT_TO_RENEWAL';
    docusignUrl?: string;
    agreementId?: string;
}

export interface CreateAgreementInput {
    userId: string;
    organizationId: string;
    documentType?: AgreementType;
    expirationDate?: Date;
}

// ═══════════════════════════════════════════════════════════════════
// IP AIRLOCK SERVICE
// ═══════════════════════════════════════════════════════════════════

export class IpAirlockService {
    /**
     * Check if user has valid IP agreement
     */
    async checkAccessPermission(userId: string): Promise<AccessCheck> {
        const agreement = await prisma.ipAgreement.findUnique({
            where: { userId },
        });

        if (!agreement) {
            return {
                allowed: false,
                reason: 'NO_AGREEMENT',
                action: 'REDIRECT_TO_ONBOARDING',
            };
        }

        if (agreement.status !== 'SIGNED') {
            return {
                allowed: false,
                reason: 'AGREEMENT_NOT_SIGNED',
                action: 'REDIRECT_TO_SIGNATURE',
                agreementId: agreement.id,
                // DocuSign URL would be generated here via integration
            };
        }

        if (agreement.expirationDate && agreement.expirationDate < new Date()) {
            return {
                allowed: false,
                reason: 'AGREEMENT_EXPIRED',
                action: 'REDIRECT_TO_RENEWAL',
                agreementId: agreement.id,
            };
        }

        return { allowed: true };
    }

    /**
     * Create pending agreement for user
     */
    async createAgreement(input: CreateAgreementInput): Promise<IpAgreement> {
        // Check if user already has an agreement
        const existing = await prisma.ipAgreement.findUnique({
            where: { userId: input.userId },
        });

        if (existing && existing.status === 'SIGNED') {
            throw errors.conflict('User already has a signed agreement');
        }

        // Upsert agreement
        return prisma.ipAgreement.upsert({
            where: { userId: input.userId },
            update: {
                documentType: input.documentType ?? 'PIIAA',
                status: 'PENDING',
                expirationDate: input.expirationDate,
            },
            create: {
                userId: input.userId,
                organizationId: input.organizationId,
                documentType: input.documentType ?? 'PIIAA',
                status: 'PENDING',
                expirationDate: input.expirationDate,
            },
        });
    }

    /**
     * Mark agreement as sent (via DocuSign)
     */
    async markAsSent(
        agreementId: string,
        docusignEnvelopeId: string
    ): Promise<IpAgreement> {
        return prisma.ipAgreement.update({
            where: { id: agreementId },
            data: {
                status: 'SENT',
                docusignEnvelopeId,
            },
        });
    }

    /**
     * Mark agreement as signed (webhook from DocuSign)
     */
    async markAsSigned(
        agreementId: string,
        documentUrl: string
    ): Promise<IpAgreement> {
        return prisma.ipAgreement.update({
            where: { id: agreementId },
            data: {
                status: 'SIGNED',
                signedDate: new Date(),
                documentUrl,
            },
        });
    }

    /**
     * Handle DocuSign webhook for signature completion
     */
    async handleDocuSignWebhook(envelopeId: string, documentUrl: string): Promise<IpAgreement | null> {
        const agreement = await prisma.ipAgreement.findFirst({
            where: { docusignEnvelopeId: envelopeId },
        });

        if (!agreement) {
            console.warn(`No agreement found for DocuSign envelope: ${envelopeId}`);
            return null;
        }

        return this.markAsSigned(agreement.id, documentUrl);
    }

    /**
     * Get all pending agreements for an organization
     */
    async getPendingAgreements(organizationId: string): Promise<IpAgreement[]> {
        return prisma.ipAgreement.findMany({
            where: {
                organizationId,
                status: { in: ['PENDING', 'SENT', 'VIEWED'] },
            },
            include: {
                user: { select: { id: true, name: true, email: true, role: true } },
            },
        });
    }

    /**
     * Revoke an agreement (e.g., when employee leaves)
     */
    async revokeAgreement(agreementId: string): Promise<IpAgreement> {
        return prisma.ipAgreement.update({
            where: { id: agreementId },
            data: { status: 'REVOKED' },
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // EXPRESS MIDDLEWARE
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Middleware to block access to protected resources
     * Per CEO: Implements the "Gatekeeper Pattern"
     */
    middleware = async (
        req: Request & { user?: { id: string } },
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
            return;
        }

        const access = await this.checkAccessPermission(userId);

        if (!access.allowed) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'IP_AIRLOCK_BLOCKED',
                    message: 'IP Agreement required to access code resources',
                    reason: access.reason,
                    action: access.action,
                    agreementId: access.agreementId,
                },
            });
            return;
        }

        next();
    };
}

export const ipAirlockService = new IpAirlockService();
