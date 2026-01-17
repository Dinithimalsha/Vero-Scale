import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

/**
 * THE COCKPIT
 * A Single Pane of Glass for the Algorithmic Enterprise
 * 
 * Visualizes:
 * - BRAIN: Strategy/Confidence
 * - HEART: Economics (LTV:CAC)
 * - NERVES: Operations (Flow)
 * - IMMUNE: Governance (Alerts)
 */

export const CockpitDashboard: React.FC = () => {
    // Mock Data (Connected to Backend in real life)
    const heartStats = { ltv: 12000, cac: 3500, ratio: 3.42, status: 'HEALTHY' };
    const brainStats = { p90Confidence: 85, volatility: 0.2 };
    const immuneStats = { activeAlerts: 2, growthHalt: false };
    const nervesStats = { flowEfficiency: 28, cycleTime: 4.2 };

    return (
        <div className="p-8 space-y-8 bg-black min-h-screen text-gray-100 font-sans">
            <header className="flex justify-between items-center border-b border-gray-800 pb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">THE COCKPIT</h1>
                    <p className="text-gray-400">Algorithmic Enterprise Command Center</p>
                </div>
                <div className="flex gap-2">
                    <Badge variant={heartStats.status === 'HEALTHY' ? 'default' : 'destructive'}>
                        SYSTEM STATUS: {heartStats.status}
                    </Badge>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* HEART: ECONOMICS */}
                <Card className="p-6 bg-gray-900 border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-rose-400">❤️ HEART (Economics)</h3>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-400">LTV:CAC Ratio</span>
                            <span className="text-2xl font-mono font-bold text-white">{heartStats.ratio}</span>
                        </div>
                        <div className="w-full bg-gray-800 h-2 rounded-full">
                            <div
                                className={`h-2 rounded-full ${heartStats.ratio < 3 ? 'bg-red-500' : 'bg-green-500'}`}
                                style={{ width: `${(heartStats.ratio / 5) * 100}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Target > 3.0 | Circuit Breaker at 3.0</p>
                    </div>
                </Card>

                {/* BRAIN: STRATEGY */}
                <Card className="p-6 bg-gray-900 border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-blue-400">🧠 BRAIN (Strategy)</h3>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Forecast Confidence</span>
                            <span className="text-2xl font-mono font-bold text-white">{brainStats.p90Confidence}%</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">System Volatility</span>
                            <span className="text-xl font-mono text-yellow-400">{brainStats.volatility}</span>
                        </div>
                    </div>
                </Card>

                {/* IMMUNE: GOVERNANCE */}
                <Card className="p-6 bg-gray-900 border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-emerald-400">🛡️ IMMUNE (Governance)</h3>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Active ZBB Alerts</span>
                            <span className="text-2xl font-mono font-bold text-white">{immuneStats.activeAlerts}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Growth Protocol</span>
                            <span className={`text-sm px-2 py-1 rounded ${immuneStats.growthHalt ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
                                {immuneStats.growthHalt ? 'HALTED' : 'ACTIVE'}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* NERVES: OPERATIONS */}
                <Card className="p-6 bg-gray-900 border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-orange-400">⚡ NERVES (Ops)</h3>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Flow Efficiency</span>
                            <span className="text-2xl font-mono font-bold text-white">{nervesStats.flowEfficiency}%</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Cycle Time</span>
                            <span className="text-xl font-mono text-white">{nervesStats.cycleTime}d</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* LIVE FEED */}
            <Card className="p-6 bg-gray-900 border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-4">System Event Log</h3>
                <div className="space-y-2 font-mono text-sm">
                    <div className="flex gap-4 text-gray-400">
                        <span className="text-gray-600">[10:52:01]</span>
                        <span className="text-green-400">[HEIJUNKA]</span>
                        <span>Sprint 42 allocation complete. Mix: 60/15/15/10.</span>
                    </div>
                    <div className="flex gap-4 text-gray-400">
                        <span className="text-gray-600">[10:51:58]</span>
                        <span className="text-blue-400">[ORACLE]</span>
                        <span>Revenue Forecast updated. P90: $2.4M.</span>
                    </div>
                    <div className="flex gap-4 text-gray-400">
                        <span className="text-gray-600">[10:48:12]</span>
                        <span className="text-rose-400">[CFO BOT]</span>
                        <span>LTV:CAC Check passed (3.42). Growth continued.</span>
                    </div>
                </div>
            </Card>
        </div>
    );
};
