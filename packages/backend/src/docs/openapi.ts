/**
 * OpenAPI Documentation Configuration
 * Swagger UI for API exploration
 */

import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'VeroScale API',
            version: '1.0.0',
            description: 'Enterprise Operating System for Algorithmic Leadership',
            contact: {
                name: 'VeroScale Team',
                email: 'api@veroscale.io',
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
        },
        servers: [
            {
                url: 'http://localhost:3001',
                description: 'Development server',
            },
            {
                url: 'https://api.veroscale.io',
                description: 'Production server',
            },
        ],
        tags: [
            { name: 'Auth', description: 'Authentication endpoints' },
            { name: 'Operations', description: 'Heijunka, Andon, Muda' },
            { name: 'Legal', description: 'IP Airlock, Vesting' },
            { name: 'Finance', description: 'Ledger, Unit Economics' },
            { name: 'Strategy', description: 'MECE Trees, 7S Diagnostic' },
            { name: 'Data', description: 'ETL, North Star Dashboard' },
            { name: 'Human Capital', description: 'Topgrading, Radical Candor' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        error: { type: 'string', example: 'Error message' },
                        code: { type: 'string', example: 'ERROR_CODE' },
                    },
                },
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { type: 'object' },
                    },
                },
                // Auth
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string', minLength: 1 },
                    },
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                token: { type: 'string' },
                                user: {
                                    type: 'object',
                                    properties: {
                                        userId: { type: 'string', format: 'uuid' },
                                        email: { type: 'string' },
                                        organizationId: { type: 'string', format: 'uuid' },
                                        role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'MEMBER'] },
                                    },
                                },
                            },
                        },
                    },
                },
                // Operations
                ProductionPitch: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        startTime: { type: 'string', format: 'date-time' },
                        endTime: { type: 'string', format: 'date-time' },
                        capacityPoints: { type: 'integer' },
                        status: { type: 'string', enum: ['PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED'] },
                    },
                },
                Task: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        title: { type: 'string' },
                        taskType: { type: 'string', enum: ['FEATURE', 'BUG', 'TECH_DEBT'] },
                        storyPoints: { type: 'integer' },
                        status: { type: 'string', enum: ['BACKLOG', 'READY', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'DONE'] },
                        wsjfScore: { type: 'number' },
                    },
                },
                AndonEvent: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        triggerType: { type: 'string', enum: ['PIPELINE_FAILURE', 'SECURITY_ALERT', 'QUALITY_GATE', 'MANUAL_STOP'] },
                        severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                        status: { type: 'string', enum: ['ACTIVE', 'SWARMING', 'RESOLVED', 'IGNORED'] },
                        mttrMinutes: { type: 'integer' },
                    },
                },
                // Finance
                Transaction: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        date: { type: 'string', format: 'date' },
                        description: { type: 'string' },
                        amount: { type: 'number' },
                        category: { type: 'string', enum: ['REVENUE', 'COGS', 'OPEX', 'PAYROLL', 'TAX', 'TRANSFER', 'OTHER'] },
                        costType: { type: 'string' },
                    },
                },
                GrossMargin: {
                    type: 'object',
                    properties: {
                        revenue: { type: 'number' },
                        cogs: { type: 'number' },
                        grossProfit: { type: 'number' },
                        grossMarginPercent: { type: 'number' },
                        breakdown: { type: 'object' },
                    },
                },
                // Strategy
                IssueTree: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        title: { type: 'string' },
                        rootQuestion: { type: 'string' },
                        treeType: { type: 'string', enum: ['ISSUE', 'HYPOTHESIS', 'OPTION'] },
                    },
                },
                SevenSDiagnostic: {
                    type: 'object',
                    properties: {
                        strategyScore: { type: 'number' },
                        structureScore: { type: 'number' },
                        systemsScore: { type: 'number' },
                        sharedValuesScore: { type: 'number' },
                        styleScore: { type: 'number' },
                        staffScore: { type: 'number' },
                        skillsScore: { type: 'number' },
                        misalignmentFlags: { type: 'array', items: { type: 'string' } },
                    },
                },
                // Human Capital
                JobScorecard: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        title: { type: 'string' },
                        department: { type: 'string' },
                        outcomes: { type: 'array', items: { type: 'string' } },
                        competencies: { type: 'array', items: { type: 'string' } },
                    },
                },
                CandidateEvaluation: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        candidateName: { type: 'string' },
                        tenurePattern: { type: 'string' },
                        overallScore: { type: 'integer' },
                        riskFlags: { type: 'array', items: { type: 'string' } },
                        strengths: { type: 'array', items: { type: 'string' } },
                    },
                },
                FeedbackEntry: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        content: { type: 'string' },
                        feedbackType: { type: 'string', enum: ['PRAISE', 'CONSTRUCTIVE', 'PERFORMANCE_REVIEW', 'ONE_ON_ONE'] },
                        careScore: { type: 'number' },
                        challengeScore: { type: 'number' },
                        candorQuadrant: { type: 'string' },
                    },
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: [], // We define specs inline, not via JSDoc comments
};

