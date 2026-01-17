/**
 * Muda Metrics Dashboard - 7 Wastes Visualization
 * Visual representation of Toyota's waste identification for software
 */

import { useState, useEffect } from 'react';
import {
    Clock,
    Package,
    RefreshCw,
    TrendingDown,
    AlertTriangle,
    CheckCircle2,
    Users,
    Flag
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface WaitingTimeMetrics {
    averageWaitHours: number;
    totalWaitHours: number;
    taskCount: number;
    byStage: {
        backlogToReady: number;
        readyToInProgress: number;
        inProgressToReview: number;
        reviewToDone: number;
    };
    longestWaitingTasks: Array<{
        id: string;
        title: string;
        waitingHours: number;
        currentStatus: string;
    }>;
}

interface WipInventoryValuation {
    totalWipValue: number;
    taskCount: number;
    byType: {
        feature: { count: number; value: number };
        bug: { count: number; value: number };
        debt: { count: number; value: number };
    };
    averageAge: number;
    oldestItems: Array<{
        id: string;
        title: string;
        ageDays: number;
        estimatedValue: number;
    }>;
}

interface ContextSwitchingMetrics {
    averageSwitchesPerDay: number;
    assigneeMetrics: Array<{
        userId: string;
        userName: string;
        activeTasks: number;
        switchesLastWeek: number;
        focusScore: number;
    }>;
    recommendations: string[];
}

interface OverproductionMetrics {
    staleFlagCount: number;
    unusedFeatureCount: number;
    totalStaleFlags: Array<{
        id: string;
        flagKey: string;
        flagName: string;
        daysSinceDeployment: number;
        adoptionPercent: number;
    }>;
    potentialWastedEffort: number;
}

interface MudaOverview {
    waitingTime: WaitingTimeMetrics;
    wipInventory: WipInventoryValuation;
    contextSwitching: ContextSwitchingMetrics;
    overproduction: OverproductionMetrics;
    totalWasteScore: number;
    recommendations: string[];
}

// ═══════════════════════════════════════════════════════════════════
// MOCK DATA (Replace with API calls)
// ═══════════════════════════════════════════════════════════════════

const mockData: MudaOverview = {
    waitingTime: {
        averageWaitHours: 18,
        totalWaitHours: 342,
        taskCount: 19,
        byStage: {
            backlogToReady: 45,
            readyToInProgress: 12,
            inProgressToReview: 8,
            reviewToDone: 25,
        },
        longestWaitingTasks: [
            { id: '1', title: 'API Rate Limiting', waitingHours: 72, currentStatus: 'IN_REVIEW' },
            { id: '2', title: 'Dashboard Redesign', waitingHours: 48, currentStatus: 'BLOCKED' },
            { id: '3', title: 'Mobile Auth', waitingHours: 36, currentStatus: 'IN_REVIEW' },
        ],
    },
    wipInventory: {
        totalWipValue: 45600,
        taskCount: 12,
        byType: {
            feature: { count: 6, value: 28000 },
            bug: { count: 4, value: 12000 },
            debt: { count: 2, value: 5600 },
        },
        averageAge: 8,
        oldestItems: [
            { id: '1', title: 'Legacy Migration', ageDays: 21, estimatedValue: 8400 },
            { id: '2', title: 'Performance Optimization', ageDays: 14, estimatedValue: 5200 },
        ],
    },
    contextSwitching: {
        averageSwitchesPerDay: 4.2,
        assigneeMetrics: [
            { userId: '1', userName: 'Alex Chen', activeTasks: 4, switchesLastWeek: 18, focusScore: 50 },
            { userId: '2', userName: 'Sarah Kim', activeTasks: 2, switchesLastWeek: 8, focusScore: 75 },
            { userId: '3', userName: 'Mike Ross', activeTasks: 5, switchesLastWeek: 24, focusScore: 25 },
        ],
        recommendations: ['Mike Ross has 5 active tasks. Consider reducing WIP.'],
    },
    overproduction: {
        staleFlagCount: 3,
        unusedFeatureCount: 3,
        totalStaleFlags: [
            { id: '1', flagKey: 'new_onboarding_v2', flagName: 'New Onboarding V2', daysSinceDeployment: 45, adoptionPercent: 2 },
            { id: '2', flagKey: 'dark_mode', flagName: 'Dark Mode', daysSinceDeployment: 38, adoptionPercent: 4 },
            { id: '3', flagKey: 'export_pdf', flagName: 'Export to PDF', daysSinceDeployment: 32, adoptionPercent: 1 },
        ],
        potentialWastedEffort: 24,
    },
    totalWasteScore: 42,
    recommendations: [
        'High waiting time in PR review stage. Consider adding reviewers.',
        'WIP items are aging. Focus on completing in-flight work.',
        '3 stale feature flags detected. Consider removing unused features.',
    ],
};

// ═══════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function WasteScoreGauge({ score }: { score: number }) {
    const getColor = () => {
        if (score <= 30) return 'var(--health-green)';
        if (score <= 60) return 'var(--health-yellow)';
        return 'var(--health-red)';
    };

    const getLabel = () => {
        if (score <= 30) return 'Lean';
        if (score <= 60) return 'Moderate Waste';
        return 'High Waste';
    };

    return (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                Total Waste Score
            </h3>
            <div style={{ position: 'relative', width: '150px', height: '150px', margin: '0 auto' }}>
                <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                        cx="50" cy="50" r="40"
                        fill="none"
                        stroke="var(--border)"
                        strokeWidth="10"
                    />
                    <circle
                        cx="50" cy="50" r="40"
                        fill="none"
                        stroke={getColor()}
                        strokeWidth="10"
                        strokeDasharray={`${score * 2.51} 251`}
                        strokeLinecap="round"
                    />
                </svg>
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: getColor() }}>
                        {score}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>/100</div>
                </div>
            </div>
            <div style={{ marginTop: '1rem', color: getColor(), fontWeight: 500 }}>
                {getLabel()}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Lower is better
            </p>
        </div>
    );
}

