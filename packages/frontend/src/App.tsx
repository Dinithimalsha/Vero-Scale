/**
 * VeroScale Application
 * Unified navigation with interconnected dashboards
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layout
import { AppShell } from './components/layout/AppShell';

// Operations Dashboards
import { HeijunkaBoard } from './components/operations/HeijunkaBoard';
import { AndonDashboard } from './components/operations/AndonDashboard';
import MudaMetrics from './components/operations/MudaMetrics';

// Finance Dashboards
import { LedgerDashboard } from './components/finance/LedgerDashboard';
import { FinanceDashboard } from './components/finance/FinanceDashboard';
import { ZBBDashboard } from './components/finance/ZBBDashboard';
import { RuleOf40Dashboard } from './components/finance/RuleOf40Dashboard';

// Strategy Dashboards
import { IssueTreeBuilder } from './components/strategy/IssueTreeBuilder';
import { SevenSDashboard } from './components/strategy/SevenSDashboard';
import { NorthStarDashboard } from './components/strategy/NorthStarDashboard';

// Human Capital Dashboards
import { TopgradingDashboard } from './components/human-capital/TopgradingDashboard';
import { FeedbackDashboard } from './components/human-capital/FeedbackDashboard';

// Algorithmic Enterprise Dashboards
import { PredictionMarketsDashboard } from './components/markets/PredictionMarketsDashboard';
import { QuadraticVotingDashboard } from './components/governance/QuadraticVotingDashboard';
import { ComplianceDashboard } from './components/compliance/ComplianceDashboard';
import SimulationDashboard from './components/strategy/SimulationDashboard';

// Placeholder for routes not yet implemented
const PlaceholderPage = ({ title }: { title: string }) => (
    <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ color: '#e4e8ed', marginBottom: '16px' }}>{title}</h1>
        <p style={{ color: '#94a3b8' }}>Coming soon...</p>
    </div>
);

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<AppShell />}>
                    {/* Default redirect */}
                    <Route index element={<Navigate to="/operations/heijunka" replace />} />

                    {/* Operations Module */}
                    <Route path="operations">
                        <Route index element={<Navigate to="heijunka" replace />} />
                        <Route path="heijunka" element={<HeijunkaBoard />} />
                        <Route path="andon" element={<AndonDashboard />} />
                        <Route path="muda" element={<MudaMetrics />} />
                    </Route>

                    {/* Finance Module */}
                    <Route path="finance">
                        <Route index element={<Navigate to="ledger" replace />} />
                        <Route path="ledger" element={<LedgerDashboard />} />
                        <Route path="unit-economics" element={<FinanceDashboard />} />
                        <Route path="rule-of-40" element={<RuleOf40Dashboard />} />
                        <Route path="zbb" element={<ZBBDashboard />} />
                    </Route>

                    {/* Prediction Markets Module (Algorithmic Enterprise) */}
                    <Route path="markets">
                        <Route index element={<Navigate to="predictions" replace />} />
                        <Route path="predictions" element={<PredictionMarketsDashboard />} />
                    </Route>

                    {/* Governance Module (Algorithmic Enterprise) */}
                    <Route path="governance">
                        <Route index element={<Navigate to="voting" replace />} />
                        <Route path="voting" element={<QuadraticVotingDashboard />} />
                    </Route>

                    {/* Compliance Module (Algorithmic Enterprise) */}
                    <Route path="compliance">
                        <Route index element={<Navigate to="policies" replace />} />
                        <Route path="policies" element={<ComplianceDashboard />} />
                    </Route>

                    {/* Strategy Module */}
                    <Route path="strategy">
                        <Route index element={<Navigate to="seven-s" replace />} />
                        <Route path="issue-trees" element={<IssueTreeBuilder />} />
                        <Route path="seven-s" element={<SevenSDashboard />} />
                        <Route path="north-star" element={<NorthStarDashboard />} />
                        <Route path="simulation" element={<SimulationDashboard />} />
                    </Route>

                    {/* Human Capital Module */}
                    <Route path="human-capital">
                        <Route index element={<Navigate to="topgrading" replace />} />
                        <Route path="topgrading" element={<TopgradingDashboard />} />
                        <Route path="feedback" element={<FeedbackDashboard />} />
                    </Route>

                    {/* Settings */}
                    <Route path="settings" element={<PlaceholderPage title="Settings" />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;

