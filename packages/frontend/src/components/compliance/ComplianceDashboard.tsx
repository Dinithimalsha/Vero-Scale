/**
 * Policy Compliance Dashboard
 * Policy-as-Code Evaluation & Monitoring
 */

import { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, FileCode, GitBranch, Database, DollarSign } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

// Mock policy data
const mockPolicies = [
    {
        type: 'GIT_COMMIT',
        name: 'Git Commit Compliance',
        enabled: true,
        rulesCount: 5,
        recentViolations: 3,
    },
    {
        type: 'DEPLOYMENT',
        name: 'Deployment Gate',
        enabled: true,
        rulesCount: 3,
        recentViolations: 1,
    },
    {
        type: 'DATA_ACCESS',
        name: 'Data Access Control',
        enabled: true,
        rulesCount: 2,
        recentViolations: 0,
    },
    {
        type: 'BUDGET_APPROVAL',
        name: 'Budget Approval',
        enabled: false,
        rulesCount: 2,
        recentViolations: 0,
    },
];

const mockAuditLog = [
    {
        id: '1',
        policyType: 'GIT_COMMIT',
        decision: 'DENY',
        reason: 'No JIRA ticket reference',
        timestamp: '2 min ago',
    },
    {
        id: '2',
        policyType: 'DEPLOYMENT',
        decision: 'ALLOW',
        reason: 'All checks passed',
        timestamp: '15 min ago',
    },
    {
        id: '3',
        policyType: 'GIT_COMMIT',
        decision: 'WARN',
        reason: 'Friday deployment',
        timestamp: '1 hour ago',
    },
    {
        id: '4',
        policyType: 'DATA_ACCESS',
        decision: 'ALLOW',
        reason: 'PII justification provided',
        timestamp: '2 hours ago',
    },
    {
        id: '5',
        policyType: 'GIT_COMMIT',
        decision: 'DENY',
        reason: 'Billing directory requires finance approval',
        timestamp: '3 hours ago',
    },
];

const complianceHistory = [
    { day: 'Mon', allow: 45, deny: 3, warn: 2 },
    { day: 'Tue', allow: 52, deny: 5, warn: 4 },
    { day: 'Wed', allow: 38, deny: 2, warn: 1 },
    { day: 'Thu', allow: 61, deny: 4, warn: 3 },
    { day: 'Fri', allow: 28, deny: 8, warn: 6 },
    { day: 'Sat', allow: 12, deny: 1, warn: 0 },
    { day: 'Sun', allow: 8, deny: 0, warn: 1 },
];

