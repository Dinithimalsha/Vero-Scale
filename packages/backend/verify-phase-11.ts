import { simulationService } from './src/modules/strategy/services/simulation.service';
import { unitEconomicsService } from './src/modules/sales/services/unit-economics.service';
import { salesCoach } from './src/modules/sales/services/sales-coaching.service';
import { zbbAgent } from './src/modules/finance/services/zbb-agents.service';

async function runVerification() {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('PHASE 11: REVENUE REACTOR - VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════════════');

    // 1. REVENUE ORACLE
    console.log('\n--- 1. Testing Revenue Oracle (Binomial Simulation) ---');
    const deals = [
        { amount: 50000, probability: 0.8 },
        { amount: 100000, probability: 0.5 },
        { amount: 20000, probability: 0.9 },
        { amount: 200000, probability: 0.3 }, // Moonshot
    ];
    console.log('Input Portfolio:', JSON.stringify(deals));

    // Low Volatility (Stable Market)
    const resultStable = await simulationService.runRevenueSimulation(deals, 0.1);
    console.log(`\n[Stable Market V=0.1]`);
    console.log(`P50 Revenue: $${resultStable.p50.toLocaleString()}`);
    console.log(`P90 Upside:  $${resultStable.p90.toLocaleString()}`);

    // High Volatility (Chaos)
    const resultChaos = await simulationService.runRevenueSimulation(deals, 0.5);
    console.log(`\n[Chaos Market V=0.5]`);
    console.log(`P50 Revenue: $${resultChaos.p50.toLocaleString()}`);
    console.log(`P90 Upside:  $${resultChaos.p90.toLocaleString()}`);

    // 2. CFO BOT (Unit Economics)
    console.log('\n--- 2. Testing CFO Bot (Circuit Breaker) ---');
    const badEconomics = {
        marketingSpend: 50000,
        newCustomers: 10,
        newMRR: 10000, // $1000 ARPU
        grossMargin: 0.80,
        predictedChurnRate: 0.05 // 5% Churn
    };
    // CAC = 50k / 10 = 5k
    // LTV = (1000 * 0.8) / 0.05 = 800 / 0.05 = 16,000
    // Ratio = 3.2 (Safe)

    console.log('Scenario A (Safe):', JSON.stringify(badEconomics));
    await unitEconomicsService.checkFinancialHealth(badEconomics);

    const toxicEconomics = {
        ...badEconomics,
        marketingSpend: 80000 // CAC = 8k. LTV 16k. Ratio = 2.0 (Burn)
    };
    console.log('\nScenario B (Toxic):', JSON.stringify(toxicEconomics));
    await unitEconomicsService.checkFinancialHealth(toxicEconomics);

    // 3. SPIN DOCTOR
    console.log('\n--- 3. Testing SPIN Doctor (Coaching) ---');
    const weakTranscript = "I can help you with your sales process. Our tool is great. Do you want to buy?";
    const analysis = await salesCoach.analyzeTranscript(weakTranscript, 'deal-123');
    console.log('Transcript:', weakTranscript);
    console.log('Score:', analysis.score);
    console.log('Feedback:', analysis.diagnosticFeedback);

    console.log('\n═══════════════════════════════════════════════════════════════════');
}

runVerification().catch(console.error);