function WaitingTimeCard({ data }: { data: WaitingTimeMetrics }) {
    return (
        <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Clock size={24} style={{ color: 'var(--health-yellow)' }} />
                <h3>Waiting Time</h3>
            </div>

            <div className="metric-row" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <div className="metric-value" style={{ fontSize: '2rem' }}>
                        {data.averageWaitHours}h
                    </div>
                    <div className="metric-label">Avg Wait (per task)</div>
                </div>
                <div>
                    <div className="metric-value">{data.totalWaitHours}h</div>
                    <div className="metric-label">Total Wait</div>
                </div>
                <div>
                    <div className="metric-value">{data.taskCount}</div>
                    <div className="metric-label">Tasks Tracked</div>
                </div>
            </div>

            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>Wait by Stage (hours)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {Object.entries(data.byStage).map(([stage, hours]) => (
                    <div key={stage} className="metric-pill">
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {stage.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span style={{ fontWeight: 600 }}>{hours}h</span>
                    </div>
                ))}
            </div>

            {data.longestWaitingTasks.length > 0 && (
                <>
                    <h4 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                        Longest Waiting
                    </h4>
                    {data.longestWaitingTasks.slice(0, 3).map(task => (
                        <div key={task.id} className="task-item" style={{ marginBottom: '0.5rem' }}>
                            <span style={{ flex: 1 }}>{task.title}</span>
                            <span className="badge badge-warning">{task.waitingHours}h</span>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}

function WipInventoryCard({ data }: { data: WipInventoryValuation }) {
    return (
        <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Package size={24} style={{ color: 'var(--accent-secondary)' }} />
                <h3>WIP Inventory</h3>
            </div>

            <div className="metric-row" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <div className="metric-value" style={{ fontSize: '2rem', color: 'var(--health-yellow)' }}>
                        ${data.totalWipValue.toLocaleString()}
                    </div>
                    <div className="metric-label">Capital Tied Up</div>
                </div>
                <div>
                    <div className="metric-value">{data.taskCount}</div>
                    <div className="metric-label">Items in WIP</div>
                </div>
                <div>
                    <div className="metric-value">{data.averageAge}d</div>
                    <div className="metric-label">Avg Age</div>
                </div>
            </div>

            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>By Type</h4>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <div className="metric-pill" style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ color: 'var(--accent-primary)' }}>Features</div>
                    <div>{data.byType.feature.count} (${data.byType.feature.value.toLocaleString()})</div>
                </div>
                <div className="metric-pill" style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ color: 'var(--health-red)' }}>Bugs</div>
                    <div>{data.byType.bug.count} (${data.byType.bug.value.toLocaleString()})</div>
                </div>
                <div className="metric-pill" style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>Debt</div>
                    <div>{data.byType.debt.count} (${data.byType.debt.value.toLocaleString()})</div>
                </div>
            </div>

            {data.oldestItems.length > 0 && (
                <>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>Oldest Items</h4>
                    {data.oldestItems.map(item => (
                        <div key={item.id} className="task-item" style={{ marginBottom: '0.5rem' }}>
                            <span style={{ flex: 1 }}>{item.title}</span>
                            <span className="badge">{item.ageDays}d</span>
                            <span style={{ color: 'var(--health-yellow)' }}>${item.estimatedValue}</span>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}

function ContextSwitchingCard({ data }: { data: ContextSwitchingMetrics }) {
    const getFocusColor = (score: number) => {
        if (score >= 70) return 'var(--health-green)';
        if (score >= 40) return 'var(--health-yellow)';
        return 'var(--health-red)';
    };

    return (
        <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <RefreshCw size={24} style={{ color: 'var(--health-red)' }} />
                <h3>Context Switching</h3>
            </div>

            <div className="metric-row" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <div className="metric-value" style={{ fontSize: '2rem' }}>
                        {data.averageSwitchesPerDay}
                    </div>
                    <div className="metric-label">Avg Switches/Day</div>
                </div>
            </div>

            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                <Users size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Team Focus Scores
            </h4>

            {data.assigneeMetrics.map(member => (
                <div key={member.userId} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem',
                    background: 'var(--surface)',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{member.userName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {member.activeTasks} active tasks · {member.switchesLastWeek} switches/week
                        </div>
                    </div>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        border: `3px solid ${getFocusColor(member.focusScore)}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        color: getFocusColor(member.focusScore),
                    }}>
                        {member.focusScore}
                    </div>
                </div>
            ))}

            {data.recommendations.length > 0 && (
                <div className="alert alert-warning" style={{ marginTop: '1rem' }}>
                    <AlertTriangle size={16} />
                    <span>{data.recommendations[0]}</span>
                </div>
            )}
        </div>
    );
}

function OverproductionCard({ data }: { data: OverproductionMetrics }) {
    return (
        <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Flag size={24} style={{ color: 'var(--text-secondary)' }} />
                <h3>Overproduction</h3>
            </div>

            <div className="metric-row" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <div className="metric-value" style={{ fontSize: '2rem', color: data.staleFlagCount > 0 ? 'var(--health-red)' : 'var(--health-green)' }}>
                        {data.staleFlagCount}
                    </div>
                    <div className="metric-label">Stale Flags</div>
                </div>
                <div>
                    <div className="metric-value">{data.potentialWastedEffort}</div>
                    <div className="metric-label">Wasted Points</div>
                </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Features deployed &gt;30 days ago with &lt;5% adoption
            </p>

            {data.totalStaleFlags.length > 0 ? (
                data.totalStaleFlags.map(flag => (
                    <div key={flag.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        background: 'var(--surface)',
                        borderRadius: '8px',
                        marginBottom: '0.5rem',
                        borderLeft: '3px solid var(--health-red)',
                    }}>
                        <div>
                            <div style={{ fontWeight: 500 }}>{flag.flagName}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                <code>{flag.flagKey}</code>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.9rem' }}>{flag.daysSinceDeployment} days old</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--health-red)' }}>
                                {flag.adoptionPercent}% adoption
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="empty-state">
                    <CheckCircle2 size={32} style={{ color: 'var(--health-green)' }} />
                    <p>No stale feature flags detected</p>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function MudaMetrics() {
    const [data, setData] = useState<MudaOverview | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: Replace with actual API call
        // fetch('/api/operations/muda/org-id').then(r => r.json()).then(setData);
        setTimeout(() => {
            setData(mockData);
            setLoading(false);
        }, 500);
    }, []);

    if (loading || !data) {
        return (
            <div className="loading-container">
                <RefreshCw className="spin" size={32} />
                <p>Loading waste metrics...</p>
            </div>
        );
    }

    return (
        <div className="muda-dashboard">
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <TrendingDown size={32} />
                    Muda: 7 Wastes Analysis
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Toyota Production System waste identification for software development
                </p>
            </header>

            {/* Recommendations Alert */}
            {data.recommendations.length > 0 && (
                <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
                    <AlertTriangle size={20} />
                    <div>
                        <strong>Top Recommendations</strong>
                        <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0 }}>
                            {data.recommendations.map((rec, i) => (
                                <li key={i}>{rec}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Main Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '1.5rem',
            }}>
                {/* Waste Score */}
                <WasteScoreGauge score={data.totalWasteScore} />

                {/* Waiting Time */}
                <WaitingTimeCard data={data.waitingTime} />

                {/* WIP Inventory */}
                <WipInventoryCard data={data.wipInventory} />

                {/* Context Switching */}
                <ContextSwitchingCard data={data.contextSwitching} />

                {/* Overproduction */}
                <OverproductionCard data={data.overproduction} />
            </div>

            <style>{`
                .muda-dashboard {
                    padding: 1.5rem;
                }
                
                .metric-row {
                    display: flex;
                    gap: 2rem;
                }
                
                .metric-pill {
                    background: var(--surface);
                    padding: 0.5rem 0.75rem;
                    border-radius: 6px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .task-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.5rem 0;
                    border-bottom: 1px solid var(--border);
                    font-size: 0.9rem;
                }
                
                .task-item:last-child {
                    border-bottom: none;
                }
                
                .badge {
                    background: var(--surface);
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    font-weight: 500;
                }
                
                .badge-warning {
                    background: rgba(234, 179, 8, 0.2);
                    color: var(--health-yellow);
                }
                
                .empty-state {
                    text-align: center;
                    padding: 2rem;
                    color: var(--text-secondary);
                }
                
                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 300px;
                    gap: 1rem;
                }
                
                .spin {
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
