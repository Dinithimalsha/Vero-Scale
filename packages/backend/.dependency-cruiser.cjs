/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
    forbidden: [
        // =================================================================
        // MODULE BOUNDARY ENFORCEMENT (Preventing "Big Ball of Mud")
        // =================================================================

        // Operations module cannot directly import from Finance
        {
            name: 'operations-no-finance-import',
            severity: 'error',
            comment: 'Operations module must not directly import from Finance. Use internal APIs.',
            from: { path: '^src/modules/operations/' },
            to: { path: '^src/modules/finance/' }
        },

        // Finance module cannot directly import from Operations
        {
            name: 'finance-no-operations-import',
            severity: 'error',
            comment: 'Finance module must not directly import from Operations. Use internal APIs.',
            from: { path: '^src/modules/finance/' },
            to: { path: '^src/modules/operations/' }
        },

        // Legal module boundary
        {
            name: 'legal-isolated',
            severity: 'error',
            comment: 'Legal module must remain isolated. Use events/APIs for cross-module communication.',
            from: { path: '^src/modules/legal/' },
            to: { path: '^src/modules/(operations|finance|strategy|human-capital)/' }
        },

        // Strategy module boundary  
        {
            name: 'strategy-no-direct-operations',
            severity: 'error',
            comment: 'Strategy must query data via shared services, not Operations internals.',
            from: { path: '^src/modules/strategy/' },
            to: { path: '^src/modules/operations/services/' }
        },

        // Human Capital module boundary (per CEO review: avoid surveillance)
        {
            name: 'human-capital-privacy',
            severity: 'error',
            comment: 'Human Capital feedback data must not be exposed to other modules.',
            from: { path: '^src/modules/(operations|finance|strategy|legal)/' },
            to: { path: '^src/modules/human-capital/services/feedback' }
        },

        // =================================================================
        // GENERAL ARCHITECTURE RULES
        // =================================================================

        // Controllers cannot import other controllers
        {
            name: 'no-controller-to-controller',
            severity: 'error',
            comment: 'Controllers must not import other controllers. Use services.',
            from: { path: '.*/controllers/.*' },
            to: { path: '.*/controllers/.*' }
        },

        // Services are the API - routes import controllers, controllers import services
        {
            name: 'routes-no-direct-service',
            severity: 'warn',
            comment: 'Routes should use controllers as intermediaries to services.',
            from: { path: '.*/routes\\.ts$' },
            to: { path: '.*/services/.*' }
        },

        // Integrations are shared infrastructure
        {
            name: 'integrations-shared-only',
            severity: 'warn',
            comment: 'Integration modules should be accessed via shared utilities.',
            from: { path: '^src/modules/' },
            to: { path: '^src/integrations/' }
        },

        // No circular dependencies
        {
            name: 'no-circular',
            severity: 'error',
            comment: 'Circular dependencies indicate poor module design.',
            from: {},
            to: { circular: true }
        }
    ],

    options: {
        doNotFollow: {
            path: 'node_modules'
        },
        tsPreCompilationDeps: true,
        tsConfig: { fileName: 'tsconfig.json' },
        enhancedResolveOptions: {
            exportsFields: ['exports'],
            conditionNames: ['import', 'require', 'node', 'default']
        },
        reporterOptions: {
            dot: {
                collapsePattern: 'node_modules/[^/]+',
                theme: {
                    graph: { splines: 'ortho' },
                    modules: [
                        { criteria: { source: '^src/modules/operations/' }, attributes: { fillcolor: '#e3f2fd' } },
                        { criteria: { source: '^src/modules/finance/' }, attributes: { fillcolor: '#e8f5e9' } },
                        { criteria: { source: '^src/modules/legal/' }, attributes: { fillcolor: '#fff3e0' } },
                        { criteria: { source: '^src/modules/strategy/' }, attributes: { fillcolor: '#f3e5f5' } },
                        { criteria: { source: '^src/modules/human-capital/' }, attributes: { fillcolor: '#ffebee' } }
                    ]
                }
            }
        }
    }
};
