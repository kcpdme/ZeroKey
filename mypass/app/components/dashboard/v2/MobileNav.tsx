// Dashboard V2 Mobile Components - Proton Pass style
'use client';

import React from 'react';
import {
    LayoutGrid,
    Star,
    Shield,
    Sparkles,
    Plus,
    Settings,
    Menu,
    X,
    LogOut
} from 'lucide-react';
import { ViewType, DashboardStats } from './types';

// =============================================================================
// Mobile Bottom Navigation
// =============================================================================

interface MobileBottomNavProps {
    activeView: ViewType;
    onViewChange: (view: ViewType) => void;
    onQuickAdd: () => void;
}

const navItems: { id: ViewType; label: string; icon: React.ElementType }[] = [
    { id: 'all', label: 'All', icon: LayoutGrid },
    { id: 'favorites', label: 'Favorites', icon: Star },
    { id: 'secure', label: 'Secure', icon: Shield },
    { id: 'memorable', label: 'Memorable', icon: Sparkles },
];

export function MobileBottomNav({
    activeView,
    onViewChange,
    onQuickAdd,
}: MobileBottomNavProps) {
    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
            style={{
                background: 'var(--bg-secondary)',
                borderTop: '1px solid var(--border-color)',
                paddingBottom: 'env(safe-area-inset-bottom)',
            }}
        >
            <div className="flex items-center justify-around py-2">
                {navItems.slice(0, 2).map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onViewChange(item.id)}
                            className="flex flex-col items-center gap-1 px-4 py-2 min-w-[64px] transition-colors"
                        >
                            <Icon
                                className="w-5 h-5"
                                style={{
                                    color: isActive ? 'var(--color-cyan-500)' : 'var(--text-muted)',
                                }}
                            />
                            <span
                                className="text-xs font-medium"
                                style={{
                                    color: isActive ? 'var(--color-cyan-500)' : 'var(--text-muted)',
                                }}
                            >
                                {item.label}
                            </span>
                        </button>
                    );
                })}

                {/* Central Add Button */}
                <button
                    onClick={onQuickAdd}
                    className="flex items-center justify-center w-14 h-14 -mt-7 rounded-2xl shadow-lg transition-transform hover:scale-105 active:scale-95"
                    style={{
                        background: 'var(--btn-primary-gradient)',
                        boxShadow: 'var(--btn-primary-shadow)',
                    }}
                >
                    <Plus className="w-6 h-6 text-white" />
                </button>

                {navItems.slice(2, 4).map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onViewChange(item.id)}
                            className="flex flex-col items-center gap-1 px-4 py-2 min-w-[64px] transition-colors"
                        >
                            <Icon
                                className="w-5 h-5"
                                style={{
                                    color: isActive ? 'var(--color-cyan-500)' : 'var(--text-muted)',
                                }}
                            />
                            <span
                                className="text-xs font-medium"
                                style={{
                                    color: isActive ? 'var(--color-cyan-500)' : 'var(--text-muted)',
                                }}
                            >
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

// =============================================================================
// Mobile Header
// =============================================================================

interface MobileHeaderProps {
    title: string;
    subtitle?: string;
    onMenuToggle: () => void;
    onSettingsClick: () => void;
}

export function MobileHeader({
    title,
    subtitle,
    onMenuToggle,
    onSettingsClick,
}: MobileHeaderProps) {
    return (
        <header
            className="flex items-center justify-between px-4 py-3 md:hidden"
            style={{
                background: 'var(--dashboard-header-bg)',
                borderBottom: '1px solid var(--dashboard-header-border)',
            }}
        >
            <button
                onClick={onMenuToggle}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
            >
                <Menu className="w-5 h-5" />
            </button>

            <div className="text-center">
                <h1
                    className="font-bold"
                    style={{ color: 'var(--text-primary)' }}
                >
                    {title}
                </h1>
                {subtitle && (
                    <p
                        className="text-xs"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        {subtitle}
                    </p>
                )}
            </div>

            <button
                onClick={onSettingsClick}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
            >
                <Settings className="w-5 h-5" />
            </button>
        </header>
    );
}

// =============================================================================
// Mobile Drawer
// =============================================================================

interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail?: string;
    onSignOut: () => void;
    stats: DashboardStats;
}

export function MobileDrawer({
    isOpen,
    onClose,
    userEmail,
    onSignOut,
    stats,
}: MobileDrawerProps) {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 md:hidden transition-opacity"
                style={{
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(4px)',
                }}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className="fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 md:hidden"
                style={{
                    background: 'var(--sidebar-bg)',
                    borderRight: '1px solid var(--sidebar-border)',
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between p-4 border-b"
                    style={{ borderColor: 'var(--sidebar-border)' }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: 'var(--sidebar-avatar-gradient)' }}
                        >
                            <span className="text-white font-semibold">
                                {userEmail?.charAt(0).toUpperCase() || 'U'}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p
                                className="font-semibold truncate"
                                style={{ color: 'var(--sidebar-text-primary)' }}
                            >
                                {userEmail?.split('@')[0] || 'User'}
                            </p>
                            <p
                                className="text-xs truncate max-w-[160px]"
                                style={{ color: 'var(--sidebar-text-muted)' }}
                            >
                                {userEmail}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--sidebar-text-muted)' }}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Stats */}
                <div className="p-4 space-y-4">
                    <div
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--sidebar-text-muted)' }}
                    >
                        Quick Stats
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard label="Total" value={stats.total} type="cyan" />
                        <StatCard label="Favorites" value={stats.favorites} type="yellow" />
                        <StatCard label="Secure" value={stats.secure} type="cyan" />
                        <StatCard label="Memorable" value={stats.memorable} type="purple" />
                    </div>
                </div>

                {/* Sign Out */}
                <div
                    className="absolute bottom-0 left-0 right-0 p-4 border-t"
                    style={{ borderColor: 'var(--sidebar-border)' }}
                >
                    <button
                        onClick={onSignOut}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                        style={{ color: 'var(--sidebar-text-muted)' }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--sidebar-danger-hover-bg)';
                            e.currentTarget.style.color = 'var(--sidebar-danger-text)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--sidebar-text-muted)';
                        }}
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </div>
        </>
    );
}

// =============================================================================
// Stat Card Component
// =============================================================================

function StatCard({
    label,
    value,
    type,
}: {
    label: string;
    value: number;
    type: 'cyan' | 'yellow' | 'purple';
}) {
    const accentMap = {
        cyan: 'var(--sidebar-accent-cyan)',
        yellow: 'var(--sidebar-accent-yellow)',
        purple: 'var(--sidebar-accent-purple)',
    };

    return (
        <div
            className="p-4 rounded-xl"
            style={{ background: 'var(--sidebar-count-bg)' }}
        >
            <div
                className="text-2xl font-bold"
                style={{ color: accentMap[type] }}
            >
                {value}
            </div>
            <div
                className="text-xs mt-0.5"
                style={{ color: 'var(--sidebar-text-muted)' }}
            >
                {label}
            </div>
        </div>
    );
}
