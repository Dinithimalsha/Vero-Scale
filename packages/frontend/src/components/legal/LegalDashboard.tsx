/**
 * Legal Dashboard
 * IP Airlock Status, Vesting Tracker, Alerts
 */

import { Shield, Clock, FileCheck, AlertTriangle, UserCheck, Calendar } from 'lucide-react';

export function LegalDashboard() {
    return (
        <div className="legal-dashboard">
            <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>
                Legal & Governance
            </h2>

            {/* Alerts */}
            <div
                style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    marginBottom: 'var(--spacing-xl)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-md)',
                }}
            >
                <AlertTriangle size={24} style={{ color: 'var(--color-warning)' }} />
                <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-warning)' }}>
                        Cliff Approval Required
                    </span>
                    <p className="text-sm text-muted">
                        Jordan Developer hits 1-year cliff in 29 days. Conduct performance review before equity vests.
                    </p>
                </div>
                <button className="btn btn-primary">Review Now</button>
            </div>

            <div className="grid-4" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">IP Coverage</span>
                        <Shield size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <div className="flex items-baseline gap-sm">
                        <span className="metric-value yellow">67%</span>
                    </div>
                    <span className="text-sm text-muted">
                        2/3 team members signed
                    </span>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">Pending Signatures</span>
                        <FileCheck size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <span className="metric-value red">1</span>
                    <span className="text-sm text-muted">
                        Blocking code access
                    </span>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">Active Grants</span>
                        <UserCheck size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <span className="metric-value">1</span>
                    <span className="text-sm text-muted">
                        10,000 shares allocated
                    </span>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">Cliff Alerts</span>
                        <Calendar size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <span className="metric-value yellow">1</span>
                    <span className="text-sm text-muted">
                        In next 30 days
                    </span>
                </div>
            </div>

            <div className="grid-2">
                {/* IP Airlock Panel */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <Shield size={18} style={{ marginRight: 8 }} />
                            IP Airlock Status
                        </h3>
                    </div>

                    <div className="flex-col gap-sm">
                        <AgreementRow
                            name="Alex CEO"
                            email="ceo@acme.com"
                            role="Owner"
                            status="signed"
                            date="Dec 15, 2025"
                        />
                        <AgreementRow
                            name="Jordan Developer"
                            email="dev@acme.com"
                            role="Member"
                            status="signed"
                            date="Dec 17, 2025"
                        />
                        <AgreementRow
                            name="Casey Contractor"
                            email="contractor@external.com"
                            role="Contractor"
                            status="pending"
                            type="CONTRACTOR_IP"
                        />
                    </div>

                    <div
                        style={{
                            marginTop: 'var(--spacing-lg)',
                            padding: 'var(--spacing-md)',
                            background: 'var(--color-bg-tertiary)',
                            borderRadius: 'var(--radius-md)',
                        }}
                    >
                        <p className="text-sm">
                            <span style={{ color: 'var(--color-error)', fontWeight: 600 }}>⚠ Access Blocked:</span>{' '}
                            Casey Contractor cannot access source code until IP agreement is signed.
                        </p>
                    </div>
                </div>

                {/* Vesting Tracker */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <Clock size={18} style={{ marginRight: 8 }} />
                            Equity Vesting Tracker
                        </h3>
                    </div>

                    <VestingGrantCard
                        name="Jordan Developer"
                        totalShares={10000}
                        vestedShares={0}
                        cliffDate="Feb 15, 2026"
                        cliffApproved={false}
                        is83bFiled={true}
                        daysToCliff={29}
                    />

                    <div style={{ marginTop: 'var(--spacing-lg)' }}>
                        <h4 className="text-sm text-muted" style={{ marginBottom: 'var(--spacing-sm)' }}>
                            Upcoming Actions
                        </h4>
                        <div className="flex-col gap-sm">
                            <AlertRow
                                message="Jordan Developer: Cliff approval required"
                                date="Feb 15, 2026"
                                urgent
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

interface AgreementRowProps {
    name: string;
    email: string;
    role: string;
    status: 'signed' | 'pending' | 'expired';
    date?: string;
    type?: string;
}

function AgreementRow({ name, email, status, type }: AgreementRowProps) {
    const statusConfig = {
        signed: { badge: 'badge-green', label: 'Signed', icon: '✓' },
        pending: { badge: 'badge-yellow', label: 'Pending', icon: '⏳' },
        expired: { badge: 'badge-red', label: 'Expired', icon: '!' },
    };

    const config = statusConfig[status];

    return (
        <div
            className="flex items-center justify-between"
            style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                background: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-md)',
            }}
        >
            <div>
                <span style={{ fontWeight: 500 }}>{name}</span>
                <p className="text-sm text-muted">{email}</p>
            </div>
            <div className="flex items-center gap-md">
                <span className="text-sm text-muted">{type || 'PIIAA'}</span>
                <span className={`badge ${config.badge}`}>
                    {config.icon} {config.label}
                </span>
            </div>
        </div>
    );
}

