/**
 * UI Store - Global UI state management
 * Manages Maker/Manager mode and system health status
 */

import { create } from 'zustand';

export type UIMode = 'MAKER' | 'MANAGER';

export interface SystemHealth {
    status: 'GREEN' | 'YELLOW' | 'RED';
    activeIncidentCount: number;
    mainBranchLocked: boolean;
}

interface UIState {
    mode: UIMode;
    systemHealth: SystemHealth | null;
    notifications: number;

    setMode: (mode: UIMode) => void;
    setSystemHealth: (health: SystemHealth) => void;
    setNotifications: (count: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
    mode: 'MANAGER',
    systemHealth: { status: 'GREEN', activeIncidentCount: 0, mainBranchLocked: false },
    notifications: 3,

    setMode: (mode) => set({ mode }),
    setSystemHealth: (systemHealth) => set({ systemHealth }),
    setNotifications: (notifications) => set({ notifications }),
}));
