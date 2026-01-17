import { prisma } from '../../../shared/prisma';
import { CompliancePolicy, ComplianceAuditLog, Prisma } from '@prisma/client';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════
// TYPES (Section 6.1 - Policy-as-Code with OPA)
// ═══════════════════════════════════════════════════════════════════

export type PolicyType =
    | 'GIT_COMMIT'
    | 'DEPLOYMENT'
    | 'DATA_ACCESS'
    | 'BUDGET_APPROVAL'
    | 'VENDOR_CONTRACT'
    | 'EMPLOYEE_ACTION';

export type PolicyDecision = 'ALLOW' | 'DENY' | 'WARN';

export interface PolicyRule {
    id: string;
    name: string;
    condition: string;      // Rego-style condition expression
    message: string;        // Human-readable explanation
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    action: PolicyDecision;
}

// Extending Prisma model with typed rules
// Fix: Use Omit to avoid conflict between Prisma Json and our PolicyRule[]
export type PolicyWithRules = Omit<CompliancePolicy, 'rules'> & {
    rules: PolicyRule[];
};

export interface PolicyEvaluationRequest {
    policyType: PolicyType;
    input: Record<string, unknown>;
    context?: {
        userId?: string;
        organizationId?: string;
        timestamp?: Date;
    };
}

export interface PolicyEvaluationResult {
    decision: PolicyDecision;
    violations: PolicyViolation[];
    warnings: PolicyViolation[];
    auditLogId: string;
    evaluatedAt: Date;
}

export interface PolicyViolation {
    ruleId: string;
    ruleName: string;
    message: string;
    severity: string;
    inputPath?: string;
}

// ═══════════════════════════════════════════════════════════════════
// BUILT-IN POLICY RULES (Section 6.1 - GitStream Compliance Gate)
// ═══════════════════════════════════════════════════════════════════

const GIT_COMMIT_POLICIES: PolicyRule[] = [
    {
        id: 'git-001',
        name: 'Require commit author email',
        condition: 'input.commit.author.email != null && input.commit.author.email != ""',
        message: 'Commit author must have an email address.',
        severity: 'HIGH',
        action: 'DENY',
    },
    {
        id: 'git-002',
        name: 'Require JIRA ticket reference',
        condition: 'contains(input.commit.message, "JIRA-") || contains(input.commit.message, "fixes #")',
        message: 'Commit message must reference a JIRA ticket (e.g., JIRA-1234).',
        severity: 'MEDIUM',
        action: 'DENY',
    },
    {
        id: 'git-003',
        name: 'No Friday deployments',
        condition: 'dayOfWeek(input.timestamp) != 5',  // 5 = Friday
        message: 'No code merges allowed on Fridays.',
        severity: 'HIGH',
        action: 'DENY',
    },
];

const DEPLOYMENT_POLICIES: PolicyRule[] = [
    {
        id: 'deploy-001',
        name: 'Require passing tests',
        condition: 'input.ciStatus == "success" && input.testCoverage >= 60',
        message: 'Deployment requires passing CI and minimum 60% test coverage.',
        severity: 'CRITICAL',
        action: 'DENY',
    },
    {
        id: 'deploy-002',
        name: 'Security scan must pass',
        condition: 'input.securityScanStatus == "pass" || input.securityScanStatus == "warn"',
        message: 'Security vulnerability scan must pass before deployment.',
        severity: 'CRITICAL',
        action: 'DENY',
    },
];

const DATA_ACCESS_POLICIES: PolicyRule[] = [
    {
        id: 'data-001',
        name: 'PII access requires justification',
        condition: '!input.containsPII || (input.justification != null && input.justification != "")',
        message: 'Accessing PII data requires a justification.',
        severity: 'HIGH',
        action: 'DENY',
    },
    {
        id: 'data-002',
        name: 'Cross-org data access prohibited',
        condition: 'input.requestedOrgId == input.userOrgId || input.userRole == "ADMIN"',
        message: 'Users cannot access data from other organizations.',
        severity: 'CRITICAL',
        action: 'DENY',
    },
];

