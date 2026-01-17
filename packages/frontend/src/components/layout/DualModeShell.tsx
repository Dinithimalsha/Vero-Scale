/**
 * Dual-Mode Shell - Maker/Manager UI Toggle
 * Per requirements: Shield during Maker hours, Command center during Manager hours
 */

import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
    Workflow,
    DollarSign,
    Scale,
    Settings,
    Sun,
    Moon,
    Bell,
    Menu,
    X,
} from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

const navItems = [
    { path: '/operations', label: 'Operations', icon: Workflow },
    { path: '/finance', label: 'Finance', icon: DollarSign },
    { path: '/legal', label: 'Legal', icon: Scale },
];

export function DualModeShell() {
    const { mode, setMode, systemHealth } = useUIStore();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();

    const isAndonActive = systemHealth?.status === 'RED';

    return (
        <div className="app-shell">
            {/* Andon Alert Banner */}
            {isAndonActive && (
                <div className="andon-banner">
                    <div className="health-indicator red" />
                    <div className="flex-col">
                        <span style={{ fontWeight: 600, color: 'var(--color-error)' }}>
                            🚨 ANDON ACTIVE
                        </span>
                        <span className="text-sm text-muted">
                            Pipeline locked. {systemHealth?.activeIncidentCount} incident(s) require resolution.
                        </span>
                    </div>
                    <button className="btn btn-danger" style={{ marginLeft: 'auto' }}>
                        View Incidents
                    </button>
                </div>
            )}

            <div className="flex" style={{ minHeight: '100vh' }}>
                {/* Sidebar */}
                <aside
                    className="sidebar"
                    style={{
                        width: sidebarOpen ? '240px' : '64px',
                        background: 'var(--color-bg-secondary)',
                        borderRight: '1px solid var(--color-border)',
                        transition: 'width var(--transition-normal)',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* Logo */}
                    <div
                        className="flex items-center gap-md"
                        style={{
                            padding: 'var(--spacing-lg)',
                            borderBottom: '1px solid var(--color-border)',
                        }}
                    >
                        <div
                            style={{
                                width: 32,
                                height: 32,
                                background: 'var(--color-accent-gradient)',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '1rem',
                            }}
                        >
                            V
                        </div>
                        {sidebarOpen && (
                            <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                                VeroScale
                            </span>
                        )}
                    </div>

                    {/* Mode Toggle */}
                    {sidebarOpen && (
                        <div style={{ padding: 'var(--spacing-md)' }}>
                            <div className="mode-toggle">
                                <button
                                    className={mode === 'MAKER' ? 'active' : ''}
                                    onClick={() => setMode('MAKER')}
                                >
                                    <Moon size={14} style={{ marginRight: 4 }} />
                                    Maker
                                </button>
                                <button
                                    className={mode === 'MANAGER' ? 'active' : ''}
                                    onClick={() => setMode('MANAGER')}
                                >
                                    <Sun size={14} style={{ marginRight: 4 }} />
                                    Manager
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav style={{ flex: 1, padding: 'var(--spacing-md)' }}>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                            {navItems.map((item) => (
                                <li key={item.path}>
                                    <NavLink
                                        to={item.path}
                                        className={({ isActive }) =>
                                            `nav-link ${isActive ? 'active' : ''}`
                                        }
                                        style={({ isActive }) => ({
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--spacing-sm)',
                                            padding: 'var(--spacing-sm) var(--spacing-md)',
                                            borderRadius: 'var(--radius-md)',
                                            color: isActive
                                                ? 'var(--color-text-primary)'
                                                : 'var(--color-text-muted)',
                                            background: isActive
                                                ? 'var(--color-bg-elevated)'
                                                : 'transparent',
                                            textDecoration: 'none',
                                            transition: 'all var(--transition-fast)',
                                        })}
                                    >
                                        <item.icon size={18} />
                                        {sidebarOpen && <span>{item.label}</span>}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Collapse Toggle */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        style={{
                            margin: 'var(--spacing-md)',
                            padding: 'var(--spacing-sm)',
                            background: 'var(--color-bg-tertiary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </aside>

                {/* Main Content */}
                <main
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}
                >
                    {/* Top Bar (Manager Mode only) */}
                    {mode === 'MANAGER' && (
                        <header
                            className="flex items-center justify-between glass"
                            style={{
                                padding: 'var(--spacing-md) var(--spacing-xl)',
                                borderBottom: '1px solid var(--color-border)',
                            }}
                        >
                            <div className="flex items-center gap-md">
                                <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                                    {navItems.find((n) => n.path === location.pathname)?.label ||
                                        'Dashboard'}
                                </h1>
                                <span className="badge badge-green">
                                    <div className="health-indicator green" />
                                    System Healthy
                                </span>
                            </div>

                            <div className="flex items-center gap-md">
                                <button
                                    className="btn btn-secondary"
                                    style={{ position: 'relative' }}
                                >
                                    <Bell size={18} />
                                    <span
                                        style={{
                                            position: 'absolute',
                                            top: -4,
                                            right: -4,
                                            width: 18,
                                            height: 18,
                                            background: 'var(--color-error)',
                                            borderRadius: '50%',
                                            fontSize: '0.7rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        3
                                    </span>
                                </button>
                                <button className="btn btn-secondary">
                                    <Settings size={18} />
                                </button>
                            </div>
                        </header>
                    )}

                    {/* Page Content */}
                    <div
                        style={{
                            flex: 1,
                            overflow: 'auto',
                            padding:
                                mode === 'MAKER'
                                    ? 'var(--spacing-xl)'
                                    : 'var(--spacing-lg) var(--spacing-xl)',
                        }}
                    >
                        {mode === 'MAKER' ? (
                            <MakerModeWrapper>
                                <Outlet />
                            </MakerModeWrapper>
                        ) : (
                            <Outlet />
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

/**
 * Maker Mode Wrapper - Minimal distractions
 * Shields the user from interruptions during deep work
 */
function MakerModeWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div
                className="glass"
                style={{
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    borderRadius: 'var(--radius-full)',
                    marginBottom: 'var(--spacing-xl)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)',
                }}
            >
                <Moon size={14} />
                <span className="text-sm text-muted">Maker Mode Active</span>
                <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>
                    • Focus Protected
                </span>
            </div>
            {children}
        </div>
    );
}
