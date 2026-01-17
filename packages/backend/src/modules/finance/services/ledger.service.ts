/**
 * Live Ledger Service - Real-time Financial Integration
 * Integrates with Plaid for bank feeds and transaction categorization
 * 
 * CEO Review: COGS vs OPEX distinction critical for Gross Margin
 */

import { prisma } from '../../../config/database';
import type { Transaction, TransactionCategory, CostType } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface PlaidTransaction {
    transaction_id: string;
    account_id: string;
    amount: number;
    date: string;
    name: string;
    merchant_name?: string;
    category: string[];
    pending: boolean;
}

export interface TransactionInput {
    organizationId: string;
    plaidTransactionId?: string;
    accountId?: string;
    date: Date;
    description: string;
    amount: number;
    currency?: string;
    category: TransactionCategory;
    subcategory?: string;
    costType?: CostType;
}

export interface GrossMarginMetrics {
    revenue: number;
    cogs: number;
    grossProfit: number;
    grossMarginPercent: number;
    breakdown: {
        hosting: number;
        support: number;
        thirdParty: number;
    };
}

export interface CategorySuggestion {
    category: TransactionCategory;
    costType?: CostType;
    confidence: number;
    reasoning: string;
}

// ═══════════════════════════════════════════════════════════════════
// ML-BASED CATEGORIZATION RULES
// Per CEO: Critical to distinguish COGS from OPEX for accurate margins
// ═══════════════════════════════════════════════════════════════════

const CATEGORY_PATTERNS: Array<{
    pattern: RegExp;
    category: TransactionCategory;
    costType?: CostType;
    confidence: number;
}> = [
        // COGS - Hosting (AWS, GCP, Azure, etc.)
        { pattern: /amazon web services|aws|google cloud|gcp|azure|digitalocean|heroku|vercel|netlify|cloudflare/i, category: 'COGS', costType: 'COGS_HOSTING', confidence: 0.95 },
        { pattern: /mongodb|redis|elasticsearch|database|db hosting/i, category: 'COGS', costType: 'COGS_HOSTING', confidence: 0.9 },

        // COGS - Support
        { pattern: /zendesk|intercom|freshdesk|helpscout|support|customer service/i, category: 'COGS', costType: 'COGS_SUPPORT', confidence: 0.85 },

        // COGS - Third Party APIs
        { pattern: /stripe|plaid|twilio|sendgrid|mailchimp|segment|mixpanel/i, category: 'COGS', costType: 'COGS_THIRD_PARTY', confidence: 0.9 },

        // OPEX - Marketing
        { pattern: /google ads|facebook ads|linkedin ads|twitter ads|marketing|advertising|hubspot|marketo/i, category: 'OPEX', costType: 'OPEX_MARKETING', confidence: 0.9 },
        { pattern: /conference|sponsorship|swag|promotional/i, category: 'OPEX', costType: 'OPEX_MARKETING', confidence: 0.8 },

        // OPEX - Sales
        { pattern: /salesforce|pipedrive|close\.io|sales commission|sales tools/i, category: 'OPEX', costType: 'OPEX_SALES', confidence: 0.85 },

        // OPEX - R&D
        { pattern: /github|gitlab|jira|confluence|figma|notion|linear|slack/i, category: 'OPEX', costType: 'OPEX_RD', confidence: 0.85 },

        // OPEX - G&A
        { pattern: /rent|office|utilities|insurance|legal|accounting|gusto|rippling|payroll/i, category: 'OPEX', costType: 'OPEX_GA', confidence: 0.9 },

        // Payroll
        { pattern: /salary|wages|payroll|compensation/i, category: 'PAYROLL', confidence: 0.95 },

        // Revenue
        { pattern: /stripe payout|revenue|payment received|sales deposit/i, category: 'REVENUE', confidence: 0.9 },

        // Tax
        { pattern: /irs|tax payment|state tax|federal tax/i, category: 'TAX', confidence: 0.95 },

        // Transfer
        { pattern: /transfer|wire|ach transfer/i, category: 'TRANSFER', confidence: 0.8 },
    ];