const BUDGET_POLICIES: PolicyRule[] = [
    {
        id: 'budget-001',
        name: 'Large purchases require CFO approval',
        condition: 'input.amount < 10000 || includes(input.approvers, "CFO")',
        message: 'Purchases over $10,000 require CFO approval.',
        severity: 'HIGH',
        action: 'DENY',
    },
];

// ═══════════════════════════════════════════════════════════════════
// POLICY ENGINE (Rego-style Evaluation)
// ═══════════════════════════════════════════════════════════════════

export class PolicyEngine {

    /**
     * Evaluate a request against policies
     */
    async evaluate(request: PolicyEvaluationRequest): Promise<PolicyEvaluationResult> {
        const organizationId = request.context?.organizationId;

        if (!organizationId) {
            // If no org context, we can't fetch policies reliably. Fail safe.
            return {
                decision: 'DENY',
                violations: [{ ruleId: 'sys-error', ruleName: 'Missing Organization Context', message: 'Organization ID required', severity: 'CRITICAL' }],
                warnings: [],
                auditLogId: 'error',
                evaluatedAt: new Date(),
            };
        }

        // Fetch or Initialize Policy
        let policy = await prisma.compliancePolicy.findUnique({
            where: {
                organizationId_type: {
                    organizationId,
                    type: request.policyType,
                }
            }
        });

        if (!policy) {
            // Lazy-init built-in policies if missing
            policy = await this.ensureDefaultPolicy(organizationId, request.policyType);
        }

        if (!policy || !policy.enabled) {
            return {
                decision: 'ALLOW',
                violations: [],
                warnings: [],
                auditLogId: this.generateAuditId(),
                evaluatedAt: new Date(),
            };
        }

        const rules = policy.rules as unknown as PolicyRule[];
        const violations: PolicyViolation[] = [];
        const warnings: PolicyViolation[] = [];

        for (const rule of rules) {
            const passed = this.evaluateCondition(rule.condition, request.input);

            if (!passed) {
                const violation: PolicyViolation = {
                    ruleId: rule.id,
                    ruleName: rule.name,
                    message: rule.message,
                    severity: rule.severity,
                };

                if (rule.action === 'DENY') {
                    violations.push(violation);
                } else if (rule.action === 'WARN') {
                    warnings.push(violation);
                }
            }
        }

        // Determine overall decision
        let decision: PolicyDecision = 'ALLOW';
        if (violations.length > 0) {
            decision = 'DENY';
        } else if (warnings.length > 0) {
            decision = 'WARN';
        }

        // Log Audit
        const auditLogId = this.generateAuditId();
        await this.logAuditEntry(auditLogId, organizationId, request, { decision, violations, warnings });

        return {
            decision,
            violations,
            warnings,
            auditLogId,
            evaluatedAt: new Date(),
        };
    }

    private async ensureDefaultPolicy(organizationId: string, type: PolicyType): Promise<CompliancePolicy | null> {
        let defaultRules: PolicyRule[] = [];
        let description = '';
        let name = '';

        switch (type) {
            case 'GIT_COMMIT':
                defaultRules = GIT_COMMIT_POLICIES;
                name = 'Git Commit Compliance';
                description = 'Enforces commit message standards and code review requirements';
                break;
            case 'DEPLOYMENT':
                defaultRules = DEPLOYMENT_POLICIES;
                name = 'Deployment Gate';
                description = 'Enforces CI/CD pipeline quality gates';
                break;
            case 'DATA_ACCESS':
                defaultRules = DATA_ACCESS_POLICIES;
                name = 'Data Access Control';
                description = 'Enforces PII protection and cross-org access rules';
                break;
            case 'BUDGET_APPROVAL':
                defaultRules = BUDGET_POLICIES;
                name = 'Budget Approval';
                description = 'Enforces spending limits and approval requirements';
                break;
            default:
                return null;
        }

        // Create
        try {
            return await prisma.compliancePolicy.upsert({
                where: { organizationId_type: { organizationId, type } },
                update: {},
                create: {
                    organizationId,
                    type,
                    name,
                    description,
                    rules: defaultRules as any, // Cast for Prisma Json
                    enabled: true,
                }
            });
        } catch (e) {
            console.error('Failed to init policy', e);
            return null;
        }
    }

