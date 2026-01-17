/**
 * Andon Dashboard - Pipeline Health & Incident Response
 * Real-time alerts, MTTR tracking, and swarm coordination
 */

import React, { useState } from 'react';
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    Users,
    Activity,
    Bell,
    XCircle,
    AlertOctagon,
    TrendingDown,
    Shield,
    Zap,
    RefreshCw,
} from 'lucide-react';
import './AndonDashboard.css';

interface AndonEvent {
    id: string;
    triggerType: 'PIPELINE_FAILURE' | 'SECURITY_ALERT' | 'QUALITY_GATE' | 'MANUAL_STOP';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: 'ACTIVE' | 'SWARMING' | 'RESOLVED' | 'IGNORED';
    title: string;
    source: string;
    mttrMinutes?: number;
    startedAt: Date;
    resolvedAt?: Date;
    responders: string[];
}

// Mock data
const MOCK_EVENTS: AndonEvent[] = [
    {
        id: '1',
        triggerType: 'PIPELINE_FAILURE',
        severity: 'HIGH',
        status: 'SWARMING',
        title: 'CI/CD Pipeline Failed - main branch',
        source: 'GitHub Actions',
        startedAt: new Date(Date.now() - 15 * 60 * 1000),
        responders: ['John', 'Sarah'],
    },
    {
        id: '2',
        triggerType: 'SECURITY_ALERT',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        title: 'Dependency vulnerability detected',
        source: 'Snyk',
        startedAt: new Date(Date.now() - 5 * 60 * 1000),
        responders: [],
    },
    {
        id: '3',
        triggerType: 'QUALITY_GATE',
        severity: 'MEDIUM',
        status: 'RESOLVED',
        title: 'Code coverage below threshold',
        source: 'SonarQube',
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        resolvedAt: new Date(Date.now() - 45 * 60 * 1000),
        mttrMinutes: 75,
        responders: ['Mike'],
    },
];

const MTTR_HISTORY = [
    { date: 'Mon', value: 45 },
    { date: 'Tue', value: 32 },
    { date: 'Wed', value: 68 },
    { date: 'Thu', value: 28 },
    { date: 'Fri', value: 52 },
    { date: 'Sat', value: 15 },
    { date: 'Sun', value: 22 },
];

const getSeverityColor = (severity: AndonEvent['severity']) => {
    switch (severity) {
        case 'CRITICAL': return '#ef4444';
        case 'HIGH': return '#f97316';
        case 'MEDIUM': return '#eab308';
        case 'LOW': return '#22c55e';
    }
};

const getStatusIcon = (status: AndonEvent['status']) => {
    switch (status) {
        case 'ACTIVE': return <AlertOctagon size={16} />;
        case 'SWARMING': return <Users size={16} />;
        case 'RESOLVED': return <CheckCircle size={16} />;
        case 'IGNORED': return <XCircle size={16} />;
    }
};

