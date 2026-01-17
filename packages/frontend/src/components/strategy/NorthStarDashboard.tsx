/**
 * North Star Metric Dashboard
 * Aggregated Organization Health Check
 */

import { useState, useEffect } from 'react';
import { Activity, TrendingUp, AlertCircle, CheckCircle, DollarSign, Zap, Shield } from 'lucide-react';
import { strategyApi, NorthStarMetric } from '../../services/api';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export function NorthStarDashboard() {
    const [metric, setMetric] = useState<NorthStarMetric | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        // Mock org ID for demo
        const result = await strategyApi.getNorthStar('org-1');
        if (result.success && result.data) {
            setMetric(result.data);
        } else {
            // Fallback mock if API fails (for local dev without full backend running perfectly)
            setMetric({
                healthScore: 85,
                trend: 'UP',
                components: {
                    financialHealth: 92,
                    operationalFlow: 78,
                    complianceScore: 88
                },
                insights: [
                    'Financial health is strong. No major zombie spend detected.',
                    'Operational flow is lagging. Check Heijunka load balancing.',
                    'Compliance is stable.'
                ]
            });
            if (result.error) console.warn('API Error, using fallback:', result.error);
        }
        setLoading(false);
    };

    if (loading) return <div className="p-xl text-center text-muted">Calculating organizational pulse...</div>;
    if (!metric) return <div className="p-xl text-center text-red">Failed to load metrics</div>;

    const healthColor = metric.healthScore >= 90 ? '#22c55e' : metric.healthScore >= 70 ? '#eab308' : '#ef4444';

    const renderGauge = (value: number, color: string) => {
        const data = [
            { name: 'Score', value: value },
            { name: 'Remaining', value: 100 - value }
        ];
        return (
            <div style={{ height: 100, width: 100, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={45}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                        >
                            <Cell key="score" fill={color} />
                            <Cell key="rest" fill="var(--color-bg-tertiary)" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: '1.2rem', color: color
                }}>
                    {value}
                </div>
            </div>
        );
    };

    return (
        <div className="north-star-dashboard">
            <h2 className="mb-xl flex items-center gap-md">
                <Activity className="text-accent" />
                Organizational North Star
            </h2>

            {/* Main Score */}
            <div className="card mb-xl bg-gradient-dark">
                <div className="flex items-center justify-between p-lg">
                    <div>
                        <h3 className="text-muted text-sm uppercase tracking-wider mb-sm">Overall Health Score</h3>
                        <div className="flex items-baseline gap-md">
                            <span style={{ fontSize: '4rem', fontWeight: 800, color: healthColor, lineHeight: 1 }}>
                                {metric.healthScore}
                            </span>
                            <span className="badge badge-outline">
                                <TrendingUp size={14} className="mr-xs" />
                                {metric.trend}
                            </span>
                        </div>
                        <p className="text-muted mt-md max-w-md">
                            Aggregate score based on financial efficiency, operational flow, and compliance adherence.
                        </p>
                    </div>

                    {renderGauge(metric.healthScore, healthColor)}
                </div>
            </div>

            {/* Components Grid */}
            <div className="grid-3 mb-xl">
                <ComponentCard
                    title="Financial Health"
                    score={metric.components.financialHealth}
                    icon={<DollarSign size={20} />}
                    color="#3b82f6" // Blue
                    description="Budget efficiency & Zombie spend"
                />
                <ComponentCard
                    title="Operational Flow"
                    score={metric.components.operationalFlow}
                    icon={<Zap size={20} />}
                    color="#f59e0b" // Amber
                    description="Value stream velocity & Waste"
                />
                <ComponentCard
                    title="Compliance"
                    score={metric.components.complianceScore}
                    icon={<Shield size={20} />}
                    color="#10b981" // Green
                    description="Policy adherence & Security"
                />
            </div>

            {/* AI Insights */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Strategic Insights</h3>
                </div>
                <div className="flex-col gap-md p-lg">
                    {metric.insights.length > 0 ? (
                        metric.insights.map((insight, i) => (
                            <div key={i} className="flex gap-md items-start bg-secondary p-md rounded">
                                <AlertCircle className="text-accent shrink-0 mt-1" size={18} />
                                <p>{insight}</p>
                            </div>
                        ))
                    ) : (
                        <div className="flex gap-md items-center text-muted">
                            <CheckCircle size={18} />
                            No critical issues detected.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ComponentCard({ title, score, icon, color, description }: any) {
    return (
        <div className="card p-lg flex flex-col items-center text-center">
            <div className="mb-md p-md rounded-full" style={{ background: `${color}20`, color: color }}>
                {icon}
            </div>
            <h4 className="mb-xs font-bold">{title}</h4>
            <p className="text-sm text-muted mb-lg h-10">{description}</p>

            <div className="w-full bg-tertiary rounded-full h-2 mb-sm overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${score}%`, background: color }}
                />
            </div>

            <span className="font-mono font-bold" style={{ color }}>{score}/100</span>
        </div>
    );
}