    /**
     * Evaluate a Rego-style condition against input
     * Simplified interpreter for common patterns
     */
    private evaluateCondition(condition: string, input: Record<string, unknown>): boolean {
        try {
            // Helper functions available in conditions
            const helpers = {
                contains: (str: string | string[], substr: string) => {
                    if (Array.isArray(str)) return str.some(s => s.includes(substr));
                    return str?.includes(substr) ?? false;
                },
                includes: (arr: unknown[], item: unknown) => {
                    return Array.isArray(arr) && arr.includes(item);
                },
                length: (arr: unknown[]) => {
                    return Array.isArray(arr) ? arr.length : 0;
                },
                dayOfWeek: (date: string | Date) => {
                    return new Date(date).getDay();
                },
                containsPII: (diff: string) => {
                    const piiPatterns = ['email', 'phone', 'ssn', 'address', 'credit_card'];
                    return piiPatterns.some(p => diff?.toLowerCase().includes(p));
                },
                containsEncryption: (diff: string) => {
                    return diff?.includes('encrypt(') || diff?.includes('AES') || diff?.includes('hash(');
                },
            };

            // Build evaluation context
            const evalContext = {
                input,
                ...helpers,
            };

            // Transform condition to JavaScript
            const jsCondition = this.transformCondition(condition);

            // Create function with context
            const fn = new Function(
                ...Object.keys(evalContext),
                `return ${jsCondition};`
            );

            return fn(...Object.values(evalContext));
        } catch (error) {
            console.error(`Policy condition evaluation failed: ${condition}`, error);
            // Default Deny on error is safer for compliance
            return false;
        }
    }

    /**
     * Transform Rego-style condition to JavaScript
     */
    private transformCondition(condition: string): string {
        return condition
            .replace(/input\.(\w+)/g, 'input["$1"]')
            .replace(/input\["(\w+)"\]\.(\w+)/g, 'input["$1"]?.["$2"]')
            .replace(/!=/g, '!==')
            .replace(/==/g, '===')
            .replace(/ && /g, ' && ')
            .replace(/ \|\| /g, ' || ');
    }

    private generateAuditId(): string {
        return `audit-${crypto.randomUUID()}`;
    }

    private async logAuditEntry(
        auditId: string,
        organizationId: string,
        request: PolicyEvaluationRequest,
        result: { decision: PolicyDecision; violations: PolicyViolation[]; warnings: PolicyViolation[] }
    ): Promise<void> {
        await prisma.complianceAuditLog.create({
            data: {
                id: auditId,
                organizationId,
                policyType: request.policyType,
                decision: result.decision,
                violations: result.violations as any,
                warnings: result.warnings as any,
                inputMap: request.input as any,
                metadata: request.context as any,
                timestamp: new Date(),
            }
        });
    }

    /**
     * Get all policies for an org
     */
    async getPolicies(organizationId: string): Promise<PolicyWithRules[]> {
        const policies = await prisma.compliancePolicy.findMany({
            where: { organizationId }
        });

        // Explicitly cast the rules property
        return policies.map(p => ({
            ...p,
            rules: p.rules as unknown as PolicyRule[]
        }));
    }

    /**
     * Toggle policy enabled state
     */
    async togglePolicy(organizationId: string, type: PolicyType, enabled: boolean): Promise<void> {
        await prisma.compliancePolicy.update({
            where: { organizationId_type: { organizationId, type } },
            data: { enabled }
        });
    }

