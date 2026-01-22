// Dashboard V2 Mobile Components - Bottom nav, header, and drawer
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
    User,
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
                background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
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
                                className={`w-5 h-5 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-500'
                                    }`}
                            />
                            <span
                                className={`text-xs font-medium ${isActive ? 'text-cyan-400' : 'text-slate-500'
                                    }`}
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
                        background: 'linear-gradient(135deg, var(--color-cyan-500), #6366f1)',
                        boxShadow: '0 4px 24px rgba(6, 182, 212, 0.4)',
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
                                className={`w-5 h-5 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-500'
                                    }`}
                            />
                            <span
                                className={`text-xs font-medium ${isActive ? 'text-cyan-400' : 'text-slate-500'
                                    }`}
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
                background: 'linear-gradient(180deg, #0f172a 0%, rgba(15, 23, 42, 0.95) 100%)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            }}
        >
            <button
                onClick={onMenuToggle}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors"
            >
                <Menu className="w-5 h-5 text-slate-400" />
            </button>

            <div className="text-center">
                <h1 className="font-bold text-white">{title}</h1>
                {subtitle && (
                    <p className="text-xs text-slate-500">{subtitle}</p>
                )}
            </div>

            <button
                onClick={onSettingsClick}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors"
            >
                <Settings className="w-5 h-5 text-slate-400" />
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
                style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className="fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 md:hidden animate-slide-in"
                style={{
                    background: 'linear-gradient(180deg, #0d1424 0%, #0f172a 100%)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, var(--color-cyan-500), #6366f1)',
                            }}
                        >
                            <span className="text-white font-semibold">
                                {userEmail?.charAt(0).toUpperCase() || 'U'}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-white truncate">
                                {userEmail?.split('@')[0] || 'User'}
                            </p>
                            <p className="text-xs text-slate-500 truncate max-w-[160px]">
                                {userEmail}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/5 transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Stats */}
                <div className="p-4 space-y-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Quick Stats
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard label="Total" value={stats.total} gradient="cyan" />
                        <StatCard label="Favorites" value={stats.favorites} gradient="yellow" />
                        <StatCard label="Secure" value={stats.secure} gradient="cyan" />
                        <StatCard label="Memorable" value={stats.memorable} gradient="purple" />
                    </div>
                </div>

                {/* Sign Out */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
                    <button
                        onClick={onSignOut}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:bg-red-500/10 text-slate-400 hover:text-red-400"
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
    gradient,
}: {
    label: string;
    value: number;
    gradient: 'cyan' | 'yellow' | 'purple';
}) {
    const gradientStyles = {
        cyan: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(99, 102, 241, 0.1))',
        yellow: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(245, 158, 11, 0.1))',
        purple: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(168, 85, 247, 0.1))',
    };

    const textColors = {
        cyan: 'var(--color-cyan-400)',
        yellow: '#fbbf24',
        purple: '#a855f7',
    };

    return (
        <div
            className="p-4 rounded-xl"
            style={{ background: gradientStyles[gradient] }}
        >
            <div
                className="text-2xl font-bold"
                style={{ color: textColors[gradient] }}
            >
                {value}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
        </div>
    );
}
