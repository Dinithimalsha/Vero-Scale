/**
 * SALES CONNECTOR SERVICE (The Pipe)
 * Ingests data from CRM (HubSpot/Salesforce) and maps to DTO.
 */

export interface Deal {
    id: string;
    stage: string;
    amount: number;
    probability: number;
    createdAt: Date;
    lastActivityAt: Date;
    ownerId: string;
}

export class SalesConnectorService {

    // Mock HubSpot Data
    private originalDeals: Deal[] = [];
    private mockDeals: Deal[] = [
        { id: 'd1', stage: 'DISCOVERY', amount: 50000, probability: 0.2, createdAt: new Date(), lastActivityAt: new Date(), ownerId: 'u1' },
        { id: 'd2', stage: 'NEGOTIATION', amount: 120000, probability: 0.8, createdAt: new Date(), lastActivityAt: new Date(), ownerId: 'u1' },
        { id: 'd3', stage: 'CLOSED_WON', amount: 75000, probability: 1.0, createdAt: new Date(), lastActivityAt: new Date(), ownerId: 'u2' },
    ];

    async getPipeline(): Promise<Deal[]> {
        // In real life: await hubspot.crm.deals.getAll(...)
        return this.mockDeals;
    }

    /**
     * Calculate Stage Velocity
     * How long deals sit in each stage?
     */
    async getStageVelocity(): Promise<Record<string, number>> {
        // Mock data: Days in stage
        return {
            'DISCOVERY': 14,
            'DEMO': 7,
            'NEGOTIATION': 21,
            'CONTRACT': 5
        };
    }

    /**
     * Chaos Engineering: Inject Poison Data
     */
    async injectMockData(scenario: { churnSpike?: number, pipelineCollapse?: number }): Promise<void> {
        console.warn(`[SALES CONNECTOR] ⚠️ CHAOS DETECTED: Injecting Mock Scenario`, scenario);

        // Backup original state
        if (this.originalDeals.length === 0) {
            this.originalDeals = JSON.parse(JSON.stringify(this.mockDeals));
        }

        if (scenario.pipelineCollapse) {
            // Collapse probabilities and amounts
            this.mockDeals.forEach(deal => {
                deal.probability = deal.probability * (1 - scenario.pipelineCollapse!);
                deal.amount = deal.amount * (1 - scenario.pipelineCollapse!);
            });
        }
    }

    async clearMockData() {
        if (this.originalDeals.length > 0) {
            this.mockDeals = JSON.parse(JSON.stringify(this.originalDeals));
            this.originalDeals = [];
            console.log(`[SALES CONNECTOR] Chaos Cleared. Pipeline Restored.`);
        }
    }
}

export const salesConnector = new SalesConnectorService();