// ═══════════════════════════════════════════════════════════════════
// LEDGER SERVICE
// ═══════════════════════════════════════════════════════════════════

export class LedgerService {
    /**
     * Categorize a transaction using ML-like pattern matching
     * Returns suggested category with confidence score
     */
    categorizeTransaction(description: string, amount: number): CategorySuggestion {
        const normalizedDesc = description.toLowerCase();

        // Check against patterns
        for (const rule of CATEGORY_PATTERNS) {
            if (rule.pattern.test(normalizedDesc)) {
                return {
                    category: rule.category,
                    costType: rule.costType,
                    confidence: rule.confidence,
                    reasoning: `Matched pattern: ${rule.pattern.source}`,
                };
            }
        }

        // Default based on amount direction
        if (amount > 0) {
            return {
                category: 'REVENUE',
                confidence: 0.5,
                reasoning: 'Positive amount assumed as revenue',
            };
        }

        return {
            category: 'OTHER',
            confidence: 0.3,
            reasoning: 'No pattern matched, manual review required',
        };
    }

    /**
     * Import transactions from Plaid webhook
     */
    async importPlaidTransactions(
        organizationId: string,
        transactions: PlaidTransaction[]
    ): Promise<{ imported: number; skipped: number; errors: string[] }> {
        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const plaidTx of transactions) {
            try {
                // Skip pending transactions
                if (plaidTx.pending) {
                    skipped++;
                    continue;
                }

                // Check if already imported
                const existing = await prisma.transaction.findUnique({
                    where: { plaidTransactionId: plaidTx.transaction_id },
                });

                if (existing) {
                    skipped++;
                    continue;
                }

                // Auto-categorize
                const suggestion = this.categorizeTransaction(
                    plaidTx.merchant_name || plaidTx.name,
                    plaidTx.amount
                );

                // Create transaction
                await prisma.transaction.create({
                    data: {
                        organizationId,
                        plaidTransactionId: plaidTx.transaction_id,
                        accountId: plaidTx.account_id,
                        date: new Date(plaidTx.date),
                        description: plaidTx.merchant_name || plaidTx.name,
                        amount: Math.abs(plaidTx.amount) * (plaidTx.amount > 0 ? -1 : 1), // Plaid uses negative for credits
                        currency: 'USD',
                        category: suggestion.category,
                        subcategory: plaidTx.category?.[0],
                        costType: suggestion.costType,
                        isAutoCategorized: true,
                        confidenceScore: suggestion.confidence,
                    },
                });

                imported++;
            } catch (error) {
                errors.push(`Failed to import ${plaidTx.transaction_id}: ${error}`);
            }
        }

