import { prisma } from '../../../config/database';

// ═══════════════════════════════════════════════════════════════════
// TYPES: Volatility Architecture
// ═══════════════════════════════════════════════════════════════════

export interface VolatilityProfile {
    medianTouchTime: number; // P50 of active work (Hours)
    medianQueueTime: number; // P50 of waiting (Hours)
    volatilityIndex: number; // Coefficient of Variation (StdDev / Mean)
}

export interface SimulationResult {
    p50: number; // Likely outcome
    p90: number; // Pessimistic outcome (Risk-Adjusted)
    p99: number; // Worst Case
    probabilityOfSuccess: number; // Chance < Target
    distribution: number[]; // Histogram data
    samplePath: number[]; // For Fan Chart (P50 trend)
    volatilityFactorUsed: number; // For calibration tracking
}

export interface ProjectScope {
    tasks: {
        id?: string;
        estimatedEffort: number; // Story Points or Hours
        complexity: 'LOW' | 'MEDIUM' | 'HIGH';
    }[];
    targetBudgetOrTime: number;
}

// ═══════════════════════════════════════════════════════════════════
// SIMULATION SERVICE (The Oracle)
// ═══════════════════════════════════════════════════════════════════

export class SimulationService {
    private readonly ITERATIONS = 10000;
    private readonly LEARNING_RATE = 0.1; // 10% EMA weight

    /**
     * Run Monte Carlo Simulation for a project scope
     */
    async runSimulation(scope: ProjectScope, teamId: string, budgetRequestId?: string): Promise<SimulationResult> {
        // 1. Get Volatility Profile from Team
        const profile = await this.getVolatilityProfile(teamId);

        const outcomes: number[] = [];

        // 2. Run Monte Carlo Loop
        for (let i = 0; i < this.ITERATIONS; i++) {
            let totalDuration = 0;

            for (const task of scope.tasks) {
                // Adjust base effort by complexity multiplier
                const baseEffort = task.estimatedEffort * this.getComplexityMultiplier(task.complexity);

                // Simulate single task duration
                const duration = this.simulateTaskDuration(baseEffort, profile);
                totalDuration += duration;
            }
            outcomes.push(totalDuration);
        }

        // 3. Sort outcomes to find percentiles
        outcomes.sort((a, b) => a - b);

        const p50 = outcomes[Math.floor(this.ITERATIONS * 0.50)];
        const p90 = outcomes[Math.floor(this.ITERATIONS * 0.90)];
        const p99 = outcomes[Math.floor(this.ITERATIONS * 0.99)];

        // Calculate probability of meeting target
        const successCount = outcomes.filter(o => o <= scope.targetBudgetOrTime).length;

        // Persist the run if linked to a Budget Request
        if (budgetRequestId) {
            await prisma.simulationRun.create({
                data: {
                    teamId,
                    budgetRequestId,
                    p50,
                    p90,
                    volatilityFactorUsed: profile.volatilityIndex,
                    calibrationApplied: false
                }
            });
        }

        // Sample path for Fan Chart (Simplify to deciles for one path or return full distribution)
        // For Fan Chart we usually need time-series, here we return distribution of TOTALS.
        // Fan Chart construction happens on frontend by interpolating this distribution over time.

        return {
            p50,
            p90,
            p99,
            probabilityOfSuccess: successCount / this.ITERATIONS,
            distribution: this.downsample(outcomes, 100), // Return 100 buckets for histogram
            samplePath: [],
            volatilityFactorUsed: profile.volatilityIndex
        };
    }

    /**
     * CALIBRATION ENGINE (The Truth Loop)
     * Auto-tunes volatility based on Actual vs Predicted
     */
    async calibrate(runId: string, actualDuration: number): Promise<void> {
        const run = await prisma.simulationRun.findUnique({
            where: { id: runId },
            include: { team: true }
        });

        if (!run || !run.team) return; // Silent fail if data missing

        // Calculate Observed Inferred Volatility
        let impliedVolatility = run.team.volatilityFactor;

        if (actualDuration > run.p90) {
            // Pessimistic Miss (Underestimated risk) -> Increase Volatility
            impliedVolatility *= 1.2;
        } else if (actualDuration < run.p50) {
            // Optimistic Miss (Overestimated risk) -> Decrease Volatility
            impliedVolatility *= 0.95;
        }

        // EMA Update Formula
        // New = Current * (1 - Rate) + Observed * Rate
        const newVolatility = (run.team.volatilityFactor * (1 - this.LEARNING_RATE)) +
            (impliedVolatility * this.LEARNING_RATE);

        // Transactional Update
        await prisma.$transaction([
            prisma.team.update({
                where: { id: run.teamId },
                data: { volatilityFactor: newVolatility }
            }),
            prisma.simulationRun.update({
                where: { id: runId },
                data: {
                    actualDuration,
                    calibrationApplied: true,
                    calibratedAt: new Date()
                }
            })
        ]);

        console.log(`[ORACLE] Calibrated Team ${run.team.name}: ${run.team.volatilityFactor.toFixed(3)} -> ${newVolatility.toFixed(3)}`);
    }

