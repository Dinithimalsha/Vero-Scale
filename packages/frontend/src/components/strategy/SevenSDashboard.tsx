/**
 * 7S Diagnostic Dashboard - McKinsey Framework
 * Radar chart visualization with misalignment detection
 */

import React, { useState } from 'react';
import {
    Target,
    AlertTriangle,
    TrendingUp,
    Users,
    Settings,
    Star,
    BarChart3,
    ChevronRight,
    History,
} from 'lucide-react';
import './SevenSDashboard.css';

interface DiagnosticData {
    id: string;
    date: Date;
    scores: {
        strategy: number;
        structure: number;
        systems: number;
        sharedValues: number;
        style: number;
        staff: number;
        skills: number;
    };
    misalignments: Array<{
        elements: [string, string];
        severity: 'low' | 'medium' | 'high';
        description: string;
    }>;
    respondentCount: number;
}

// Mock data
const MOCK_DIAGNOSTIC: DiagnosticData = {
    id: '1',
    date: new Date(),
    scores: {
        strategy: 8.2,
        structure: 6.5,
        systems: 7.8,
        sharedValues: 8.5,
        style: 7.2,
        staff: 6.8,
        skills: 7.5,
    },
    misalignments: [
        { elements: ['Strategy', 'Structure'], severity: 'high', description: 'Strategy calls for rapid innovation but structure is too hierarchical' },
        { elements: ['Staff', 'Skills'], severity: 'medium', description: 'Staff capacity doesn\'t match required skill profile' },
        { elements: ['Style', 'Systems'], severity: 'low', description: 'Leadership style emphasizes speed but systems favor process' },
    ],
    respondentCount: 24,
};

const ELEMENT_INFO = {
    strategy: { label: 'Strategy', icon: <Target size={16} />, description: 'Plan to achieve competitive advantage' },
    structure: { label: 'Structure', icon: <BarChart3 size={16} />, description: 'How the organization is organized' },
    systems: { label: 'Systems', icon: <Settings size={16} />, description: 'Daily procedures and processes' },
    sharedValues: { label: 'Shared Values', icon: <Star size={16} />, description: 'Core beliefs and culture' },
    style: { label: 'Style', icon: <Users size={16} />, description: 'Leadership and management approach' },
    staff: { label: 'Staff', icon: <Users size={16} />, description: 'Employees and their capabilities' },
    skills: { label: 'Skills', icon: <TrendingUp size={16} />, description: 'Actual competencies of employees' },
};

