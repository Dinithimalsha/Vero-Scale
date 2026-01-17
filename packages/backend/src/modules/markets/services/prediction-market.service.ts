import { prisma } from '../../../shared/prisma';
// import { PredictionMarket, MarketTrade, MarketUserBalance } from '@prisma/client'; // Removed due to IDE resolution issue

export interface PredictionMarket {
    id: string;
    organizationId: string;
    question: string;
    description: string | null;
    oracleType: string;
    oracleSourceUrl: string | null;
    resolutionLogic: string | null;
    expiryTimestamp: Date;
    liquidityParameter: number;
    status: string;
    resolvedOutcome: string | null;
    yesTokens: number;
    noTokens: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface MarketTrade {
    id: string;
    marketId: string;
    buyerId: string;
    outcome: string;
    price: number;
    quantity: number;
    usdAmount: number;
    executionTime: Date;
}

export interface MarketUserBalance {
    id: string;
    userId: string;
    marketId: string;
    yesShares: number;
    noShares: number;
    usdBalance: number;
    createdAt: Date;
    updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════
// TYPES (Re-exporting from Prisma where possible, or adapting)
// ═══════════════════════════════════════════════════════════════════

export type OracleType = 'JIRA_TICKET' | 'STRIPE_REVENUE' | 'GITHUB_RELEASE' | 'MANUAL' | 'CUSTOM_WEBHOOK';
export type Outcome = 'YES' | 'NO';
export type MarketStatus = 'OPEN' | 'CLOSED' | 'RESOLVED';

export interface MarketPool {
    marketId: string;
    yesTokens: number;
    noTokens: number;
    k: number;
}

export interface MarketPrice {
    marketId: string;
    yesPrice: number;
    noPrice: number;
    volume24h: number;
    lastTradeTime?: Date;
}

// ═══════════════════════════════════════════════════════════════════
// CPMM ALGORITHM (Section 3.3 - Constant Product Market Maker)
// ═══════════════════════════════════════════════════════════════════

export class CPMMEngine {
    calculateYesPrice(pool: MarketPool): number {
        const total = pool.yesTokens + pool.noTokens;
        return pool.noTokens / total;
    }

    calculateNoPrice(pool: MarketPool): number {
        return 1 - this.calculateYesPrice(pool);
    }

