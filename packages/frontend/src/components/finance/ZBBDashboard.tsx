/**
 * Zero-Based Budgeting (ZBB) Dashboard
 * AI Agents for Spend Optimization
 */

import { useState } from 'react';
import { DollarSign, Skull, TrendingDown, AlertTriangle, Search, Bot, Users } from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';

// Mock zombie alerts
const mockZombieAlerts = [
    {
        id: '1',
        vendor: 'Salesforce',
        resource: '8 unused seats',
        monthlyCost: 1200,
        daysSinceActive: 45,
        type: 'SAAS_SEAT',
    },
    {
        id: '2',
        vendor: 'AWS',
        resource: 'Idle EC2 (m5.large)',
        monthlyCost: 139,
        daysSinceActive: 60,
        type: 'CLOUD_RESOURCE',
    },
    {
        id: '3',
        vendor: 'Slack',
        resource: '15 unused seats',
        monthlyCost: 180,
        daysSinceActive: 32,
        type: 'SAAS_SEAT',
    },
    {
        id: '4',
        vendor: 'GitHub',
        resource: '5 unused seats',
        monthlyCost: 105,
        daysSinceActive: 55,
        type: 'SAAS_SEAT',
    },
];

const mockUnprofitableCustomers = [
    { id: 'cust_1', name: 'Acme Corp', revenue: 5000, cost: 3500, margin: 30 },
    { id: 'cust_2', name: 'Beta Inc', revenue: 3200, cost: 2400, margin: 25 },
    { id: 'cust_3', name: 'Gamma LLC', revenue: 8000, cost: 5600, margin: 30 },
];

const zombiePieData = [
    { name: 'SaaS Seats', value: 1485, color: '#ef4444' },
    { name: 'Cloud Resources', value: 192, color: '#f97316' },
    { name: 'Subscriptions', value: 350, color: '#eab308' },
];