export const SevenSDashboard: React.FC = () => {
    const [diagnostic] = useState<DiagnosticData>(MOCK_DIAGNOSTIC);
    const [, setSelectedElement] = useState<string | null>(null);

    const scores = Object.entries(diagnostic.scores);
    const avgScore = scores.reduce((sum, [_, v]) => sum + v, 0) / scores.length;
    const hardElements = ['strategy', 'structure', 'systems'];
    const softElements = ['sharedValues', 'style', 'staff', 'skills'];

    const hardAvg = hardElements.reduce((sum, e) => sum + diagnostic.scores[e as keyof typeof diagnostic.scores], 0) / 3;
    const softAvg = softElements.reduce((sum, e) => sum + diagnostic.scores[e as keyof typeof diagnostic.scores], 0) / 4;

    // Calculate radar chart points
    const radarPoints = scores.map(([_, score], i) => {
        const angle = (Math.PI * 2 * i) / scores.length - Math.PI / 2;
        const radius = (score / 10) * 120;
        return {
            x: 150 + radius * Math.cos(angle),
            y: 150 + radius * Math.sin(angle),
        };
    });

    const radarPath = radarPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

    return (
        <div className="seven-s-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-left">
                    <h1 className="page-title">
                        <Target size={24} />
                        7S Diagnostic
                    </h1>
                    <div className="respondent-count">
                        <Users size={14} />
                        {diagnostic.respondentCount} respondents
                    </div>
                </div>

                <div className="header-actions">
                    <button className="btn btn-secondary">
                        <History size={16} />
                        History
                    </button>
                    <button className="btn btn-primary">
                        New Survey
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="summary-row">
                <div className="summary-card overall">
                    <span className="card-label">Overall Alignment</span>
                    <span className="card-value">{avgScore.toFixed(1)}</span>
                    <span className="card-sublabel">/10</span>
                </div>

                <div className="summary-card hard">
                    <span className="card-label">Hard Elements</span>
                    <span className="card-value">{hardAvg.toFixed(1)}</span>
                    <div className="element-dots">
                        {hardElements.map(e => (
                            <span key={e} className="element-dot" title={ELEMENT_INFO[e as keyof typeof ELEMENT_INFO].label}>
                                {ELEMENT_INFO[e as keyof typeof ELEMENT_INFO].label[0]}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="summary-card soft">
                    <span className="card-label">Soft Elements</span>
                    <span className="card-value">{softAvg.toFixed(1)}</span>
                    <div className="element-dots">
                        {softElements.map(e => (
                            <span key={e} className="element-dot" title={ELEMENT_INFO[e as keyof typeof ELEMENT_INFO].label}>
                                {ELEMENT_INFO[e as keyof typeof ELEMENT_INFO].label[0]}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="summary-card alerts">
                    <span className="card-label">Misalignments</span>
                    <span className="card-value">{diagnostic.misalignments.length}</span>
                    <div className="severity-dots">
                        {diagnostic.misalignments.map((m, i) => (
                            <span key={i} className={`severity-dot ${m.severity}`} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="dashboard-content">
                {/* Radar Chart */}
                <div className="radar-panel">
                    <h2>Organizational Radar</h2>
                    <div className="radar-container">
                        <svg viewBox="0 0 300 300" className="radar-chart">
                            {/* Grid circles */}
                            {[2, 4, 6, 8, 10].map(level => (
                                <circle
                                    key={level}
                                    cx="150"
                                    cy="150"
                                    r={(level / 10) * 120}
                                    fill="none"
                                    stroke="rgba(100, 116, 139, 0.2)"
                                    strokeWidth="1"
                                />
                            ))}

                            {/* Axis lines */}
                            {scores.map((_, i) => {
                                const angle = (Math.PI * 2 * i) / scores.length - Math.PI / 2;
                                return (
                                    <line
                                        key={i}
                                        x1="150"
                                        y1="150"
                                        x2={150 + 130 * Math.cos(angle)}
                                        y2={150 + 130 * Math.sin(angle)}
                                        stroke="rgba(100, 116, 139, 0.2)"
                                        strokeWidth="1"
                                    />
                                );
                            })}

                            {/* Data polygon */}
                            <path
                                d={radarPath}
                                fill="rgba(99, 102, 241, 0.2)"
                                stroke="#6366f1"
                                strokeWidth="2"
                            />

                            {/* Data points */}
                            {radarPoints.map((p, i) => (
                                <circle
                                    key={i}
                                    cx={p.x}
                                    cy={p.y}
                                    r="6"
                                    fill="#6366f1"
                                    stroke="white"
                                    strokeWidth="2"
                                    className="radar-point"
                                    onMouseEnter={() => setSelectedElement(scores[i][0])}
                                    onMouseLeave={() => setSelectedElement(null)}
                                />
                            ))}

                            {/* Labels */}
                            {scores.map(([key, _], i) => {
                                const angle = (Math.PI * 2 * i) / scores.length - Math.PI / 2;
                                const x = 150 + 145 * Math.cos(angle);
                                const y = 150 + 145 * Math.sin(angle);
                                const info = ELEMENT_INFO[key as keyof typeof ELEMENT_INFO];
                                return (
                                    <text
                                        key={key}
                                        x={x}
                                        y={y}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        className="radar-label"
                                    >
                                        {info.label}
                                    </text>
                                );
                            })}
                        </svg>
                    </div>
                </div>

                {/* Misalignments Panel */}
                <div className="misalignments-panel">
                    <h2>Misalignment Alerts</h2>
                    <div className="misalignment-list">
                        {diagnostic.misalignments.map((m, i) => (
                            <div key={i} className={`misalignment-card ${m.severity}`}>
                                <div className="misalignment-header">
                                    <AlertTriangle size={16} />
                                    <span className="elements">
                                        {m.elements[0]} ↔ {m.elements[1]}
                                    </span>
                                    <span className={`severity-badge ${m.severity}`}>
                                        {m.severity}
                                    </span>
                                </div>
                                <p className="misalignment-description">{m.description}</p>
                                <button className="action-btn">
                                    View Recommendations
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Element Scores */}
            <div className="element-scores">
                <h2>Element Scores</h2>
                <div className="scores-grid">
                    {scores.map(([key, score]) => {
                        const info = ELEMENT_INFO[key as keyof typeof ELEMENT_INFO];
                        const isHard = hardElements.includes(key);
                        return (
                            <div key={key} className={`score-card ${isHard ? 'hard' : 'soft'}`}>
                                <div className="score-header">
                                    {info.icon}
                                    <span className="score-label">{info.label}</span>
                                </div>
                                <div className="score-value">
                                    <span className="score-number">{score.toFixed(1)}</span>
                                    <div className="score-bar">
                                        <div
                                            className="score-fill"
                                            style={{ width: `${score * 10}%` }}
                                        />
                                    </div>
                                </div>
                                <span className="score-description">{info.description}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SevenSDashboard;
