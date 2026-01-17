/**
 * Operations Dashboard
 * Heijunka Board, Andon Status, and Velocity Metrics
 */

import { Activity, AlertTriangle, TrendingUp, Clock, Zap } from 'lucide-react';

export function OperationsDashboard() {
    return (
        <div className="operations-dashboard">
            <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>
                Operational Excellence
            </h2>

            {/* Key Metrics */}
            <div className="grid-4" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <MetricCard
                    label="Velocity"
                    value="22"
                    unit="pts/sprint"
                    icon={<TrendingUp size={18} />}
                    trend="+8%"
                    trendUp
                />
                <MetricCard
                    label="MTTR"
                    value="47"
                    unit="minutes"
                    icon={<Clock size={18} />}
                    trend="-12%"
                    trendUp
                />
                <MetricCard
                    label="System Health"
                    value="GREEN"
                    icon={<Activity size={18} />}
                    status="green"
                />
                <MetricCard
                    label="Active Incidents"
                    value="0"
                    icon={<AlertTriangle size={18} />}
                    status="green"
                />
            </div>

            <div className="grid-2">
                {/* Heijunka Board Preview */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Digital Heijunka Board</h3>
                        <button className="btn btn-secondary">View Full Board</button>
                    </div>

                    <HeijunkaPitchCard
                        name="Sprint 2"
                        status="OPEN"
                        capacity={20}
                        currentLoad={8}
                        featurePoints={5}
                        bugPoints={3}
                        debtPoints={0}
                    />

                    <div style={{ marginTop: 'var(--spacing-md)' }}>
                        <h4 className="text-sm text-muted" style={{ marginBottom: 'var(--spacing-sm)' }}>
                            Product Mix Analysis
                        </h4>
                        <ProductMixBar feature={62.5} bug={37.5} debt={0} />
                        <div className="flex justify-between text-sm" style={{ marginTop: 'var(--spacing-xs)' }}>
                            <span className="text-muted">Target: 60/20/20</span>
                            <span style={{ color: 'var(--color-warning)' }}>Bug ratio high</span>
                        </div>
                    </div>
                </div>

                {/* Andon System */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Jidoka / Andon System</h3>
                        <span className="badge badge-green">
                            <Zap size={12} />
                            Pipeline Active
                        </span>
                    </div>

                    <div
                        style={{
                            background: 'var(--color-bg-tertiary)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--spacing-lg)',
                            textAlign: 'center',
                        }}
                    >
                        <div
                            className="health-indicator green"
                            style={{
                                width: 48,
                                height: 48,
                                margin: '0 auto var(--spacing-md)',
                            }}
                        />
                        <h4 style={{ marginBottom: 'var(--spacing-xs)' }}>All Systems Operational</h4>
                        <p className="text-sm text-muted">
                            Last incident resolved 3 days ago
                        </p>
                    </div>

                    <div style={{ marginTop: 'var(--spacing-lg)' }}>
                        <h4 className="text-sm text-muted" style={{ marginBottom: 'var(--spacing-sm)' }}>
                            Recent Activity
                        </h4>
                        <div className="flex-col gap-sm">
                            <AndonEventRow
                                type="resolved"
                                message="CI Pipeline recovered (MTTR: 23m)"
                                time="3 days ago"
                            />
                            <AndonEventRow
                                type="resolved"
                                message="Coverage drop fixed (87% → 91%)"
                                time="1 week ago"
                            />
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

interface MetricCardProps {
    label: string;
    value: string;
    unit?: string;
    icon: React.ReactNode;
    trend?: string;
    trendUp?: boolean;
    status?: 'green' | 'yellow' | 'red';
}

function MetricCard({ label, value, unit, icon, trend, trendUp, status }: MetricCardProps) {
    return (
        <div className="metric-card">
            <div className="flex items-center justify-between">
                <span className="metric-label">{label}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>{icon}</span>
            </div>
            <div className="flex items-baseline gap-sm">
                <span className={`metric-value ${status || ''}`}>{value}</span>
                {unit && <span className="text-sm text-muted">{unit}</span>}
            </div>
            {trend && (
                <span
                    style={{
                        fontSize: '0.75rem',
                        color: trendUp ? 'var(--color-success)' : 'var(--color-error)',
                    }}
                >
                    {trend} vs last period
                </span>
            )}
        </div>
    );
}

interface HeijunkaPitchCardProps {
    name: string;
    status: string;
    capacity: number;
    currentLoad: number;
    featurePoints: number;
    bugPoints: number;
    debtPoints: number;
}

function HeijunkaPitchCard({
    name,
    status,
    capacity,
    currentLoad,
    featurePoints,
    bugPoints,
    debtPoints,
}: HeijunkaPitchCardProps) {
    const loadPercent = (currentLoad / capacity) * 100;
    const loadClass = loadPercent > 90 ? 'danger' : loadPercent > 70 ? 'warning' : '';

    return (
        <div className="heijunka-pitch">
            <div className="heijunka-pitch-header">
                <span style={{ fontWeight: 600 }}>{name}</span>
                <span className="badge badge-green">{status}</span>
            </div>
            <div style={{ padding: 'var(--spacing-md)' }}>
                <div className="flex justify-between text-sm mb-md">
                    <span className="text-muted">Capacity</span>
                    <span className="font-mono">
                        {currentLoad} / {capacity} pts
                    </span>
                </div>
                <div className="heijunka-capacity-bar">
                    <div
                        className={`fill ${loadClass}`}
                        style={{ width: `${loadPercent}%` }}
                    />
                </div>
                <div className="flex gap-md mt-md text-sm">
                    <span style={{ color: 'var(--color-info)' }}>
                        ⬤ Features: {featurePoints}
                    </span>
                    <span style={{ color: 'var(--color-error)' }}>
                        ⬤ Bugs: {bugPoints}
                    </span>
                    <span style={{ color: 'var(--color-warning)' }}>
                        ⬤ Debt: {debtPoints}
                    </span>
                </div>
            </div>
        </div>
    );
}

interface ProductMixBarProps {
    feature: number;
    bug: number;
    debt: number;
}

function ProductMixBar({ feature, bug, debt }: ProductMixBarProps) {
    return (
        <div
            style={{
                height: 8,
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
                display: 'flex',
            }}
        >
            <div
                style={{
                    width: `${feature}%`,
                    background: 'var(--color-info)',
                }}
            />
            <div
                style={{
                    width: `${bug}%`,
                    background: 'var(--color-error)',
                }}
            />
            <div
                style={{
                    width: `${debt}%`,
                    background: 'var(--color-warning)',
                }}
            />
        </div>
    );
}

interface AndonEventRowProps {
    type: 'active' | 'claimed' | 'resolved';
    message: string;
    time: string;
}

function AndonEventRow({ type, message, time }: AndonEventRowProps) {
    const colors = {
        active: 'var(--color-error)',
        claimed: 'var(--color-warning)',
        resolved: 'var(--color-success)',
    };

    return (
        <div
            className="flex items-center gap-sm"
            style={{
                padding: 'var(--spacing-sm)',
                background: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
            }}
        >
            <div
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: colors[type],
                }}
            />
            <span className="text-sm" style={{ flex: 1 }}>
                {message}
            </span>
            <span className="text-sm text-muted">{time}</span>
        </div>
    );
}
