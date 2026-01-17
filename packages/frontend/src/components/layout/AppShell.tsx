/**
 * AppShell - Main Application Layout
 * Unified navigation sidebar with quick access to all dashboards
 */

import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Factory,
    DollarSign,
    Compass,
    Users,
    ChevronLeft,
    ChevronRight,
    Bell,
    Settings,
    User,
    Zap,
    AlertTriangle,
    Trash2,
    FileText,
    PiggyBank,
    TrendingUp,
    GitBranch,
    Target,
    BarChart3,
    ClipboardCheck,
    MessageSquare,
    Menu,
    // Algorithmic Enterprise icons
    Activity,
    Vote,
    Skull,
    Shield,
} from 'lucide-react';
import './AppShell.css';

interface NavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
    children?: NavItem[];
}

const NAVIGATION: NavItem[] = [
    {
        label: 'Operations',
        path: '/operations',
        icon: <Factory size={20} />,
        children: [
            { label: 'Heijunka Board', path: '/operations/heijunka', icon: <LayoutDashboard size={16} /> },
            { label: 'Andon Dashboard', path: '/operations/andon', icon: <AlertTriangle size={16} /> },
            { label: 'Muda Metrics', path: '/operations/muda', icon: <Trash2 size={16} /> },
        ],
    },
    {
        label: 'Finance',
        path: '/finance',
        icon: <DollarSign size={20} />,
        children: [
            { label: 'Live Ledger', path: '/finance/ledger', icon: <FileText size={16} /> },
            { label: 'Unit Economics', path: '/finance/unit-economics', icon: <PiggyBank size={16} /> },
            { label: 'Rule of 40', path: '/finance/rule-of-40', icon: <TrendingUp size={16} /> },
            { label: 'ZBB Agents', path: '/finance/zbb', icon: <Skull size={16} /> },
        ],
    },
    {
        label: 'Markets',
        path: '/markets',
        icon: <Activity size={20} />,
        children: [
            { label: 'Prediction Markets', path: '/markets/predictions', icon: <TrendingUp size={16} /> },
        ],
    },
    {
        label: 'Governance',
        path: '/governance',
        icon: <Vote size={20} />,
        children: [
            { label: 'Quadratic Voting', path: '/governance/voting', icon: <Vote size={16} /> },
        ],
    },
    {
        label: 'Compliance',
        path: '/compliance',
        icon: <Shield size={20} />,
        children: [
            { label: 'Policy Dashboard', path: '/compliance/policies', icon: <Shield size={16} /> },
        ],
    },
    {
        label: 'Strategy',
        path: '/strategy',
        icon: <Compass size={20} />,
        children: [
            { label: 'MECE Issue Trees', path: '/strategy/issue-trees', icon: <GitBranch size={16} /> },
            { label: '7S Diagnostic', path: '/strategy/seven-s', icon: <Target size={16} /> },
            { label: 'North Star', path: '/strategy/north-star', icon: <BarChart3 size={16} /> },
        ],
    },
    {
        label: 'Human Capital',
        path: '/human-capital',
        icon: <Users size={20} />,
        children: [
            { label: 'Topgrading', path: '/human-capital/topgrading', icon: <ClipboardCheck size={16} /> },
            { label: 'Radical Candor', path: '/human-capital/feedback', icon: <MessageSquare size={16} /> },
        ],
    },
];

const QUICK_ACTIONS = [
    { label: 'Quick Add Task', icon: <Zap size={18} />, action: 'add-task' },
    { label: 'Pull Andon Cord', icon: <AlertTriangle size={18} />, action: 'andon' },
    { label: 'Log Feedback', icon: <MessageSquare size={18} />, action: 'feedback' },
];

export const AppShell: React.FC = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState<string[]>(['Operations']);
    const location = useLocation();

    const toggleMenu = (label: string) => {
        setExpandedMenus(prev =>
            prev.includes(label)
                ? prev.filter(l => l !== label)
                : [...prev, label]
        );
    };

    const isActive = (path: string) => location.pathname.startsWith(path);

    return (
        <div className="app-shell">
            {/* Sidebar */}
            <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
                {/* Logo */}
                <div className="sidebar-header">
                    <div className="logo">
                        <div className="logo-icon">V</div>
                        {!isCollapsed && <span className="logo-text">VeroScale</span>}
                    </div>
                    <button
                        className="collapse-btn"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>

                {/* Quick Actions */}
                {!isCollapsed && (
                    <div className="quick-actions">
                        {QUICK_ACTIONS.map(action => (
                            <button key={action.action} className="quick-action-btn" title={action.label}>
                                {action.icon}
                            </button>
                        ))}
                    </div>
                )}

                {/* Navigation */}
                <nav className="sidebar-nav">
                    {NAVIGATION.map(item => (
                        <div key={item.label} className="nav-group">
                            <button
                                className={`nav-item parent ${isActive(item.path) ? 'active' : ''}`}
                                onClick={() => !isCollapsed && toggleMenu(item.label)}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                {!isCollapsed && (
                                    <>
                                        <span className="nav-label">{item.label}</span>
                                        {item.children && (
                                            <ChevronRight
                                                size={14}
                                                className={`nav-chevron ${expandedMenus.includes(item.label) ? 'expanded' : ''}`}
                                            />
                                        )}
                                    </>
                                )}
                            </button>

                            {!isCollapsed && item.children && expandedMenus.includes(item.label) && (
                                <div className="nav-children">
                                    {item.children.map(child => (
                                        <NavLink
                                            key={child.path}
                                            to={child.path}
                                            className={({ isActive }) =>
                                                `nav-item child ${isActive ? 'active' : ''}`
                                            }
                                        >
                                            <span className="nav-icon">{child.icon}</span>
                                            <span className="nav-label">{child.label}</span>
                                        </NavLink>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                {/* Footer */}
                <div className="sidebar-footer">
                    <NavLink to="/settings" className="nav-item">
                        <Settings size={20} />
                        {!isCollapsed && <span>Settings</span>}
                    </NavLink>
                </div>
            </aside>

            {/* Main Content */}
            <div className="main-container">
                {/* Top Bar */}
                <header className="top-bar">
                    <div className="top-bar-left">
                        <button className="mobile-menu-btn">
                            <Menu size={20} />
                        </button>
                        <div className="breadcrumb">
                            {location.pathname.split('/').filter(Boolean).map((segment, i, arr) => (
                                <React.Fragment key={segment}>
                                    <span className="breadcrumb-item">
                                        {segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')}
                                    </span>
                                    {i < arr.length - 1 && <span className="breadcrumb-separator">/</span>}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="top-bar-right">
                        <button className="icon-btn" title="Notifications">
                            <Bell size={20} />
                            <span className="notification-badge">3</span>
                        </button>
                        <button className="icon-btn" title="Profile">
                            <User size={20} />
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="page-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AppShell;