    /**
     * Update policy rules
     */
    async updatePolicyRules(organizationId: string, type: PolicyType, rules: PolicyRule[]): Promise<CompliancePolicy> {
        // Ensure exists first (idempotent)
        await this.ensureDefaultPolicy(organizationId, type);

        return prisma.compliancePolicy.update({
            where: { organizationId_type: { organizationId, type } },
            data: { rules: rules as any }
        });
    }
}

// ═══════════════════════════════════════════════════════════════════
// COMPLIANCE GATE SERVICE
// Integrates with CI/CD pipelines as a "GitStream" gate
// ═══════════════════════════════════════════════════════════════════

export class ComplianceGateService {
    private engine = new PolicyEngine();

    /**
     * Evaluate a Git commit for compliance
     */
    async evaluateCommit(
        organizationId: string,
        commit: {
            sha: string;
            message: string;
            author: { email?: string; name?: string };
            files: string[];
            approvers?: string[];
            timestamp: Date;
        }
    ): Promise<PolicyEvaluationResult> {
        return this.engine.evaluate({
            policyType: 'GIT_COMMIT',
            input: {
                commit,
                files: commit.files,
                approvers: commit.approvers || [],
                timestamp: commit.timestamp,
            },
            context: { organizationId }
        });
    }

    /**
     * Evaluate a deployment request
     */
    async evaluateDeployment(
        organizationId: string,
        deployment: {
            environment: string;
            ciStatus: string;
            testCoverage: number;
            securityScanStatus: string;
            approvers: string[];
        }
    ): Promise<PolicyEvaluationResult> {
        return this.engine.evaluate({
            policyType: 'DEPLOYMENT',
            input: deployment,
            context: { organizationId }
        });
    }

    /**
     * Evaluate a data access request
     */
    async evaluateDataAccess(
        organizationId: string,
        request: {
            requestedOrgId: string;
            userOrgId: string;
            userRole: string;
            containsPII: boolean;
            justification?: string;
        }
    ): Promise<PolicyEvaluationResult> {
        return this.engine.evaluate({
            policyType: 'DATA_ACCESS',
            input: request,
            context: { organizationId }
        });
    }

    /**
     * Evaluate a budget request
     */
    async evaluateBudget(
        organizationId: string,
        request: {
            amount: number;
            requestedAmount: number;
            departmentBudgetRemaining: number;
            approvers: string[];
        }
    ): Promise<PolicyEvaluationResult> {
        return this.engine.evaluate({
            policyType: 'BUDGET_APPROVAL',
            input: request,
            context: { organizationId }
        });
    }

    /**
     * Get compliance dashboard metrics
     */
    async getComplianceMetrics(organizationId: string): Promise<{
        policiesEnabled: number;
        totalRules: number;
        recentViolations: number;
        complianceRate: number;
    }> {
        // Ensure policies exist first
        const policies = await this.engine.getPolicies(organizationId);

        // If no policies yet (and lazy loading hasn't triggered), we might have 0.
        // But getPolicies doesn't lazy load everything. The UI might trigger it.
        // Just return what we have.

        const enabledPolicies = policies.filter(p => p.enabled);
        const totalRules = enabledPolicies.reduce((sum, p) => sum + p.rules.length, 0);

        // Calculate real compliance rate from audit logs
        const recentLogs = await prisma.complianceAuditLog.findMany({
            where: {
                organizationId,
                timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }
        });

        const violationsCount = recentLogs.filter(l => l.decision === 'DENY').length;
        const totalOps = recentLogs.length;
        const complianceRate = totalOps > 0 ? ((totalOps - violationsCount) / totalOps) * 100 : 100;

        return {
            policiesEnabled: enabledPolicies.length,
            totalRules,
            recentViolations: violationsCount,
            complianceRate: Math.round(complianceRate * 10) / 10,
        };
    }
}

export const policyEngine = new PolicyEngine();
export const complianceGate = new ComplianceGateService();