export function ComplianceDashboard() {
    const [selectedPolicy, setSelectedPolicy] = useState(mockPolicies[0]);

    const totalRules = mockPolicies.reduce((sum, p) => sum + p.rulesCount, 0);
    const totalViolations = mockPolicies.reduce((sum, p) => sum + p.recentViolations, 0);
    const enabledPolicies = mockPolicies.filter(p => p.enabled).length;

    return (
        <div className="compliance-dashboard">
            <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>
                🛡️ Policy Compliance
            </h2>

            {/* Key Metrics */}
            <div className="grid-4" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">Compliance Rate</span>
                        <Shield size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <span className="metric-value green">94.5%</span>
                    <span className="badge badge-green" style={{ marginTop: 'var(--spacing-xs)' }}>
                        Healthy
                    </span>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">Policies Enabled</span>
                        <FileCode size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <div className="flex items-baseline gap-sm">
                        <span className="metric-value">{enabledPolicies}</span>
                        <span className="text-sm text-muted">/ {mockPolicies.length}</span>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">Total Rules</span>
                        <CheckCircle size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <span className="metric-value">{totalRules}</span>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">Violations (24h)</span>
                        <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />
                    </div>
                    <span className="metric-value yellow">{totalViolations}</span>
                </div>
            </div>

            <div className="grid-2">
                {/* Policy List */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Active Policies</h3>
                    </div>
                    <div className="flex-col gap-sm">
                        {mockPolicies.map((policy) => (
                            <PolicyCard
                                key={policy.type}
                                policy={policy}
                                selected={selectedPolicy.type === policy.type}
                                onClick={() => setSelectedPolicy(policy)}
                            />
                        ))}
                    </div>
                </div>

                {/* Compliance Chart */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Weekly Evaluation History</h3>
                    </div>
                    <div style={{ height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={complianceHistory}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="day" stroke="var(--color-text-muted)" fontSize={12} />
                                <YAxis stroke="var(--color-text-muted)" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--color-bg-elevated)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                    }}
                                />
                                <Bar dataKey="allow" stackId="a" fill="#22c55e" name="Allowed" />
                                <Bar dataKey="warn" stackId="a" fill="#eab308" name="Warnings" />
                                <Bar dataKey="deny" stackId="a" fill="#ef4444" name="Denied" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex gap-lg justify-center" style={{ marginTop: 'var(--spacing-md)' }}>
                        <LegendItem color="#22c55e" label="Allowed" />
                        <LegendItem color="#eab308" label="Warnings" />
                        <LegendItem color="#ef4444" label="Denied" />
                    </div>
                </div>
            </div>

            {/* Audit Log */}
            <div className="card" style={{ marginTop: 'var(--spacing-lg)' }}>
                <div className="card-header">
                    <h3 className="card-title">Recent Audit Log</h3>
                </div>
                <div className="flex-col gap-xs">
                    {mockAuditLog.map((entry) => (
                        <AuditLogEntry key={entry.id} entry={entry} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function PolicyCard({ policy, selected, onClick }: {
    policy: typeof mockPolicies[0];
    selected: boolean;
    onClick: () => void;
}) {
    const getIcon = () => {
        switch (policy.type) {
            case 'GIT_COMMIT': return <GitBranch size={18} />;
            case 'DEPLOYMENT': return <Shield size={18} />;
            case 'DATA_ACCESS': return <Database size={18} />;
            case 'BUDGET_APPROVAL': return <DollarSign size={18} />;
            default: return <FileCode size={18} />;
        }
    };

    return (
        <div
            onClick={onClick}
            style={{
                padding: 'var(--spacing-md)',
                background: selected ? 'rgba(99, 102, 241, 0.1)' : 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: selected
                    ? '1px solid var(--color-accent-primary)'
                    : '1px solid var(--color-border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                opacity: policy.enabled ? 1 : 0.6,
            }}
        >
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-sm">
                    <span style={{ color: 'var(--color-text-muted)' }}>{getIcon()}</span>
                    <span style={{ fontWeight: 500 }}>{policy.name}</span>
                </div>
                <div className="flex items-center gap-sm">
                    {policy.recentViolations > 0 && (
                        <span className="badge badge-red">{policy.recentViolations}</span>
                    )}
                    <span className={`badge ${policy.enabled ? 'badge-green' : 'badge-gray'}`}>
                        {policy.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
            </div>
            <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                {policy.rulesCount} active rules
            </div>
        </div>
    );
}

function AuditLogEntry({ entry }: { entry: typeof mockAuditLog[0] }) {
    const getDecisionIcon = () => {
        switch (entry.decision) {
            case 'ALLOW': return <CheckCircle size={16} style={{ color: '#22c55e' }} />;
            case 'DENY': return <XCircle size={16} style={{ color: '#ef4444' }} />;
            case 'WARN': return <AlertTriangle size={16} style={{ color: '#eab308' }} />;
        }
    };

    const getDecisionColor = () => {
        switch (entry.decision) {
            case 'ALLOW': return '#22c55e';
            case 'DENY': return '#ef4444';
            case 'WARN': return '#eab308';
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-md)',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            background: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-sm)',
        }}>
            {getDecisionIcon()}
            <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                padding: '2px 6px',
                background: 'var(--color-bg-tertiary)',
                borderRadius: 4,
            }}>
                {entry.policyType}
            </span>
            <span style={{ flex: 1 }}>{entry.reason}</span>
            <span style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                color: getDecisionColor(),
            }}>
                {entry.decision}
            </span>
            <span className="text-sm text-muted">{entry.timestamp}</span>
        </div>
    );
}

function LegendItem({ color, label }: { color: string; label: string }) {
    return (
        <div className="flex items-center gap-xs">
            <div style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: color,
            }} />
            <span className="text-sm">{label}</span>
        </div>
    );
}