interface VestingGrantCardProps {
    name: string;
    totalShares: number;
    vestedShares: number;
    cliffDate: string;
    cliffApproved: boolean;
    is83bFiled: boolean;
    daysToCliff: number;
}

function VestingGrantCard({
    name,
    totalShares,
    vestedShares,
    cliffApproved,
    is83bFiled,
    daysToCliff,
}: VestingGrantCardProps) {
    const vestedPercent = (vestedShares / totalShares) * 100;
    const cliffPercent = 25; // Standard 1-year cliff = 25%

    return (
        <div
            style={{
                background: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-md)',
            }}
        >
            <div className="flex justify-between items-center mb-md">
                <span style={{ fontWeight: 600 }}>{name}</span>
                <span className="text-sm text-muted">
                    {vestedShares.toLocaleString()} / {totalShares.toLocaleString()} shares
                </span>
            </div>

            {/* Vesting Progress */}
            <div
                style={{
                    height: 8,
                    background: 'var(--color-bg-elevated)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                    position: 'relative',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        left: `${cliffPercent}%`,
                        top: 0,
                        bottom: 0,
                        width: 2,
                        background: 'var(--color-warning)',
                    }}
                />
                <div
                    style={{
                        width: `${vestedPercent}%`,
                        height: '100%',
                        background: 'var(--color-accent-primary)',
                    }}
                />
            </div>

            <div className="flex justify-between text-sm mt-md">
                <span className="text-muted">Vested: {vestedPercent.toFixed(0)}%</span>
                <span style={{ color: 'var(--color-warning)' }}>
                    Cliff ({cliffPercent}%) in {daysToCliff} days
                </span>
            </div>

            {/* Status Badges */}
            <div className="flex gap-sm mt-md">
                <span className={`badge ${is83bFiled ? 'badge-green' : 'badge-red'}`}>
                    83(b): {is83bFiled ? 'Filed ✓' : 'MISSING'}
                </span>
                <span className={`badge ${cliffApproved ? 'badge-green' : 'badge-yellow'}`}>
                    Cliff: {cliffApproved ? 'Approved' : 'Pending Review'}
                </span>
            </div>
        </div>
    );
}

interface AlertRowProps {
    type: 'cliff' | '83b';
    message: string;
    date: string;
    urgent?: boolean;
}

function AlertRow({ message, date, urgent }: Omit<AlertRowProps, 'type'>) {
    return (
        <div
            className="flex items-center gap-sm"
            style={{
                padding: 'var(--spacing-sm)',
                background: urgent
                    ? 'rgba(245, 158, 11, 0.1)'
                    : 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                border: urgent ? '1px solid rgba(245, 158, 11, 0.2)' : 'none',
            }}
        >
            <AlertTriangle
                size={14}
                style={{ color: urgent ? 'var(--color-warning)' : 'var(--color-text-muted)' }}
            />
            <span className="text-sm" style={{ flex: 1 }}>
                {message}
            </span>
            <span className="text-sm text-muted">{date}</span>
        </div>
    );
}