        return { imported, skipped, errors };
    }

    /**
     * Create a manual transaction
     */
    async createTransaction(input: TransactionInput): Promise<Transaction> {
        return prisma.transaction.create({
            data: {
                organizationId: input.organizationId,
                plaidTransactionId: input.plaidTransactionId,
                accountId: input.accountId,
                date: input.date,
                description: input.description,
                amount: input.amount,
                currency: input.currency ?? 'USD',
                category: input.category,
                subcategory: input.subcategory,
                costType: input.costType,
                isAutoCategorized: false,
            },
        });
    }

    /**
     * Update transaction category (manual override)
     */
    async updateCategory(
        transactionId: string,
        category: TransactionCategory,
        costType?: CostType
    ): Promise<Transaction> {
        return prisma.transaction.update({
            where: { id: transactionId },
            data: {
                category,
                costType,
                isAutoCategorized: false,
            },
        });
    }

    /**
     * Calculate Gross Margin
     * Per CEO: Critical for understanding true unit economics
     */
    async calculateGrossMargin(
        organizationId: string,
        startDate: Date,
        endDate: Date
    ): Promise<GrossMarginMetrics> {
        const transactions = await prisma.transaction.findMany({
            where: {
                organizationId,
                date: { gte: startDate, lte: endDate },
                category: { in: ['REVENUE', 'COGS'] },
            },
        });

        let revenue = 0;
        let cogsHosting = 0;
        let cogsSupport = 0;
        let cogsThirdParty = 0;

        for (const tx of transactions) {
            const amount = Math.abs(Number(tx.amount));

            if (tx.category === 'REVENUE') {
                revenue += amount;
            } else if (tx.category === 'COGS') {
                switch (tx.costType) {
                    case 'COGS_HOSTING':
                        cogsHosting += amount;
                        break;
                    case 'COGS_SUPPORT':
                        cogsSupport += amount;
                        break;
                    case 'COGS_THIRD_PARTY':
                        cogsThirdParty += amount;
                        break;
                    default:
                        cogsHosting += amount; // Default to hosting
                }
            }
        }

        const totalCogs = cogsHosting + cogsSupport + cogsThirdParty;
        const grossProfit = revenue - totalCogs;
        const grossMarginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

        return {
            revenue: Math.round(revenue * 100) / 100,
            cogs: Math.round(totalCogs * 100) / 100,
            grossProfit: Math.round(grossProfit * 100) / 100,
            grossMarginPercent: Math.round(grossMarginPercent * 10) / 10,
            breakdown: {
                hosting: Math.round(cogsHosting * 100) / 100,
                support: Math.round(cogsSupport * 100) / 100,
                thirdParty: Math.round(cogsThirdParty * 100) / 100,
            },
        };
    }

    /**
     * Get transactions with filters
     */
    async getTransactions(
        organizationId: string,
        options: {
            startDate?: Date;
            endDate?: Date;
            category?: TransactionCategory;
            costType?: CostType;
            limit?: number;
            offset?: number;
        } = {}
    ): Promise<{ transactions: Transaction[]; total: number }> {
        const where = {
            organizationId,
            ...(options.startDate && options.endDate && {
                date: { gte: options.startDate, lte: options.endDate },
            }),
            ...(options.category && { category: options.category }),
            ...(options.costType && { costType: options.costType }),
        };

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                orderBy: { date: 'desc' },
                take: options.limit ?? 50,
                skip: options.offset ?? 0,
            }),
            prisma.transaction.count({ where }),
        ]);

        return { transactions, total };
    }

    /**
     * Get monthly spending breakdown by category
     */
    async getMonthlyBreakdown(
        organizationId: string,
        months: number = 6
    ): Promise<Array<{
        month: string;
        revenue: number;
        cogs: number;
        opex: number;
        payroll: number;
        other: number;
    }>> {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);
        startDate.setDate(1);

        const transactions = await prisma.transaction.findMany({
            where: {
                organizationId,
                date: { gte: startDate },
            },
            orderBy: { date: 'asc' },
        });

        // Group by month
        const monthlyData = new Map<string, {
            revenue: number;
            cogs: number;
            opex: number;
            payroll: number;
            other: number;
        }>();

        for (const tx of transactions) {
            const monthKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
            const amount = Math.abs(Number(tx.amount));

            if (!monthlyData.has(monthKey)) {
                monthlyData.set(monthKey, { revenue: 0, cogs: 0, opex: 0, payroll: 0, other: 0 });
            }

            const data = monthlyData.get(monthKey)!;

            switch (tx.category) {
                case 'REVENUE':
                    data.revenue += amount;
                    break;
                case 'COGS':
                    data.cogs += amount;
                    break;
                case 'OPEX':
                    data.opex += amount;
                    break;
                case 'PAYROLL':
                    data.payroll += amount;
                    break;
                default:
                    data.other += amount;
            }
        }

        return Array.from(monthlyData.entries()).map(([month, data]) => ({
            month,
            revenue: Math.round(data.revenue),
            cogs: Math.round(data.cogs),
            opex: Math.round(data.opex),
            payroll: Math.round(data.payroll),
            other: Math.round(data.other),
        }));
    }
}

export const ledgerService = new LedgerService();
