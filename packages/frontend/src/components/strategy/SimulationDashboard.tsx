import React, { useState } from 'react';
import { Brain, AlertTriangle, Play, Activity } from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ReferenceLine, BarChart, Bar
} from 'recharts';

// Mock Data Types
interface SimulationResult {
    p50: number;
    p90: number;
    p99: number;
    probabilityOfSuccess: number;
    distribution: number[];
}

const SimulationDashboard: React.FC = () => {
    // State for "What-If" Analysis
    const [scopeMultiplier, setScopeMultiplier] = useState(1.0);
    const [resourceCount, setResourceCount] = useState(3);
    const [simulating, setSimulating] = useState(false);
    const [result, setResult] = useState<SimulationResult | null>(null);

    const runSimulation = async () => {
        setSimulating(true);
        try {
            // Mocking the Backend Response for Demo
            await new Promise(resolve => setTimeout(resolve, 1500));

            // const res = await fetchAPI('/strategy/simulate', { 
            //    teamId: 'team-uuid', 
            //    scope: { ... } 
            // });
            const distribution = Array.from({ length: 50 }, (_, i) => ({
                bucket: i * 2,
                frequency: Math.exp(-Math.pow((i - 15) / 8, 2)) * 100 // Bell curve shifted
            }));

            setResult({
                p50: 32 * scopeMultiplier,
                p90: 48 * scopeMultiplier,
                p99: 65 * scopeMultiplier,
                probabilityOfSuccess: resourceCount > 3 ? 0.85 : 0.42,
                distribution: distribution.map(d => d.frequency)
            });
        } finally {
            setSimulating(false);
        }
    };

    // Chart Data Preparation
    const distributionData = result ? result.distribution.map((val, idx) => ({
        hours: idx * 2,
        probability: val
    })) : [];

    const fanChartData = result ? [
        { week: 'Start', p50: 0, p90: 0 },
        { week: 'Week 1', p50: 10, p90: 5 },
        { week: 'Week 2', p50: 25, p90: 15 },
        { week: 'Week 3', p50: 45, p90: 25 },
        { week: 'Week 4', p50: 70, p90: 40 },
        { week: 'End', p50: 100, p90: 60 },
    ] : [];

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen font-sans">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Brain className="h-8 w-8 text-indigo-600" />
                        The Oracle
                    </h1>
                    <p className="text-slate-500">Probabilistic Forecasting & Monte Carlo Simulation</p>
                </div>
                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Phase 9: Autonomous Planning
                </span>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Control Panel */}
                <div className="md:col-span-1 bg-white rounded-lg border border-l-4 border-l-indigo-600 shadow-sm p-6">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Activity className="h-5 w-5" /> Simulation Parameters
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">Adjust variables to forecast different futures.</p>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-4">
                            <label className="text-sm font-medium text-slate-700">Scope Complexity (Multiplier: {scopeMultiplier}x)</label>
                            <input
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.1"
                                value={scopeMultiplier}
                                onChange={(e) => setScopeMultiplier(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Simpler (0.5x)</span>
                                <span>Complex (2.0x)</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-medium text-slate-700">Team Size ({resourceCount} Staff)</label>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                step="1"
                                value={resourceCount}
                                onChange={(e) => setResourceCount(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>1 Agent</span>
                                <span>10 Agents</span>
                            </div>
                        </div>

                        <button
                            onClick={runSimulation}
                            disabled={simulating}
                            className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-indigo-600 text-white hover:bg-indigo-700 h-10 py-2 px-4 shadow"
                        >
                            {simulating ? 'Consulting the Oracle...' : 'Run Monte Carlo (10k Iterations)'}
                            {!simulating && <Play className="ml-2 h-4 w-4" />}
                        </button>

                        {result && (
                            <div className={`flex p-4 rounded-lg border ${result.probabilityOfSuccess > 0.5 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                <AlertTriangle className="h-5 w-5 mr-3 mt-0.5" />
                                <div>
                                    <h5 className="font-medium leading-none tracking-tight mb-1">
                                        {result.probabilityOfSuccess > 0.5 ? "Project Feasible" : "High Risk Detected"}
                                    </h5>
                                    <div className="text-sm opacity-90">
                                        {(result.probabilityOfSuccess * 100).toFixed(0)}% chance of success with current constraints.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* VISUALIZATION: River Plot / Fan Chart */}
                <div className="md:col-span-2 bg-white rounded-lg border shadow-sm flex flex-col">
                    <div className="p-6 pb-0">
                        <h3 className="text-lg font-semibold">Projected Timeline (Fan Chart)</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Visualizing uncertainty over time. Dark blue = P50 (Likely). Light blue = P90 (Risk).
                        </p>
                    </div>
                    <div className="p-6 h-[300px]">
                        {!result ? (
                            <div className="h-full flex items-center justify-center text-slate-400">
                                Run simulation to see the Cone of Uncertainty
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={fanChartData}>
                                    <defs>
                                        <linearGradient id="p90Range" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="week" axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="p90" stackId="1" stroke="#818cf8" fill="url(#p90Range)" name="P90 Risk" />
                                    <Area type="monotone" dataKey="p50" stackId="2" stroke="#4f46e5" fill="#4f46e5" name="P50 Likely" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* DISTRIBUTION HISTOGRAM */}
                <div className="md:col-span-3 bg-white rounded-lg border shadow-sm flex flex-col">
                    <div className="p-6 pb-0">
                        <h3 className="text-lg font-semibold">Outcome Distribution (Cost/Time)</h3>
                        <p className="text-sm text-slate-500 mt-1">Probability density of project completion times.</p>
                    </div>
                    <div className="p-6 h-[250px]">
                        {!result ? (
                            <div className="h-full flex items-center justify-center text-slate-400">
                                Awaiting data...
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={distributionData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="hours" />
                                    <YAxis hide />
                                    <Tooltip />
                                    <Bar dataKey="probability" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                    <ReferenceLine x={result.p90} stroke="red" label="P90 Limit" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SimulationDashboard;
