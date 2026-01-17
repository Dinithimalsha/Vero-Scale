/**
 * Quadratic Voting Dashboard
 * Voice Credits & Preference Aggregation Interface
 */

import { useState } from 'react';
import { Vote, Users, Coins, Award, CheckCircle } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';

// Mock voting session
const mockSession = {
    title: 'Q2 Roadmap Prioritization',
    expiresIn: '3 days',
    votersParticipated: 24,
    totalEligible: 30,
    creditsPerVoter: 1000,
    options: [
        { id: '1', title: 'AI-Powered Search', votes: 156, cost: 892, category: 'Feature' },
        { id: '2', title: 'Mobile App Redesign', votes: 124, cost: 756, category: 'Feature' },
        { id: '3', title: 'API Rate Limiting', votes: 89, cost: 445, category: 'Tech Debt' },
        { id: '4', title: 'SSO Integration', votes: 78, cost: 380, category: 'Feature' },
        { id: '5', title: 'Dashboard Performance', votes: 67, cost: 312, category: 'Tech Debt' },
        { id: '6', title: 'Webhook System', votes: 45, cost: 198, category: 'Feature' },
    ],
};

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#ede9fe'];

export function QuadraticVotingDashboard() {
    const [userCredits, _setUserCredits] = useState(1000);
    const [votes, setVotes] = useState<Record<string, number>>({});

    const calculateCost = (voteCount: number) => voteCount * voteCount;

    const totalCost = Object.values(votes).reduce((sum, v) => sum + calculateCost(v), 0);
    const remainingCredits = userCredits - totalCost;

    const handleVoteChange = (optionId: string, voteCount: number) => {
        const newVotes = { ...votes, [optionId]: voteCount };
        const newTotalCost = Object.values(newVotes).reduce((sum, v) => sum + calculateCost(v), 0);

        if (newTotalCost <= userCredits) {
            setVotes(newVotes);
        }
    };

    const chartData = mockSession.options.map(opt => ({
        name: opt.title.length > 15 ? opt.title.substring(0, 15) + '...' : opt.title,
        votes: opt.votes,
        fullName: opt.title,
    }));

    return (
        <div className="quadratic-voting-dashboard">
            <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>
                🗳️ Quadratic Voting
            </h2>

            {/* Session Info */}
            <div className="grid-4" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">Active Session</span>
                        <Vote size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <span className="metric-value" style={{ fontSize: '1rem' }}>
                        {mockSession.title}
                    </span>
                    <span className="badge badge-blue" style={{ marginTop: 'var(--spacing-xs)' }}>
                        Ends in {mockSession.expiresIn}
                    </span>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">Participation</span>
                        <Users size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <div className="flex items-baseline gap-sm">
                        <span className="metric-value">{mockSession.votersParticipated}</span>
                        <span className="text-sm text-muted">/ {mockSession.totalEligible}</span>
                    </div>
                    <div style={{
                        height: 4,
                        background: 'var(--color-bg-tertiary)',
                        borderRadius: 2,
                        marginTop: 'var(--spacing-xs)',
                    }}>
                        <div style={{
                            width: `${(mockSession.votersParticipated / mockSession.totalEligible) * 100}%`,
                            height: '100%',
                            background: 'var(--color-accent-primary)',
                            borderRadius: 2,
                        }} />
                    </div>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">Your Credits</span>
                        <Coins size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <div className="flex items-baseline gap-sm">
                        <span className="metric-value" style={{
                            color: remainingCredits < 100 ? 'var(--color-warning)' : 'var(--color-text-primary)'
                        }}>
                            {remainingCredits}
                        </span>
                        <span className="text-sm text-muted">/ {userCredits}</span>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">Leading Option</span>
                        <Award size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <span className="metric-value green" style={{ fontSize: '1rem' }}>
                        {mockSession.options[0].title}
                    </span>
                </div>
            </div>

            <div className="grid-2">
                {/* Results Chart */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Current Rankings</h3>
                    </div>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis type="number" stroke="var(--color-text-muted)" fontSize={12} />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    stroke="var(--color-text-muted)"
                                    fontSize={11}
                                    width={120}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--color-bg-elevated)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                    }}
                                    formatter={(value: number, _name: string, props: any) => [
                                        `${value} votes`,
                                        props.payload.fullName
                                    ]}
                                />
                                <Bar dataKey="votes" radius={[0, 4, 4, 0]}>
                                    {chartData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Voting Panel */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Cast Your Votes</h3>
                    </div>

                    <div className="flex-col gap-md">
                        {mockSession.options.map((option) => (
                            <VoteSlider
                                key={option.id}
                                option={option}
                                currentVotes={votes[option.id] || 0}
                                onVoteChange={(v) => handleVoteChange(option.id, v)}
                                maxCredits={remainingCredits + calculateCost(votes[option.id] || 0)}
                            />
                        ))}
                    </div>

                    {/* Cost Preview */}
                    <div style={{
                        marginTop: 'var(--spacing-lg)',
                        padding: 'var(--spacing-md)',
                        background: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                    }}>
                        <div className="flex justify-between items-center">
                            <span>Total Cost</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                {totalCost} credits
                            </span>
                        </div>
                        <div className="flex justify-between items-center" style={{ marginTop: 'var(--spacing-xs)' }}>
                            <span>Remaining</span>
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 600,
                                color: remainingCredits < 100 ? 'var(--color-warning)' : 'var(--color-success)',
                            }}>
                                {remainingCredits} credits
                            </span>
                        </div>
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: 'var(--spacing-md)' }}
                        disabled={totalCost === 0}
                    >
                        <CheckCircle size={18} />
                        Submit Ballot
                    </button>

                    <div
                        className="text-sm text-muted"
                        style={{
                            marginTop: 'var(--spacing-md)',
                            padding: 'var(--spacing-sm)',
                            background: 'var(--color-bg-secondary)',
                            borderRadius: 'var(--radius-sm)',
                        }}
                    >
                        <strong>Quadratic Formula:</strong> Cost = N² (10 votes = 100 credits)
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

interface VoteSliderProps {
    option: { id: string; title: string; category: string };
    currentVotes: number;
    onVoteChange: (votes: number) => void;
    maxCredits: number;
}

function VoteSlider({ option, currentVotes, onVoteChange, maxCredits }: VoteSliderProps) {
    const cost = currentVotes * currentVotes;
    const maxVotes = Math.floor(Math.sqrt(maxCredits));

    return (
        <div style={{
            padding: 'var(--spacing-md)',
            background: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: currentVotes > 0 ? '1px solid var(--color-accent-primary)' : '1px solid var(--color-border)',
        }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--spacing-sm)' }}>
                <div>
                    <span style={{ fontWeight: 500 }}>{option.title}</span>
                    <span className="badge badge-gray" style={{ marginLeft: 'var(--spacing-sm)' }}>
                        {option.category}
                    </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        color: 'var(--color-accent-primary)',
                    }}>
                        {currentVotes}
                    </span>
                    <span className="text-sm text-muted" style={{ marginLeft: 4 }}>votes</span>
                </div>
            </div>

            <input
                type="range"
                min="0"
                max={Math.min(maxVotes, 31)}
                value={currentVotes}
                onChange={(e) => onVoteChange(Number(e.target.value))}
                style={{
                    width: '100%',
                    accentColor: 'var(--color-accent-primary)',
                }}
            />

            <div className="flex justify-between text-sm text-muted">
                <span>0 votes (0 credits)</span>
                <span style={{ color: currentVotes > 0 ? 'var(--color-accent-primary)' : undefined }}>
                    Cost: {cost} credits
                </span>
            </div>
        </div>
    );
}
