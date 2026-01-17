/**
 * Prediction Markets Dashboard
 * CPMM Binary Options Trading Interface
 */

import { useState } from 'react';
import { DollarSign, Target, Activity, BarChart2 } from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

// Mock market data
const mockMarkets = [
    {
        marketId: '1',
        question: 'Will JIRA-4521 ship by Feb 1?',
        yesPrice: 0.72,
        noPrice: 0.28,
        volume24h: 3420,
        expiresIn: '5 days',
        status: 'OPEN',
    },
    {
        marketId: '2',
        question: 'Q1 Revenue > $500K?',
        yesPrice: 0.85,
        noPrice: 0.15,
        volume24h: 12500,
        expiresIn: '45 days',
        status: 'OPEN',
    },
    {
        marketId: '3',
        question: 'Will we hit 50 customers by March?',
        yesPrice: 0.58,
        noPrice: 0.42,
        volume24h: 8900,
        expiresIn: '60 days',
        status: 'OPEN',
    },
];

const priceHistory = [
    { time: '9am', price: 0.45 },
    { time: '10am', price: 0.52 },
    { time: '11am', price: 0.58 },
    { time: '12pm', price: 0.55 },
    { time: '1pm', price: 0.62 },
    { time: '2pm', price: 0.68 },
    { time: '3pm', price: 0.72 },
];

export function PredictionMarketsDashboard() {
    const [selectedMarket, setSelectedMarket] = useState(mockMarkets[0]);
    const [tradeAmount, setTradeAmount] = useState(100);

    return (
        <div className="prediction-markets-dashboard">
            <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>
                🔮 Prediction Markets
            </h2>

            {/* Key Metrics */}
            <div className="grid-4" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">Active Markets</span>
                        <Activity size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <span className="metric-value">12</span>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">Total Volume 24h</span>
                        <DollarSign size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <span className="metric-value">$24,820</span>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">Avg Accuracy</span>
                        <Target size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <span className="metric-value green">78%</span>
                </div>

                <div className="metric-card">
                    <div className="flex items-center justify-between">
                        <span className="metric-label">Markets Resolved</span>
                        <BarChart2 size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <span className="metric-value">47</span>
                </div>
            </div>

            <div className="grid-2">
                {/* Active Markets */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Active Markets</h3>
                    </div>
                    <div className="flex-col gap-sm">
                        {mockMarkets.map((market) => (
                            <div
                                key={market.marketId}
                                onClick={() => setSelectedMarket(market)}
                                style={{
                                    padding: 'var(--spacing-md)',
                                    background: selectedMarket.marketId === market.marketId
                                        ? 'rgba(99, 102, 241, 0.1)'
                                        : 'var(--color-bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: selectedMarket.marketId === market.marketId
                                        ? '1px solid var(--color-accent-primary)'
                                        : '1px solid var(--color-border)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <div className="flex justify-between items-start">
                                    <span style={{ fontWeight: 500 }}>{market.question}</span>
                                    <span className="badge badge-blue" style={{ flexShrink: 0 }}>
                                        {market.expiresIn}
                                    </span>
                                </div>
                                <div className="flex gap-lg" style={{ marginTop: 'var(--spacing-sm)' }}>
                                    <ProbabilityBar label="YES" probability={market.yesPrice} color="#22c55e" />
                                    <ProbabilityBar label="NO" probability={market.noPrice} color="#ef4444" />
                                </div>
                                <div className="text-sm text-muted" style={{ marginTop: 'var(--spacing-xs)' }}>
                                    Vol: ${market.volume24h.toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Trading Panel */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Trade: {selectedMarket.question}</h3>
                    </div>

                    {/* Price Chart */}
                    <div style={{ height: 180, marginBottom: 'var(--spacing-md)' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={priceHistory}>
                                <defs>
                                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="time" stroke="var(--color-text-muted)" fontSize={12} />
                                <YAxis
                                    stroke="var(--color-text-muted)"
                                    fontSize={12}
                                    domain={[0, 1]}
                                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--color-bg-elevated)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                    }}
                                    formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'P(YES)']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="price"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    fill="url(#priceGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Current Price Display */}
                    <div className="flex gap-md" style={{ marginBottom: 'var(--spacing-md)' }}>
                        <div style={{
                            flex: 1,
                            padding: 'var(--spacing-md)',
                            background: 'rgba(34, 197, 94, 0.1)',
                            borderRadius: 'var(--radius-md)',
                            textAlign: 'center',
                        }}>
                            <div className="text-sm text-muted">BUY YES</div>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                color: '#22c55e',
                                fontFamily: 'var(--font-mono)',
                            }}>
                                {(selectedMarket.yesPrice * 100).toFixed(0)}¢
                            </div>
                        </div>
                        <div style={{
                            flex: 1,
                            padding: 'var(--spacing-md)',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: 'var(--radius-md)',
                            textAlign: 'center',
                        }}>
                            <div className="text-sm text-muted">BUY NO</div>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                color: '#ef4444',
                                fontFamily: 'var(--font-mono)',
                            }}>
                                {(selectedMarket.noPrice * 100).toFixed(0)}¢
                            </div>
                        </div>
                    </div>

                    {/* Trade Input */}
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label className="text-sm text-muted">Amount (USD)</label>
                        <input
                            type="number"
                            value={tradeAmount}
                            onChange={(e) => setTradeAmount(Number(e.target.value))}
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-md)',
                                background: 'var(--color-bg-secondary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--color-text-primary)',
                                fontSize: '1.125rem',
                                fontFamily: 'var(--font-mono)',
                                marginTop: 'var(--spacing-xs)',
                            }}
                        />
                    </div>

                    {/* Trade Buttons */}
                    <div className="flex gap-md">
                        <button className="btn btn-success" style={{ flex: 1 }}>
                            Buy YES @ {(selectedMarket.yesPrice * 100).toFixed(0)}¢
                        </button>
                        <button className="btn btn-danger" style={{ flex: 1 }}>
                            Buy NO @ {(selectedMarket.noPrice * 100).toFixed(0)}¢
                        </button>
                    </div>

                    <div
                        className="text-sm text-muted"
                        style={{
                            marginTop: 'var(--spacing-md)',
                            padding: 'var(--spacing-sm)',
                            background: 'var(--color-bg-secondary)',
                            borderRadius: 'var(--radius-sm)',
                        }}
                    >
                        <strong>CPMM Formula:</strong> P(YES) = NO / (YES + NO)
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function ProbabilityBar({ label, probability, color }: {
    label: string;
    probability: number;
    color: string;
}) {
    return (
        <div style={{ flex: 1 }}>
            <div className="flex justify-between text-sm" style={{ marginBottom: 4 }}>
                <span>{label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color }}>
                    {(probability * 100).toFixed(0)}%
                </span>
            </div>
            <div style={{
                height: 6,
                background: 'var(--color-bg-tertiary)',
                borderRadius: 3,
                overflow: 'hidden',
            }}>
                <div style={{
                    width: `${probability * 100}%`,
                    height: '100%',
                    background: color,
                    borderRadius: 3,
                }} />
            </div>
        </div>
    );
}
