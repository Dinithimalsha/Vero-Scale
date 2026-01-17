/**
 * API Service Layer
 * Centralized API calls for all Algorithmic Enterprise modules
 */

// Use environment variable or default
const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL)
    || 'http://localhost:3000/api';

// ═══════════════════════════════════════════════════════════════════
// GENERIC FETCH HELPER
// ═══════════════════════════════════════════════════════════════════

async function fetchAPI<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, error: result.error || 'Request failed' };
        }

        return { success: true, data: result.data };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error'
        };
    }
}

// ═══════════════════════════════════════════════════════════════════
// PREDICTION MARKETS API
// ═══════════════════════════════════════════════════════════════════

export interface Market {
    marketId: string;
    question: string;
    description?: string;
    yesPrice: number;
    noPrice: number;
    volume24h: number;
    expiryTimestamp: string;
    status: 'OPEN' | 'CLOSED' | 'RESOLVED';
}

export interface Trade {
    tradeId: string;
    marketId: string;
    outcome: 'YES' | 'NO';
    price: number;
    quantity: number;
    usdAmount: number;
}

export const marketsApi = {
    listMarkets: (organizationId: string, status?: string) =>
        fetchAPI<Market[]>(`/markets?organizationId=${organizationId}${status ? `&status=${status}` : ''}`),

    getMarketPrice: (marketId: string) =>
        fetchAPI<{ yesPrice: number; noPrice: number; volume24h: number }>(`/markets/${marketId}/price`),

    createMarket: (data: {
        organizationId: string;
        question: string;
        expiryTimestamp: string;
        description?: string;
        initialLiquidity?: number;
    }) =>
        fetchAPI<Market>('/markets', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    buyShares: (marketId: string, userId: string, outcome: 'YES' | 'NO', usdAmount: number) =>
        fetchAPI<Trade>(`/markets/${marketId}/trade`, {
            method: 'POST',
            body: JSON.stringify({ userId, outcome, usdAmount }),
        }),

    getForecast: (marketId: string) =>
        fetchAPI<{ probability: number; confidence: number; question: string }>(`/markets/${marketId}/forecast`),
};

// ═══════════════════════════════════════════════════════════════════
// QUADRATIC VOTING API
// ═══════════════════════════════════════════════════════════════════

export interface VotingSession {
    sessionId: string;
    title: string;
    description?: string;
    expiresAt: string;
    status: 'OPEN' | 'CLOSED' | 'TALLIED';
    initialCreditsPerVoter: number;
    options: VotingOption[];
}

export interface VotingOption {
    optionId: string;
    title: string;
    description?: string;
    category?: string;
    totalVotes: number;
    rank?: number;
}

export interface Ballot {
    ballotId: string;
    sessionId: string;
    voterId: string;
    totalCost: number;
    remainingCredits: number;
    votes: Array<{ optionId: string; voteCount: number; cost: number }>;
}

export const votingApi = {
    listSessions: (organizationId: string, status?: string) =>
        fetchAPI<VotingSession[]>(`/governance/voting/sessions?organizationId=${organizationId}${status ? `&status=${status}` : ''}`),

    getSessionResults: (sessionId: string) =>
        fetchAPI<{
            rankedOptions: Array<{ optionId: string; title: string; totalVotes: number; rank: number }>;
            totalVotesCast: number;
            participationRate: number;
        }>(`/governance/voting/sessions/${sessionId}/results`),

    createSession: (data: {
        organizationId: string;
        title: string;
        options: Array<{ title: string; description?: string; category?: string }>;
        durationDays?: number;
        creditsPerVoter?: number;
    }) =>
        fetchAPI<VotingSession>('/governance/voting/sessions', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    submitBallot: (sessionId: string, voterId: string, votes: Array<{ optionId: string; voteCount: number }>) =>
        fetchAPI<Ballot>(`/governance/voting/sessions/${sessionId}/vote`, {
            method: 'POST',
            body: JSON.stringify({ voterId, votes }),
        }),

    getVoterStatus: (sessionId: string, voterId: string) =>
        fetchAPI<{ hasVoted: boolean; remainingCredits: number }>(`/governance/voting/sessions/${sessionId}/voter/${voterId}`),

    previewCost: (initialCredits: number, votes: Array<{ voteCount: number }>) =>
        fetchAPI<{ totalCost: number; remainingCredits: number; isValid: boolean }>('/governance/voting/preview-cost', {
            method: 'POST',
            body: JSON.stringify({ initialCredits, votes }),
        }),
};

// ═══════════════════════════════════════════════════════════════════
// ZBB (ZERO-BASED BUDGETING) API
// ═══════════════════════════════════════════════════════════════════

export interface ZombieAlert {
    id: string;
    vendor: string;
    resourceType: 'SAAS_SEAT' | 'CLOUD_RESOURCE' | 'SUBSCRIPTION' | 'LICENSE';
    resourceName: string;
    monthlyCost: number;
    daysSinceActive: number;
    potentialSavings: number;
    status: 'DETECTED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'IGNORED';
}

export interface CostAttribution {
    customerId: string;
    customerName?: string;
    revenue: number;
    infrastructureCost: number;
    grossMargin: number;
    grossMarginPercent: number;
}

export interface BudgetRequest {
    id: string;
    requesterId: string;
    category: string;
    vendor?: string;
    amount: number;
    justification: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_INFO';
}

export const zbbApi = {
    huntZombies: (organizationId: string) =>
        fetchAPI<{
            alerts: ZombieAlert[];
            summary: { totalMonthly: number; totalAnnual: number };
        }>(`/finance/zbb/zombies?organizationId=${organizationId}`),

    getAttribution: (organizationId: string, customerId: string) =>
        fetchAPI<{
            attribution: CostAttribution;
            recommendations: string[];
        }>(`/finance/zbb/attribution/${customerId}?organizationId=${organizationId}`),

    findUnprofitable: (organizationId: string) =>
        fetchAPI<CostAttribution[]>(`/finance/zbb/unprofitable?organizationId=${organizationId}`),

    submitBudgetRequest: (data: {
        organizationId: string;
        requesterId: string;
        category: string;
        vendor?: string;
        amount: number;
        justification: string;
    }) =>
        fetchAPI<{
            request: BudgetRequest;
            agentResponse: Array<{ role: string; content: string }>;
            requiresHumanReview: boolean;
        }>('/finance/zbb/requests', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    runAudit: (organizationId: string) =>
        fetchAPI<{
            zombieAlerts: ZombieAlert[];
            unprofitableCustomers: CostAttribution[];
            totalPotentialSavings: number;
            recommendations: string[];
        }>('/finance/zbb/audit', {
            method: 'POST',
            body: JSON.stringify({ organizationId }),
        }),

    getDashboard: (organizationId: string) =>
        fetchAPI<{
            pendingRequests: number;
            zombieAlerts: number;
            potentialSavings: number;
            avgApprovalTime: number;
        }>(`/finance/zbb/dashboard?organizationId=${organizationId}`),
};

// ═══════════════════════════════════════════════════════════════════
// COMPLIANCE API
// ═══════════════════════════════════════════════════════════════════

export interface Policy {
    type: string;
    name: string;
    description: string;
    enabled: boolean;
    rules: Array<{ field: string; condition: string; action: string }>;
}

export interface PolicyEvaluation {
    decision: 'ALLOW' | 'DENY' | 'WARN';
    reason: string;
    violations: string[];
    auditId: string;
}

export const complianceApi = {
    listPolicies: () =>
        fetchAPI<Policy[]>('/compliance/policies'),

    getPolicy: (policyType: string) =>
        fetchAPI<Policy>(`/compliance/policies/${policyType}`),

    togglePolicy: (policyType: string, enabled: boolean) =>
        fetchAPI<void>(`/compliance/policies/${policyType}/toggle`, {
            method: 'PATCH',
            body: JSON.stringify({ enabled }),
        }),

    updatePolicyRules: (policyType: string, rules: any[]) =>
        fetchAPI<Policy>(`/compliance/policies/${policyType}`, {
            method: 'PUT',
            body: JSON.stringify({ rules }),
        }),

    evaluateCommit: (data: {
        sha: string;
        message: string;
        author: string;
        files: string[];
        approvers: string[];
    }) =>
        fetchAPI<PolicyEvaluation>('/compliance/evaluate/commit', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    evaluateDeployment: (data: {
        environment: string;
        ciStatus: string;
        testCoverage: number;
        securityScanStatus: string;
        approvers: string[];
    }) =>
        fetchAPI<PolicyEvaluation>('/compliance/evaluate/deployment', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getMetrics: () =>
        fetchAPI<{
            totalEvaluations: number;
            allowedCount: number;
            deniedCount: number;
            complianceRate: number;
        }>('/compliance/metrics'),
};

// ═══════════════════════════════════════════════════════════════════
// STRATEGY API (North Star)
// ═══════════════════════════════════════════════════════════════════

export interface NorthStarMetric {
    healthScore: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
    components: {
        financialHealth: number;
        operationalFlow: number;
        complianceScore: number;
    };
    insights: string[];
}

export const strategyApi = {
    getNorthStar: (organizationId: string) =>
        fetchAPI<NorthStarMetric>(`/strategy/north-star?organizationId=${organizationId}`),

    // Issue Trees
    createTree: (data: { organizationId: string; title: string; rootQuestion: string; treeType?: string }) =>
        fetchAPI<{ id: string; title: string }>('/strategy/issue-trees', {
            method: 'POST', body: JSON.stringify(data)
        }),

    getTrees: (organizationId: string) =>
        fetchAPI<any[]>(`/strategy/issue-trees/${organizationId}`),

    getHierarchy: (treeId: string) =>
        fetchAPI<any>(`/strategy/issue-trees/${treeId}/hierarchy`),

    addNode: (data: { treeId: string; parentId?: string; label: string; hypothesis?: string; dataSourceType?: string; dataSourceQuery?: string }) =>
        fetchAPI<any>('/strategy/issue-trees/nodes', {
            method: 'POST', body: JSON.stringify(data)
        }),

    updateNode: (nodeId: string, updates: any) =>
        fetchAPI<any>(`/strategy/issue-trees/nodes/${nodeId}`, {
            method: 'PATCH', body: JSON.stringify(updates)
        }),

    deleteNode: (nodeId: string) =>
        fetchAPI<void>(`/strategy/issue-trees/nodes/${nodeId}`, { method: 'DELETE' }),
};

// ═══════════════════════════════════════════════════════════════════
// RADICAL CANDOR API
// ═══════════════════════════════════════════════════════════════════

export interface FeedbackData {
    id: string;
    content: string;
    feedbackType: 'PRAISE' | 'CONSTRUCTIVE' | 'PERFORMANCE_REVIEW' | 'ONE_ON_ONE';
    careScore?: number;
    challengeScore?: number;
    candorQuadrant?: string;
    toneSuggestion?: string;
    createdAt: string;
}

export const radicalCandorApi = {
    createFeedback: (data: { organizationId: string; giverId: string; recipientId: string; content: string; feedbackType: string; isDraft?: boolean }) =>
        fetchAPI<FeedbackData>('/human-capital/feedback', { method: 'POST', body: JSON.stringify(data) }),

    sendFeedback: (feedbackId: string) =>
        fetchAPI<FeedbackData>(`/human-capital/feedback/${feedbackId}/send`, { method: 'POST' }),

    analyzeSentiment: (content: string) =>
        fetchAPI<{ careScore: number; challengeScore: number; quadrant: string; toneSuggestion?: string }>('/human-capital/feedback/analyze', {
            method: 'POST', body: JSON.stringify({ content })
        }),

    getGivenFeedback: (giverId: string) =>
        fetchAPI<FeedbackData[]>(`/human-capital/feedback/given/${giverId}`),

    getReceivedFeedback: (recipientId: string) =>
        fetchAPI<FeedbackData[]>(`/human-capital/feedback/received/${recipientId}`),

    getPersonalStats: (userId: string) =>
        fetchAPI<{ given: number; received: number; avgCareScore: number; avgChallengeScore: number; dominantQuadrant: string; recommendations: string[] }>(`/human-capital/feedback/stats/${userId}`),

    getOrgHealth: (organizationId: string) =>
        fetchAPI<{ metrics: any; matrix: any }>(`/human-capital/feedback/health/${organizationId}`),
};

// ═══════════════════════════════════════════════════════════════════
// DTO (DIGITAL TWIN) API
// ═══════════════════════════════════════════════════════════════════

export interface FlowMetrics {
    totalProcessTime: number;
    totalLeadTime: number;
    flowEfficiency: number;
    bottlenecks: Array<{ nodeType: string; averageWaitTime: number }>;
}

export const dtoApi = {
    recordEvent: (organizationId: string, data: {
        timestamp: string;
        actorId: string;
        actorType: 'HUMAN' | 'AGENT' | 'SYSTEM';
        duration: number;
        caseId: string;
        nodeType: string;
        metadata?: Record<string, unknown>;
    }) =>
        fetchAPI<{ eventId: string }>('/dto/events', {
            method: 'POST',
            body: JSON.stringify({ organizationId, ...data }),
        }),

    getCase: (caseId: string) =>
        fetchAPI<{
            caseId: string;
            processType: string;
            outcomeStatus: string;
            events: Array<{ eventId: string; nodeType: string; timestamp: string }>;
        }>(`/dto/cases/${caseId}`),

    getFlowMetrics: (organizationId: string, processType: string, startDate: string, endDate: string) =>
        fetchAPI<FlowMetrics>(`/dto/flow-metrics?organizationId=${organizationId}&processType=${processType}&startDate=${startDate}&endDate=${endDate}`),

    evaluateAndon: (organizationId: string, processType: string) =>
        fetchAPI<{
            triggered: boolean;
            event?: { triggerType: string; metricValue: number; threshold: number };
        }>(`/dto/andon/evaluate?organizationId=${organizationId}&processType=${processType}`),

    getQueueStatus: (organizationId: string) =>
        fetchAPI<Array<{ queueId: string; name: string; wipLimit: number; currentLoad: number }>>(`/dto/queues?organizationId=${organizationId}`),
};

export default {
    markets: marketsApi,
    voting: votingApi,
    zbb: zbbApi,
    compliance: complianceApi,
    marketing: dtoApi, // Typo in original file? No, just add strategy.
    strategy: strategyApi,
    dto: dtoApi,
};