export function ZBBDashboard() {
    const [activeTab, setActiveTab] = useState<'zombies' | 'customers' | 'requests'>('zombies');

    const totalZombieSavings = mockZombieAlerts.reduce((sum, a) => sum + a.monthlyCost * 12, 0);

    return (
        <div className="zbb-dashboard">
            <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>
                💰 Zero-Based Budgeting
            </h2>

            {/* Key Metrics */}
            <div className="grid-4" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">Zombie Spend Found</span>
                        <Skull size={18} style={{ color: 'var(--color-error)' }} />
                    </div>
                    <span className="metric-value red">
                        ${(totalZombieSavings / 1000).toFixed(1)}K
                    </span>
                    <span className="text-sm text-muted">Annual savings potential</span>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">Active Alerts</span>
                        <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />
                    </div>
                    <span className="metric-value yellow">{mockZombieAlerts.length}</span>
                    <span className="text-sm text-muted">Awaiting action</span>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">Below-Margin Customers</span>
                        <Users size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <span className="metric-value">{mockUnprofitableCustomers.length}</span>
                    <span className="text-sm text-muted">&lt;70% gross margin</span>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">Pending Requests</span>
                        <Bot size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <span className="metric-value">7</span>
                    <span className="text-sm text-muted">Awaiting AI review</span>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-sm" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <TabButton
                    active={activeTab === 'zombies'}
                    onClick={() => setActiveTab('zombies')}
                    icon={<Skull size={16} />}
                    label="Zombie Spend"
                />
                <TabButton
                    active={activeTab === 'customers'}
                    onClick={() => setActiveTab('customers')}
                    icon={<TrendingDown size={16} />}
                    label="Unprofitable Customers"
                />
                <TabButton
                    active={activeTab === 'requests'}
                    onClick={() => setActiveTab('requests')}
                    icon={<DollarSign size={16} />}
                    label="Budget Requests"
                />
            </div>

            <div className="grid-2">
                {/* Main Content */}
                <div className="card">
                    {activeTab === 'zombies' && (
                        <>
                            <div className="card-header">
                                <h3 className="card-title">Zombie Resources Detected</h3>
                            </div>
                            <div className="flex-col gap-sm">
                                {mockZombieAlerts.map((alert) => (
                                    <ZombieAlertCard key={alert.id} alert={alert} />
                                ))}
                            </div>
                        </>
                    )}

                    {activeTab === 'customers' && (
                        <>
                            <div className="card-header">
                                <h3 className="card-title">Customers Below Margin Threshold</h3>
                            </div>
                            <div className="flex-col gap-sm">
                                {mockUnprofitableCustomers.map((customer) => (
                                    <CustomerMarginCard key={customer.id} customer={customer} />
                                ))}
                            </div>
                        </>
                    )}

                    {activeTab === 'requests' && (
                        <>
                            <div className="card-header">
                                <h3 className="card-title">AI Agent Review Queue</h3>
                            </div>
                            <div style={{
                                padding: 'var(--spacing-xl)',
                                textAlign: 'center',
                                color: 'var(--color-text-muted)',
                            }}>
                                <Bot size={48} style={{ marginBottom: 'var(--spacing-md)', opacity: 0.5 }} />
                                <p>7 budget requests awaiting AI interrogation</p>
                                <button className="btn btn-primary" style={{ marginTop: 'var(--spacing-md)' }}>
                                    View Pending Requests
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Summary Panel */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Zombie Spend by Category</h3>
                    </div>

                    <div style={{ height: 220 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={zombiePieData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    innerRadius={50}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: $${value}`}
                                    labelLine={false}
                                >
                                    {zombiePieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--color-bg-elevated)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                    }}
                                    formatter={(value: number) => [`$${value}/month`, 'Cost']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex-col gap-sm" style={{ marginTop: 'var(--spacing-md)' }}>
                        {zombiePieData.map((item) => (
                            <div key={item.name} className="flex justify-between items-center">
                                <div className="flex items-center gap-sm">
                                    <div style={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: 3,
                                        background: item.color,
                                    }} />
                                    <span>{item.name}</span>
                                </div>
                                <span style={{ fontFamily: 'var(--font-mono)' }}>
                                    ${item.value}/mo
                                </span>
                            </div>
                        ))}
                    </div>

                    <div style={{
                        marginTop: 'var(--spacing-lg)',
                        padding: 'var(--spacing-md)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}>
                        <div className="flex justify-between items-center">
                            <span style={{ fontWeight: 600 }}>Total Annual Savings</span>
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '1.5rem',
                                color: 'var(--color-error)',
                                fontWeight: 700,
                            }}>
                                ${(totalZombieSavings).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <button className="btn btn-danger" style={{ width: '100%', marginTop: 'var(--spacing-md)' }}>
                        <Search size={18} />
                        Run Full Spend Audit
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function TabButton({ active, onClick, icon, label }: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                background: active ? 'var(--color-accent-primary)' : 'var(--color-bg-secondary)',
                border: active ? 'none' : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: active ? 'white' : 'var(--color-text-primary)',
                cursor: 'pointer',
                fontWeight: active ? 600 : 400,
                transition: 'all 0.2s ease',
            }}
        >
            {icon}
            {label}
        </button>
    );
}

function ZombieAlertCard({ alert }: { alert: typeof mockZombieAlerts[0] }) {
    return (
        <div style={{
            padding: 'var(--spacing-md)',
            background: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
        }}>
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-sm">
                        <span style={{ fontWeight: 600 }}>{alert.vendor}</span>
                        <span className="badge badge-red">{alert.type.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm text-muted" style={{ marginTop: 4 }}>
                        {alert.resource} • Inactive for {alert.daysSinceActive} days
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '1.125rem',
                        fontWeight: 600,
                        color: 'var(--color-error)',
                    }}>
                        ${alert.monthlyCost}/mo
                    </div>
                    <span className="text-sm text-muted">
                        ${(alert.monthlyCost * 12).toLocaleString()}/yr
                    </span>
                </div>
            </div>
            <div className="flex gap-sm" style={{ marginTop: 'var(--spacing-sm)' }}>
                <button className="btn btn-sm btn-danger">Cancel</button>
                <button className="btn btn-sm btn-secondary">Investigate</button>
            </div>
        </div>
    );
}

function CustomerMarginCard({ customer }: { customer: typeof mockUnprofitableCustomers[0] }) {
    return (
        <div style={{
            padding: 'var(--spacing-md)',
            background: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
        }}>
            <div className="flex justify-between items-center">
                <span style={{ fontWeight: 600 }}>{customer.name}</span>
                <span className="badge badge-yellow">{customer.margin}% margin</span>
            </div>
            <div className="flex gap-lg" style={{ marginTop: 'var(--spacing-sm)' }}>
                <div>
                    <span className="text-sm text-muted">Revenue</span>
                    <div style={{ fontFamily: 'var(--font-mono)' }}>
                        ${customer.revenue.toLocaleString()}
                    </div>
                </div>
                <div>
                    <span className="text-sm text-muted">Infra Cost</span>
                    <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-error)' }}>
                        ${customer.cost.toLocaleString()}
                    </div>
                </div>
                <div>
                    <span className="text-sm text-muted">Gross Margin</span>
                    <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-warning)' }}>
                        ${(customer.revenue - customer.cost).toLocaleString()}
                    </div>
                </div>
            </div>
        </div>
    );
}