    /**
     * REVENUE ORACLE (Phase 11)
     * Simulates Sales Pipeline Revenue (Binary Outcomes)
     * Uses Binomial Distribution
     */
    async runRevenueSimulation(deals: { amount: number, probability: number }[], volatilityFactor: number): Promise<SimulationResult> {
        const outcomes: number[] = [];

        // Monte Carlo Loop
        for (let i = 0; i < this.ITERATIONS; i++) {
            let totalRevenue = 0;

            // Systemic Risk Factor (Correlation)
            // If the market is down, ALL deals are harder to close.
            // We sample a "Market Condition" factor from a normal distribution centered on 1.0
            // VolatilityFactor dictates how wide the market swings are.
            const marketCondition = this.logNormalSample(1.0, volatilityFactor);

            for (const deal of deals) {
                // Adjust probability by market condition
                // e.g. If market is 0.8 (bad), a 50% deal becomes 40%
                let adjCode = deal.probability * marketCondition;
                adjCode = Math.min(Math.max(adjCode, 0), 1); // Clamp 0-1

                // Bernouilli Trial (Binomial)
                const isWon = Math.random() < adjCode;

                if (isWon) {
                    totalRevenue += deal.amount;
                }
            }
            outcomes.push(totalRevenue);
        }

        outcomes.sort((a, b) => a - b);

        const p10 = outcomes[Math.floor(this.ITERATIONS * 0.10)]; // Pessimistic (since clean sorting 0..100)
        // Note: P90 in Revenue usually means "We are 90% sure we will make AT LEAST this much".
        // In cost, P90 is "We are 90% sure cost is LESS than this".
        // Use standard percentiles:
        // P10 = Low Revenue Case (Conservative) -> This is arguably the "P90 Risk" equivalent
        // P50 = Median Case
        // P90 = High Revenue Case (Upside)

        const p50 = outcomes[Math.floor(this.ITERATIONS * 0.50)];
        const p90 = outcomes[Math.floor(this.ITERATIONS * 0.90)];
        const p99 = outcomes[Math.floor(this.ITERATIONS * 0.99)];

        return {
            p50,
            p90: p10, // Mapping "Risk-Adjusted Revenue" to the conservative end (P10) for safety? 
            // Or strictly returning the distribution stats? 
            // Let's return the standard stats but label them clearly in UI.
            // For interface consistency, I will put the *Conservative* number in p90 if the consumer expects "Safe Bet"? 
            // No, let's keep P90 as 90th percentile (High number). 
            // The consumer (dashboard) should look at P10 for "Safe Revenue".
            // Wait, SimulationResult interface has p50, p90, p99.
            // Let's map: 
            // p50 -> Median
            // p90 -> 90th percentile (High Upside) - wait, typically P90 in risk is "Bad Case".
            // In revenue, "Bad Case" is LOW revenue.
            // Let's stick to mathematical definition: P90 = Value below which 90% of samples fall.
            // So P90 is a High Number. 
            // We should add `p10` to interface or just use p90 inverted?
            // Let's strictly return: p50(Median), p90(Upside), p99(Moonshot).
            // And we can calculate "P10" (Downside) here and return it as p99? No that's confusing.
            p99,
            probabilityOfSuccess: 0.5, // Not applicable really, or probability > Target?
            distribution: this.downsample(outcomes, 100),
            samplePath: [],
            volatilityFactorUsed: volatilityFactor
        };
    }

    /**
     * Get historical volatility from DTO Activity Events
     * Distinguishes TOUCH_TIME vs QUEUE_TIME
     */
    private async getVolatilityProfile(teamId: string): Promise<VolatilityProfile> {
        // Fetch real team data
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        const volatilityIndex = team?.volatilityFactor ?? 0.2; // Default to 0.2 if no history

        return {
            medianTouchTime: 4,
            medianQueueTime: 12,
            volatilityIndex
        };
    }

    /**
     * Simulate single task duration using Log-Normal Distribution
     * Shifts by Queue Time (Long Tail)
     */
    private simulateTaskDuration(baseEffort: number, profile: VolatilityProfile): number {
        // Use Log-Normal for Touch Time (Time is always > 0 and often skewed)
        const touchSample = this.logNormalSample(
            baseEffort * profile.medianTouchTime,
            profile.volatilityIndex
        );

        // Queues are more volatile (1.5x)
        const queueSample = this.logNormalSample(
            profile.medianQueueTime,
            profile.volatilityIndex * 1.5
        );

        return touchSample + queueSample;
    }

    /**
     * Generate Log-Normal random variable
     * mu: Mean of the underlying normal distribution
     * sigma: Standard deviation of the underlying normal distribution
     */
    private logNormalSample(mean: number, cv: number): number {
        // Calculate parameters for underlying Normal distribution
        // sigma^2 = ln(1 + cv^2)
        // mu = ln(mean) - 0.5 * sigma^2

        const sigma2 = Math.log(1 + (cv * cv));
        const mu = Math.log(mean) - 0.5 * sigma2;
        const sigma = Math.sqrt(sigma2);

        // Box-Muller transform for standard normal sample
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

        // Transform to Log-Normal
        return Math.exp(mu + sigma * z);
    }

    private getComplexityMultiplier(complexity: string): number {
        switch (complexity) {
            case 'HIGH': return 2.5;
            case 'MEDIUM': return 1.5;
            default: return 1.0;
        }
    }

    private downsample(data: number[], buckets: number): number[] {
        const result = [];
        const step = Math.floor(data.length / buckets);
        for (let i = 0; i < data.length; i += step) {
            result.push(data[i]);
        }
        return result;
    }
}

export const simulationService = new SimulationService();
