/**
 * Topgrading Dashboard - Hiring Pipeline
 * Scorecard management, candidate evaluation, and pattern recognition
 */

import React, { useState } from 'react';
import {
    ClipboardCheck,
    Users,
    AlertTriangle,
    CheckCircle,
    Plus,
    Search,
    ChevronRight,
    Clock,
    XCircle,
    FileText,
} from 'lucide-react';
import './TopgradingDashboard.css';

interface Candidate {
    id: string;
    name: string;
    role: string;
    tenurePattern: 'stable' | 'jumper' | 'growth' | 'mixed';
    overallScore: number;
    riskFlags: string[];
    strengths: string[];
    status: 'IN_PROGRESS' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
    appliedDate: Date;
}

interface Scorecard {
    id: string;
    title: string;
    department: string;
    candidates: Candidate[];
}

// Mock data
const MOCK_SCORECARDS: Scorecard[] = [
    {
        id: '1',
        title: 'Senior Software Engineer',
        department: 'Engineering',
        candidates: [
            {
                id: 'c1',
                name: 'Alex Chen',
                role: 'Senior Software Engineer',
                tenurePattern: 'stable',
                overallScore: 8,
                riskFlags: [],
                strengths: ['Strong tenure pattern', 'Ascending boss ratings'],
                status: 'PENDING_REVIEW',
                appliedDate: new Date('2026-01-10'),
            },
            {
                id: 'c2',
                name: 'Jordan Smith',
                role: 'Senior Software Engineer',
                tenurePattern: 'jumper',
                overallScore: 5,
                riskFlags: ['Short average tenure', 'External locus detected'],
                strengths: ['Technical skills'],
                status: 'IN_PROGRESS',
                appliedDate: new Date('2026-01-12'),
            },
        ],
    },
    {
        id: '2',
        title: 'Product Manager',
        department: 'Product',
        candidates: [
            {
                id: 'c3',
                name: 'Sarah Johnson',
                role: 'Product Manager',
                tenurePattern: 'growth',
                overallScore: 9,
                riskFlags: [],
                strengths: ['Improving tenure', 'Strong accomplishments'],
                status: 'APPROVED',
                appliedDate: new Date('2026-01-05'),
            },
        ],
    },
];

const STATUS_CONFIG = {
    IN_PROGRESS: { label: 'In Progress', color: '#6366f1', icon: <Clock size={14} /> },
    PENDING_REVIEW: { label: 'Pending Review', color: '#f59e0b', icon: <FileText size={14} /> },
    APPROVED: { label: 'Approved', color: '#22c55e', icon: <CheckCircle size={14} /> },
    REJECTED: { label: 'Rejected', color: '#ef4444', icon: <XCircle size={14} /> },
};

const TENURE_CONFIG = {
    stable: { label: 'Stable', color: '#22c55e' },
    growth: { label: 'Growth', color: '#06b6d4' },
    mixed: { label: 'Mixed', color: '#f59e0b' },
    jumper: { label: 'Jumper', color: '#ef4444' },
};

