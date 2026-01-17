/**
 * Heijunka Board - Production Leveling Dashboard
 * Kanban-style board with velocity metrics and WSJF prioritization
 */

import React, { useState } from 'react';
import {
    LayoutGrid,
    Clock,
    TrendingUp,
    AlertCircle,
    Plus,
    Filter,
    MoreVertical,
    Zap,
    Bug,
    Wrench,
    Timer,
    Users,
} from 'lucide-react';
import './HeijunkaBoard.css';

interface Task {
    id: string;
    title: string;
    type: 'FEATURE' | 'BUG' | 'TECH_DEBT';
    storyPoints: number;
    wsjfScore: number;
    assignee?: string;
    status: 'BACKLOG' | 'READY' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
}

interface Pitch {
    id: string;
    name: string;
    startTime: Date;
    endTime: Date;
    capacityPoints: number;
    tasks: Task[];
}

// Mock data
const MOCK_PITCH: Pitch = {
    id: 'pitch-1',
    name: 'Sprint 24',
    startTime: new Date(),
    endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    capacityPoints: 34,
    tasks: [
        { id: '1', title: 'Implement user authentication', type: 'FEATURE', storyPoints: 8, wsjfScore: 4.2, assignee: 'John', status: 'IN_PROGRESS' },
        { id: '2', title: 'Fix login redirect bug', type: 'BUG', storyPoints: 3, wsjfScore: 6.5, status: 'READY' },
        { id: '3', title: 'Refactor database queries', type: 'TECH_DEBT', storyPoints: 5, wsjfScore: 2.1, status: 'BACKLOG' },
        { id: '4', title: 'Dashboard analytics', type: 'FEATURE', storyPoints: 13, wsjfScore: 3.8, assignee: 'Sarah', status: 'REVIEW' },
        { id: '5', title: 'API rate limiting', type: 'FEATURE', storyPoints: 5, wsjfScore: 4.0, assignee: 'Mike', status: 'DONE' },
    ],
};

const COLUMNS = [
    { id: 'BACKLOG', label: 'Backlog', color: '#64748b' },
    { id: 'READY', label: 'Ready', color: '#06b6d4' },
    { id: 'IN_PROGRESS', label: 'In Progress', color: '#6366f1' },
    { id: 'REVIEW', label: 'Review', color: '#f59e0b' },
    { id: 'DONE', label: 'Done', color: '#10b981' },
];

const TaskTypeIcon: React.FC<{ type: Task['type'] }> = ({ type }) => {
    switch (type) {
        case 'FEATURE':
            return <Zap size={14} className="task-type-icon feature" />;
        case 'BUG':
            return <Bug size={14} className="task-type-icon bug" />;
        case 'TECH_DEBT':
            return <Wrench size={14} className="task-type-icon debt" />;
    }
};

