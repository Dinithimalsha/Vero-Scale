/**
 * Finance Dashboard
 * Unit Economics, LTV:CAC Gauge, Rule of 40
 */

import { DollarSign, TrendingUp, AlertCircle, Activity } from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

// Mock J-Curve data
const jCurveData = [
    { month: 0, value: -2000, label: 'CAC' },
    { month: 1, value: -1650, label: '' },
    { month: 2, value: -1300, label: '' },
    { month: 3, value: -950, label: '' },
    { month: 4, value: -600, label: '' },
    { month: 5, value: -250, label: '' },
    { month: 6, value: 100, label: 'Payback' },
    { month: 7, value: 450, label: '' },
    { month: 8, value: 800, label: '' },
    { month: 9, value: 1150, label: '' },
    { month: 10, value: 1500, label: '' },
    { month: 11, value: 1850, label: '' },
    { month: 12, value: 2200, label: 'LTV' },
];

export function FinanceDashboard() {
    return (
        <div className="finance-dashboard">
            <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>
                Financial Intelligence
            </h2>

            {/* Key Metrics */}
            <div className="grid-4" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">LTV:CAC Ratio</span>
                        <DollarSign size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <div className="flex items-baseline gap-sm">
                        <span className="metric-value green">5.83</span>
                        <span className="text-sm text-muted">: 1</span>
                    </div>
                    <span className="badge badge-green" style={{ marginTop: 'var(--spacing-xs)' }}>
                        Healthy
                    </span>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">CAC Payback</span>
                        <Activity size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <div className="flex items-baseline gap-sm">
                        <span className="metric-value">5.7</span>
                        <span className="text-sm text-muted">months</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>
                        Below runway ✓
                    </span>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">Rule of 40</span>
                        <TrendingUp size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <div className="flex items-baseline gap-sm">
                        <span className="metric-value yellow">35</span>
                    </div>
                    <span className="badge badge-yellow" style={{ marginTop: 'var(--spacing-xs)' }}>
                        Needs Attention
                    </span>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">Runway</span>
                        <AlertCircle size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <div className="flex items-baseline gap-sm">
                        <span className="metric-value">5</span>
                        <span className="text-sm text-muted">months</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        $250K cash / $50K burn
                    </span>
                </div>
            </div>

            <div className="grid-2">
                {/* J-Curve Visualizer */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">J-Curve: Customer Economics</h3>
                    </div>
                    <div style={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={jCurveData}>
                                <defs>
                                    <linearGradient id="jCurveGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="month"
                                    stroke="var(--color-text-muted)"
                                    fontSize={12}
                                    tickFormatter={(m) => `M${m}`}
                                />
                                <YAxis
                                    stroke="var(--color-text-muted)"
                                    fontSize={12}
                                    tickFormatter={(v) => `$${v / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--color-bg-elevated)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                    }}
                                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Cumulative']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fill="url(#jCurveGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between text-sm mt-md">
                        <span className="text-muted">CAC: $2,000</span>
                        <span style={{ color: 'var(--color-success)' }}>Payback: Month 6</span>
                        <span style={{ color: 'var(--color-accent-primary)' }}>LTV: $11,667</span>
                    </div>
                </div>

                {/* Unit Economics Breakdown */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Unit Economics Breakdown</h3>
                    </div>

                    <div className="flex-col gap-md">
                        <UnitEconomicsRow
                            label="ARPA"
                            value="$500"
                            subtext="Avg Revenue Per Account"
                        />
                        <UnitEconomicsRow
                            label="Gross Margin"
                            value="70%"
                            subtext="(Revenue - COGS) / Revenue"
                            status="good"
                        />
                        <UnitEconomicsRow
                            label="Churn Rate"
                            value="3%"
                            subtext="Monthly customer churn"
                            status="good"
                        />
                        <UnitEconomicsRow
                            label="LTV"
                            value="$11,667"
                            subtext="(ARPA × Margin) / Churn"
                            status="good"
                        />
                        <UnitEconomicsRow
                            label="CAC"
                            value="$2,000"
                            subtext="S&M Spend / New Customers"
                        />

                        <div
                            style={{
                                marginTop: 'var(--spacing-md)',
                                padding: 'var(--spacing-md)',
                                background: 'rgba(34, 197, 94, 0.1)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                            }}
                        >
                            <div className="flex justify-between items-center">
                                <span style={{ fontWeight: 600 }}>LTV:CAC Verdict</span>
                                <span
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '1.5rem',
                                        color: 'var(--color-success)',
                                        fontWeight: 700,
                                    }}
                                >
                                    5.83:1
                                </span>
                            </div>
                            <p className="text-sm text-muted" style={{ marginTop: 'var(--spacing-xs)' }}>
                                Ratio &gt;3 indicates sustainable economics. Consider increasing
                                marketing spend to accelerate growth.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

interface UnitEconomicsRowProps {
    label: string;
    value: string;
    subtext: string;
    status?: 'good' | 'warning' | 'bad';
}

function UnitEconomicsRow({ label, value, subtext, status }: UnitEconomicsRowProps) {
    const statusColors = {
        good: 'var(--color-success)',
        warning: 'var(--color-warning)',
        bad: 'var(--color-error)',
    };

    return (
        <div
            className="flex justify-between items-center"
            style={{
                padding: 'var(--spacing-sm) 0',
                borderBottom: '1px solid var(--color-border)',
            }}
        >
            <div>
                <span style={{ fontWeight: 500 }}>{label}</span>
                <p className="text-sm text-muted">{subtext}</p>
            </div>
            <span
                style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: status ? statusColors[status] : 'var(--color-text-primary)',
                }}
            >
                {value}
            </span>
        </div>
    );
}