export const TopgradingDashboard: React.FC = () => {
    const [scorecards] = useState<Scorecard[]>(MOCK_SCORECARDS);
    // const [selectedScorecard, setSelectedScorecard] = useState<string | null>(null);

    const allCandidates = scorecards.flatMap(s => s.candidates);
    const totalCandidates = allCandidates.length;
    const pendingReview = allCandidates.filter(c => c.status === 'PENDING_REVIEW').length;
    const highRisk = allCandidates.filter(c => c.riskFlags.length > 0).length;
    const approved = allCandidates.filter(c => c.status === 'APPROVED').length;

    return (
        <div className="topgrading-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-left">
                    <h1 className="page-title">
                        <ClipboardCheck size={24} />
                        Topgrading Pipeline
                    </h1>
                </div>

                <div className="header-actions">
                    <div className="search-box">
                        <Search size={16} />
                        <input type="text" placeholder="Search candidates..." />
                    </div>
                    <button className="btn btn-primary">
                        <Plus size={16} />
                        New Scorecard
                    </button>
                </div>
            </div>

            {/* Pipeline Metrics */}
            <div className="metrics-row">
                <div className="metric-card">
                    <div className="metric-icon total">
                        <Users size={20} />
                    </div>
                    <div className="metric-content">
                        <span className="metric-value">{totalCandidates}</span>
                        <span className="metric-label">Total Candidates</span>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon pending">
                        <FileText size={20} />
                    </div>
                    <div className="metric-content">
                        <span className="metric-value">{pendingReview}</span>
                        <span className="metric-label">Pending Review</span>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon risk">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="metric-content">
                        <span className="metric-value">{highRisk}</span>
                        <span className="metric-label">High Risk</span>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon approved">
                        <CheckCircle size={20} />
                    </div>
                    <div className="metric-content">
                        <span className="metric-value">{approved}</span>
                        <span className="metric-label">Approved</span>
                    </div>
                </div>
            </div>

            {/* Scorecards */}
            <div className="scorecards-section">
                <h2>Active Scorecards</h2>

                <div className="scorecards-grid">
                    {scorecards.map(scorecard => (
                        <div key={scorecard.id} className="scorecard-card">
                            <div className="scorecard-header">
                                <div className="scorecard-info">
                                    <h3>{scorecard.title}</h3>
                                    <span className="department">{scorecard.department}</span>
                                </div>
                                <span className="candidate-count">
                                    {scorecard.candidates.length} candidates
                                </span>
                            </div>

                            <div className="candidates-list">
                                {scorecard.candidates.map(candidate => (
                                    <div key={candidate.id} className="candidate-row">
                                        <div className="candidate-info">
                                            <div className="candidate-avatar">
                                                {candidate.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div className="candidate-details">
                                                <span className="candidate-name">{candidate.name}</span>
                                                <div className="candidate-meta">
                                                    <span
                                                        className="tenure-badge"
                                                        style={{ background: `${TENURE_CONFIG[candidate.tenurePattern].color}20`, color: TENURE_CONFIG[candidate.tenurePattern].color }}
                                                    >
                                                        {TENURE_CONFIG[candidate.tenurePattern].label}
                                                    </span>
                                                    {candidate.riskFlags.length > 0 && (
                                                        <span className="risk-indicator">
                                                            <AlertTriangle size={12} />
                                                            {candidate.riskFlags.length} flags
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="candidate-score">
                                            <div className="score-circle" data-score={candidate.overallScore}>
                                                {candidate.overallScore}
                                            </div>
                                        </div>

                                        <div className="candidate-status">
                                            <span
                                                className="status-badge"
                                                style={{ background: `${STATUS_CONFIG[candidate.status].color}20`, color: STATUS_CONFIG[candidate.status].color }}
                                            >
                                                {STATUS_CONFIG[candidate.status].icon}
                                                {STATUS_CONFIG[candidate.status].label}
                                            </span>
                                        </div>

                                        <button className="view-btn">
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button className="add-candidate-btn">
                                <Plus size={16} />
                                Add Candidate
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pattern Legend */}
            <div className="pattern-legend">
                <h3>Tenure Pattern Guide</h3>
                <div className="legend-items">
                    {Object.entries(TENURE_CONFIG).map(([key, config]) => (
                        <div key={key} className="legend-item">
                            <span className="legend-dot" style={{ background: config.color }} />
                            <span className="legend-label">{config.label}</span>
                            <span className="legend-description">
                                {key === 'stable' && 'Avg tenure ≥ 3 years'}
                                {key === 'growth' && 'Increasing tenure over time'}
                                {key === 'mixed' && 'Variable pattern'}
                                {key === 'jumper' && 'Avg tenure < 18 months'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TopgradingDashboard;