export const HeijunkaBoard: React.FC = () => {
    const [pitch] = useState<Pitch>(MOCK_PITCH);
    const [draggedTask, setDraggedTask] = useState<string | null>(null);

    const getTasksByStatus = (status: Task['status']) =>
        pitch.tasks.filter(t => t.status === status);

    const getPointsByStatus = (status: Task['status']) =>
        getTasksByStatus(status).reduce((sum, t) => sum + t.storyPoints, 0);

    const totalPoints = pitch.tasks.reduce((sum, t) => sum + t.storyPoints, 0);
    const donePoints = getPointsByStatus('DONE');
    const velocity = Math.round((donePoints / totalPoints) * 100);

    const mixRatios = {
        feature: Math.round((pitch.tasks.filter(t => t.type === 'FEATURE').length / pitch.tasks.length) * 100),
        bug: Math.round((pitch.tasks.filter(t => t.type === 'BUG').length / pitch.tasks.length) * 100),
        debt: Math.round((pitch.tasks.filter(t => t.type === 'TECH_DEBT').length / pitch.tasks.length) * 100),
    };

    const handleDragStart = (taskId: string) => {
        setDraggedTask(taskId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (status: Task['status']) => {
        if (draggedTask) {
            // In real app, update task status via API
            console.log(`Moving task ${draggedTask} to ${status}`);
            setDraggedTask(null);
        }
    };

    return (
        <div className="heijunka-board">
            {/* Header */}
            <div className="board-header">
                <div className="header-left">
                    <h1 className="page-title">
                        <LayoutGrid size={24} />
                        Heijunka Board
                    </h1>
                    <span className="pitch-label">{pitch.name}</span>
                </div>

                <div className="header-actions">
                    <button className="btn btn-secondary">
                        <Filter size={16} />
                        Filter
                    </button>
                    <button className="btn btn-primary">
                        <Plus size={16} />
                        Add Task
                    </button>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="metrics-row">
                <div className="metric-card">
                    <div className="metric-icon velocity">
                        <TrendingUp size={20} />
                    </div>
                    <div className="metric-content">
                        <span className="metric-value">{velocity}%</span>
                        <span className="metric-label">Velocity</span>
                    </div>
                    <div className="metric-chart">
                        <div className="progress-bar" style={{ width: `${velocity}%` }} />
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon capacity">
                        <Timer size={20} />
                    </div>
                    <div className="metric-content">
                        <span className="metric-value">{totalPoints}/{pitch.capacityPoints}</span>
                        <span className="metric-label">Capacity</span>
                    </div>
                    <div className="capacity-indicator">
                        {totalPoints > pitch.capacityPoints ? (
                            <AlertCircle size={16} className="warning" />
                        ) : (
                            <span className="available">+{pitch.capacityPoints - totalPoints} pts</span>
                        )}
                    </div>
                </div>

                <div className="metric-card mix-card">
                    <div className="metric-icon mix">
                        <Clock size={20} />
                    </div>
                    <div className="metric-content">
                        <span className="metric-label">Product Mix</span>
                    </div>
                    <div className="mix-bars">
                        <div className="mix-bar feature" style={{ width: `${mixRatios.feature}%` }}>
                            <span>{mixRatios.feature}% F</span>
                        </div>
                        <div className="mix-bar bug" style={{ width: `${mixRatios.bug}%` }}>
                            <span>{mixRatios.bug}% B</span>
                        </div>
                        <div className="mix-bar debt" style={{ width: `${mixRatios.debt}%` }}>
                            <span>{mixRatios.debt}% D</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Kanban Columns */}
            <div className="kanban-container">
                {COLUMNS.map(column => (
                    <div
                        key={column.id}
                        className="kanban-column"
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(column.id as Task['status'])}
                    >
                        <div className="column-header" style={{ borderColor: column.color }}>
                            <span className="column-title">{column.label}</span>
                            <span className="column-count" style={{ background: column.color }}>
                                {getTasksByStatus(column.id as Task['status']).length}
                            </span>
                            <span className="column-points">
                                {getPointsByStatus(column.id as Task['status'])} pts
                            </span>
                        </div>

                        <div className="column-tasks">
                            {getTasksByStatus(column.id as Task['status'])
                                .sort((a, b) => b.wsjfScore - a.wsjfScore)
                                .map(task => (
                                    <div
                                        key={task.id}
                                        className="task-card"
                                        draggable
                                        onDragStart={() => handleDragStart(task.id)}
                                    >
                                        <div className="task-header">
                                            <TaskTypeIcon type={task.type} />
                                            <span className="task-points">{task.storyPoints} pts</span>
                                            <button className="task-menu">
                                                <MoreVertical size={14} />
                                            </button>
                                        </div>

                                        <p className="task-title">{task.title}</p>

                                        <div className="task-footer">
                                            <div className="wsjf-badge" title="WSJF Score">
                                                <TrendingUp size={12} />
                                                {task.wsjfScore.toFixed(1)}
                                            </div>
                                            {task.assignee && (
                                                <div className="assignee">
                                                    <Users size={12} />
                                                    {task.assignee}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                            <button className="add-task-btn">
                                <Plus size={16} />
                                Add Task
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HeijunkaBoard;