    calculateSharesForUsd(
        pool: MarketPool,
        outcome: Outcome,
        usdAmount: number
    ): { shares: number; newPool: MarketPool; avgPrice: number } {
        const k = pool.yesTokens * pool.noTokens;

        if (outcome === 'YES') {
            const newYes = pool.yesTokens + usdAmount;
            const newNo = k / newYes;
            const sharesReceived = pool.noTokens - newNo;
            const avgPrice = usdAmount / sharesReceived;

            return {
                shares: sharesReceived,
                newPool: { ...pool, yesTokens: newYes, noTokens: newNo },
                avgPrice,
            };
        } else {
            const newNo = pool.noTokens + usdAmount;
            const newYes = k / newNo;
            const sharesReceived = pool.yesTokens - newYes;
            const avgPrice = usdAmount / sharesReceived;

            return {
                shares: sharesReceived,
                newPool: { ...pool, yesTokens: newYes, noTokens: newNo },
                avgPrice,
            };
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// PREDICTION MARKET SERVICE (Prisma Implementation)
// ═══════════════════════════════════════════════════════════════════

export class PredictionMarketService {
    private cpmm = new CPMMEngine();

    async createMarket(
        organizationId: string,
        question: string,
        expiryTimestamp: Date,
        options: {
            description?: string;
            oracleType?: OracleType;
            oracleSourceUrl?: string;
            resolutionLogic?: string;
            initialLiquidity?: number;
        } = {}
    ): Promise<PredictionMarket> {
        const initialLiquidity = options.initialLiquidity || 1000;

        return (prisma as any).predictionMarket.create({
            data: {
                organizationId,
                question,
                description: options.description,
                oracleType: options.oracleType || 'MANUAL',
                oracleSourceUrl: options.oracleSourceUrl,
                resolutionLogic: options.resolutionLogic,
                expiryTimestamp,
                liquidityParameter: initialLiquidity,
                status: 'OPEN',
                yesTokens: initialLiquidity,
                noTokens: initialLiquidity,
            },
        });
    }

    async getMarketPrice(marketId: string): Promise<MarketPrice> {
        const market = await (prisma as any).predictionMarket.findUnique({
            where: { id: marketId },
        });

        if (!market) {
            throw new Error(`Market ${marketId} not found`);
        }

        const pool: MarketPool = {
            marketId: market.id,
            yesTokens: market.yesTokens,
            noTokens: market.noTokens,
            k: market.yesTokens * market.noTokens,
        };

        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const trades = await (prisma as any).marketTrade.findMany({
            where: {
                marketId,
                executionTime: { gte: yesterday },
            },
            orderBy: { executionTime: 'desc' },
        });

        const volume24h = trades.reduce((sum: number, t: any) => sum + t.usdAmount, 0);

        return {
            marketId,
            yesPrice: this.cpmm.calculateYesPrice(pool),
            noPrice: this.cpmm.calculateNoPrice(pool),
            volume24h,
            lastTradeTime: trades[0]?.executionTime,
        };
    }

    async buyShares(
        marketId: string,
        userId: string,
        outcome: Outcome,
        usdAmount: number
    ): Promise<MarketTrade> {
        // Run in a transaction to ensure CPMM invariant is maintained
        return prisma.$transaction(async (tx) => {
            const market = await tx.predictionMarket.findUnique({
                where: { id: marketId },
            });

            if (!market) throw new Error(`Market ${marketId} not found`);
            if (market.status !== 'OPEN') throw new Error('Market is not open for trading');

            const pool: MarketPool = {
                marketId: market.id,
                yesTokens: market.yesTokens,
                noTokens: market.noTokens,
                k: market.yesTokens * market.noTokens,
            };

            const { shares, newPool, avgPrice } = this.cpmm.calculateSharesForUsd(
                pool,
                outcome,
                usdAmount
            );

            // Update user balance (upsert)
            const balanceKey = { userId, marketId }; // This depends on your composite key in schema
            // Since Prisma might not support composite unique in 'where' for upsert automatically effectively if not defined as @@unique nicely in type
            // But we defined @@unique([userId, marketId]) in schema.

            const balance = await tx.marketUserBalance.findUnique({
                where: { userId_marketId: { userId, marketId } }
            });

            if (balance) {
                await tx.marketUserBalance.update({
                    where: { id: balance.id },
                    data: {
                        yesShares: outcome === 'YES' ? { increment: shares } : undefined,
                        noShares: outcome === 'NO' ? { increment: shares } : undefined,
                    }
                });
            } else {
                await tx.marketUserBalance.create({
                    data: {
                        userId,
                        marketId,
                        yesShares: outcome === 'YES' ? shares : 0,
                        noShares: outcome === 'NO' ? shares : 0,
                        usdBalance: 1000, // Default seed balance
                    }
                });
            }

            // Create trade record
            const trade = await tx.marketTrade.create({
                data: {
                    marketId,
                    buyerId: userId,
                    outcome,
                    price: avgPrice,
                    quantity: shares,
                    usdAmount,
                },
            });

            // Update market pool
            await tx.predictionMarket.update({
                where: { id: marketId },
                data: {
                    yesTokens: newPool.yesTokens,
                    noTokens: newPool.noTokens,
                },
            });

            return trade;
        });
    }

    async getUserPosition(userId: string, marketId: string): Promise<MarketUserBalance> {
        const balance = await (prisma as any).marketUserBalance.findUnique({
            where: { userId_marketId: { userId, marketId } },
        });

        if (!balance) {
            // Return a default structure (mocking the DB object)
            return {
                id: 'virtual',
                userId,
                marketId,
                yesShares: 0,
                noShares: 0,
                usdBalance: 1000,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        }

        return balance;
    }

    async listMarkets(
        organizationId: string,
        status?: MarketStatus
    ): Promise<Array<PredictionMarket & { currentPrice: MarketPrice }>> {
        const markets = await (prisma as any).predictionMarket.findMany({
            where: {
                organizationId,
                status: status as string, // Cast if needed, or Prisma types match
            },
            orderBy: { expiryTimestamp: 'asc' },
        });

        return Promise.all(
            markets.map(async (m: any) => {
                const price = await this.getMarketPrice(m.id);
                return { ...m, currentPrice: price };
            })
        );
    }

    async resolveMarket(marketId: string, outcome: Outcome): Promise<void> {
        await prisma.$transaction(async (tx) => {
            const market = await tx.predictionMarket.findUnique({
                where: { id: marketId },
            });

            if (!market) throw new Error(`Market ${marketId} not found`);
            if (market.status === 'RESOLVED') throw new Error('Market already resolved');

            // 1. Mark market as resolved
            await tx.predictionMarket.update({
                where: { id: marketId },
                data: {
                    status: 'RESOLVED',
                    resolvedOutcome: outcome,
                },
            });

            // 2. Settle all positions
            const balances = await tx.marketUserBalance.findMany({
                where: { marketId },
            });

            for (const balance of balances) {
                const winningShares = outcome === 'YES' ? balance.yesShares : balance.noShares;
                if (winningShares > 0) {
                    await tx.marketUserBalance.update({
                        where: { id: balance.id },
                        data: {
                            usdBalance: { increment: winningShares }, // 1 share = $1 payout
                            yesShares: 0,
                            noShares: 0,
                        },
                    });
                } else {
                    // Reset losing shares too
                    await tx.marketUserBalance.update({
                        where: { id: balance.id },
                        data: {
                            yesShares: 0,
                            noShares: 0,
                        },
                    });
                }
            }
        });
    }

    async checkOracleConditions(marketId: string): Promise<{
        shouldResolve: boolean;
        suggestedOutcome?: Outcome;
        reason?: string;
    }> {
        const market = await (prisma as any).predictionMarket.findUnique({ where: { id: marketId } });

        if (!market) throw new Error(`Market ${marketId} not found`);
        if (market.status !== 'OPEN') return { shouldResolve: false };

        if (new Date() >= market.expiryTimestamp) {
            return {
                shouldResolve: true,
                reason: 'Market expired, awaiting oracle resolution',
            };
        }

        return { shouldResolve: false };
    }

    async getProbabilityForecast(marketId: string): Promise<{
        probability: number;
        confidence: number;
        tradingVolume: number;
        question: string;
    }> {
        const market = await (prisma as any).predictionMarket.findUnique({ where: { id: marketId } });
        if (!market) throw new Error(`Market ${marketId} not found`);

        const price = await this.getMarketPrice(marketId);
        const confidence = Math.min(1, price.volume24h / 10000);

        return {
            probability: price.yesPrice,
            confidence,
            tradingVolume: price.volume24h,
            question: market.question,
        };
    }
}

export const predictionMarketService = new PredictionMarketService();