export const AndonDashboard: React.FC = () => {
    const [events] = useState<AndonEvent[]>(MOCK_EVENTS);
    const [isPipelineLocked, setIsPipelineLocked] = useState(false);

    const activeEvents = events.filter(e => e.status === 'ACTIVE' || e.status === 'SWARMING');
    const avgMTTR = Math.round(
        events.filter(e => e.mttrMinutes).reduce((sum, e) => sum + (e.mttrMinutes || 0), 0) /
        events.filter(e => e.mttrMinutes).length || 0
    );
    const maxMTTR = Math.max(...MTTR_HISTORY.map(h => h.value));

    return (
        <div className="andon-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-left">
                    <h1 className="page-title">
                        <AlertTriangle size={24} />
                        Andon Dashboard
                    </h1>
                    <div className={`pipeline-status ${isPipelineLocked ? 'locked' : 'healthy'}`}>
                        {isPipelineLocked ? (
                            <>
                                <XCircle size={16} />
                                Pipeline Locked
                            </>
                        ) : (
                            <>
                                <CheckCircle size={16} />
                                Pipeline Healthy
                            </>
                        )}
                    </div>
                </div>

                <button
                    className={`andon-cord ${isPipelineLocked ? 'locked' : ''}`}
                    onClick={() => setIsPipelineLocked(!isPipelineLocked)}
                >
                    <Bell size={20} />
                    {isPipelineLocked ? 'Release Cord' : 'Pull Andon Cord'}
                </button>
            </div>

            {/* Metrics */}
            <div className="metrics-grid">
                <div className="metric-card active-issues">
                    <div className="metric-icon">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="metric-content">
                        <span className="metric-value">{activeEvents.length}</span>
                        <span className="metric-label">Active Issues</span>
                    </div>
                    <div className="severity-dots">
                        {activeEvents.map(e => (
                            <span
                                key={e.id}
                                className="severity-dot"
                                style={{ background: getSeverityColor(e.severity) }}
                            />
                        ))}
                    </div>
                </div>

                <div className="metric-card mttr">
                    <div className="metric-icon">
                        <Clock size={24} />
                    </div>
                    <div className="metric-content">
                        <span className="metric-value">{avgMTTR}m</span>
                        <span className="metric-label">Avg MTTR</span>
                    </div>
                    <div className="trend">
                        <TrendingDown size={16} />
                        <span>-12% vs last week</span>
                    </div>
                </div>

                <div className="metric-card responders">
                    <div className="metric-icon">
                        <Users size={24} />
                    </div>
                    <div className="metric-content">
                        <span className="metric-value">
                            {new Set(events.flatMap(e => e.responders)).size}
                        </span>
                        <span className="metric-label">Responders Active</span>
                    </div>
                </div>

                <div className="metric-card uptime">
                    <div className="metric-icon">
                        <Shield size={24} />
                    </div>
                    <div className="metric-content">
                        <span className="metric-value">99.7%</span>
                        <span className="metric-label">Uptime (7d)</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="dashboard-content">
                {/* Events List */}
                <div className="events-panel">
                    <div className="panel-header">
                        <h2>Active Incidents</h2>
                        <button className="refresh-btn">
                            <RefreshCw size={16} />
                        </button>
                    </div>

                    <div className="events-list">
                        {events.map(event => (
                            <div
                                key={event.id}
                                className={`event-card ${event.status.toLowerCase()}`}
                            >
                                <div
                                    className="severity-bar"
                                    style={{ background: getSeverityColor(event.severity) }}
                                />

                                <div className="event-content">
                                    <div className="event-header">
                                        <span className="event-type">
                                            {event.triggerType.replace(/_/g, ' ')}
                                        </span>
                                        <span
                                            className={`event-status ${event.status.toLowerCase()}`}
                                        >
                                            {getStatusIcon(event.status)}
                                            {event.status}
                                        </span>
                                    </div>

                                    <h3 className="event-title">{event.title}</h3>

                                    <div className="event-meta">
                                        <span className="source">
                                            <Activity size={14} />
                                            {event.source}
                                        </span>
                                        <span className="time">
                                            <Clock size={14} />
                                            {Math.round((Date.now() - event.startedAt.getTime()) / 60000)}m ago
                                        </span>
                                        {event.responders.length > 0 && (
                                            <span className="responders-count">
                                                <Users size={14} />
                                                {event.responders.length} responding
                                            </span>
                                        )}
                                    </div>

                                    {event.status === 'ACTIVE' && (
                                        <div className="event-actions">
                                            <button className="btn-swarm">
                                                <Zap size={14} />
                                                Join Swarm
                                            </button>
                                            <button className="btn-acknowledge">
                                                Acknowledge
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* MTTR Chart */}
                <div className="mttr-panel">
                    <div className="panel-header">
                        <h2>MTTR Trend (7 Days)</h2>
                    </div>

                    <div className="mttr-chart">
                        {MTTR_HISTORY.map(day => (
                            <div key={day.date} className="chart-bar-container">
                                <div
                                    className="chart-bar"
                                    style={{ height: `${(day.value / maxMTTR) * 100}%` }}
                                >
                                    <span className="bar-value">{day.value}m</span>
                                </div>
                                <span className="bar-label">{day.date}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mttr-target">
                        <span>Target: 30 min</span>
                        <div className="target-line" style={{ bottom: `${(30 / maxMTTR) * 100}%` }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AndonDashboard;