export const swaggerSpec = swaggerJSDoc(options);

// Manual path definitions for complete API documentation
export const apiPaths = {
    '/api/auth/login': {
        post: {
            tags: ['Auth'],
            summary: 'User login',
            security: [],
            requestBody: {
                required: true,
                content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
            },
            responses: {
                '200': { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
                '401': { description: 'Invalid credentials' },
            },
        },
    },
    '/api/auth/me': {
        get: {
            tags: ['Auth'],
            summary: 'Get current user',
            responses: {
                '200': { description: 'Current user data' },
                '401': { description: 'Not authenticated' },
            },
        },
    },
    '/api/operations/heijunka/pitches/{organizationId}': {
        get: {
            tags: ['Operations'],
            summary: 'Get production pitches',
            parameters: [{ name: 'organizationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
            responses: { '200': { description: 'List of pitches' } },
        },
    },
    '/api/operations/andon/events/{organizationId}': {
        get: {
            tags: ['Operations'],
            summary: 'Get Andon events',
            parameters: [{ name: 'organizationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
            responses: { '200': { description: 'List of Andon events' } },
        },
    },
    '/api/finance/ledger/transactions/{organizationId}': {
        get: {
            tags: ['Finance'],
            summary: 'Get transactions',
            parameters: [{ name: 'organizationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
            responses: { '200': { description: 'List of transactions' } },
        },
    },
    '/api/finance/ledger/gross-margin/{organizationId}': {
        get: {
            tags: ['Finance'],
            summary: 'Get gross margin calculation',
            parameters: [{ name: 'organizationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
            responses: { '200': { description: 'Gross margin data' } },
        },
    },
    '/api/strategy/issue-trees': {
        post: {
            tags: ['Strategy'],
            summary: 'Create MECE Issue Tree',
            requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/IssueTree' } } } },
            responses: { '201': { description: 'Tree created' } },
        },
    },
    '/api/strategy/seven-s/diagnostics': {
        post: {
            tags: ['Strategy'],
            summary: 'Create 7S diagnostic from survey',
            responses: { '201': { description: 'Diagnostic created' } },
        },
    },
    '/api/data/north-star/{organizationId}': {
        get: {
            tags: ['Data'],
            summary: 'Get North Star dashboard data',
            parameters: [{ name: 'organizationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
            responses: { '200': { description: 'Dashboard metrics' } },
        },
    },
    '/api/human-capital/topgrading/scorecards': {
        post: {
            tags: ['Human Capital'],
            summary: 'Create job scorecard',
            requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/JobScorecard' } } } },
            responses: { '201': { description: 'Scorecard created' } },
        },
    },
    '/api/human-capital/feedback': {
        post: {
            tags: ['Human Capital'],
            summary: 'Create feedback entry',
            requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/FeedbackEntry' } } } },
            responses: { '201': { description: 'Feedback created with NLP analysis' } },
        },
    },
};

// Merge paths into spec
Object.assign(swaggerSpec, { paths: apiPaths });
