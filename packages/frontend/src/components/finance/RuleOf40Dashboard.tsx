/**
 * Rule of 40 Dashboard
 * SaaS Metric Visualization: Growth + Profitability
 */

// import { useState } from 'react';
import { TrendingUp, DollarSign, Activity, AlertCircle } from 'lucide-react';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';

export function RuleOf40Dashboard() {
    // Mock data for Phase 7 Demo
    const currentMetrics = {
        growthRate: 25, // 25% YoY Growth
        profitMargin: 18, // 18% EBITDA Margin
        total: 43 // 43 > 40 (Healthy)
    };

    // const historicalData = [
    //     { quarter: 'Q1 2024', growth: 30, margin: 10, total: 40 },
    //     { quarter: 'Q2 2024', growth: 28, margin: 12, total: 40 },
    //     { quarter: 'Q3 2024', growth: 26, margin: 15, total: 41 },
    //     { quarter: 'Q4 2024', growth: 25, margin: 18, total: 43 },
    // ];

    const benchmarkData = [
        { name: 'Company A', growth: 50, margin: -20, total: 30 },
        { name: 'Company B', growth: 10, margin: 35, total: 45 },
        { name: 'Company C', growth: 40, margin: 5, total: 45 },
        { name: 'US (Current)', growth: 25, margin: 18, total: 43 },
        { name: 'Company D', growth: 15, margin: 15, total: 30 },
    ];

    const isHealthy = currentMetrics.total >= 40;

    return (
        <div className="rule-40-dashboard p-xl h-full">
            <h2 className="flex items-center gap-md mb-xl">
                <Activity className="text-accent" />
                Rule of 40 (SaaS Efficiency)
            </h2>

            {/* Top Cards */}
            <div className="grid-3 gap-xl mb-xl">
                <MetricCard
                    label="YoY Revenue Growth"
                    value={`${currentMetrics.growthRate}%`}
                    icon={<TrendingUp size={20} />}
                    color="#3b82f6"
                />
                <MetricCard
                    label="EBITDA Margin"
                    value={`${currentMetrics.profitMargin}%`}
                    icon={<DollarSign size={20} />}
                    color="#10b981"
                />
                <div className={`card p-lg flex flex-col items-center justify-center border-2 ${isHealthy ? 'border-green-500' : 'border-red-500'}`}>
                    <div className="text-sm text-muted uppercase tracking-wider mb-xs">Rule of 40 Score</div>
                    <div className="text-4xl font-black" style={{ color: isHealthy ? '#22c55e' : '#ef4444' }}>
                        {currentMetrics.total}
                    </div>
                    <div className="mt-xs text-sm font-bold flex items-center gap-xs">
                        {isHealthy ? 'HEALTHY' : 'NEEDS ATTENTION'}
                        {isHealthy ? <Activity size={16} /> : <AlertCircle size={16} />}
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid-2 gap-xl h-[400px]">
                {/* Scatter Plot */}
                <div className="card p-lg flex flex-col">
                    <h3 className="mb-md font-bold">Competitive Benchmark</h3>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid />
                                <XAxis type="number" dataKey="growth" name="Growth" unit="%" label={{ value: 'Growth Rate', position: 'bottom' }} />
                                <YAxis type="number" dataKey="margin" name="Margin" unit="%" label={{ value: 'Profit Margin', angle: -90, position: 'left' }} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                {/* Rule of 40 Line (x + y = 40) */}
                                <ReferenceLine segment={[{ x: 0, y: 40 }, { x: 40, y: 0 }]} stroke="red" strokeDasharray="3 3" label="Rule of 40 Limit" />
                                <Scatter name="Companies" data={benchmarkData} fill="#8884d8">
                                    {benchmarkData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'US (Current)' ? '#ec4899' : '#8884d8'} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Explanation */}
                <div className="card p-lg bg-tertiary">
                    <h3 className="mb-md font-bold">Analysis</h3>
                    <p className="mb-md">
                        The Rule of 40 states that a SaaS company's growth rate plus profit margin should exceed 40%.
                    </p>
                    <ul className="list-disc pl-lg space-y-sm text-muted text-sm">
                        <li>
                            <strong className="text-white">Current Status:</strong> We are at <span className="text-white font-mono">{currentMetrics.total}</span>, passing the benchmark.
                        </li>
                        <li>
                            <strong className="text-white">Strategy:</strong> Balanced growth and profitability. We are in the "Healthy" zone (Pink dot on chart).
                        </li>
                        <li>
                            <strong className="text-white">Action:</strong> Maintain current trajectory. Any increase in S&M spend should monitor impact on EBITDA to ensure we stay above 40.
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ label, value, icon, color }: any) {
    return (
        <div className="card p-lg flex items-center gap-lg">
            <div className="p-md rounded-full bg-secondary" style={{ color }}>{icon}</div>
            <div>
                <div className="text-sm text-muted mb-xs">{label}</div>
                <div className="text-2xl font-bold">{value}</div>
            </div>
        </div>
    );
}
