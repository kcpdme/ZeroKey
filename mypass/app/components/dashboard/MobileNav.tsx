// app/components/dashboard/MobileNav.tsx
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
    X
} from 'lucide-react';

interface MobileNavProps {
    activeView: string;
    onViewChange: (view: string) => void;
    onQuickAdd: () => void;
    onMenuToggle: () => void;
    isMenuOpen: boolean;
}

const navItems = [
    { id: 'all', label: 'All', icon: LayoutGrid },
    { id: 'favorites', label: 'Favorites', icon: Star },
    { id: 'secure', label: 'Secure', icon: Shield },
    { id: 'memorable', label: 'Memorable', icon: Sparkles },
];

export function MobileBottomNav({
    activeView,
    onViewChange,
    onQuickAdd,
}: Omit<MobileNavProps, 'onMenuToggle' | 'isMenuOpen'>) {
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
                            className="flex flex-col items-center gap-1 px-4 py-2 min-w-[64px]"
                            style={{ color: isActive ? 'var(--color-cyan-500)' : 'var(--text-muted)' }}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs font-medium">{item.label}</span>
                        </button>
                    );
                })}

                {/* Central Add Button */}
                <button
                    onClick={onQuickAdd}
                    className="flex items-center justify-center w-14 h-14 -mt-6 rounded-full shadow-lg"
                    style={{
                        background: 'linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-500))',
                        boxShadow: '0 4px 20px rgba(6, 182, 212, 0.4)',
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
                            className="flex flex-col items-center gap-1 px-4 py-2 min-w-[64px]"
                            style={{ color: isActive ? 'var(--color-cyan-500)' : 'var(--text-muted)' }}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

// Mobile Header
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
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-color)',
            }}
        >
            <button
                onClick={onMenuToggle}
                className="p-2 rounded-lg hover:bg-white/5"
                style={{ color: 'var(--text-secondary)' }}
            >
                <Menu className="w-5 h-5" />
            </button>

            <div className="text-center">
                <h1 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {subtitle}
                    </p>
                )}
            </div>

            <button
                onClick={onSettingsClick}
                className="p-2 rounded-lg hover:bg-white/5"
                style={{ color: 'var(--text-secondary)' }}
            >
                <Settings className="w-5 h-5" />
            </button>
        </header>
    );
}

// Mobile Drawer Menu
interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail?: string;
    onSignOut: () => void;
    stats: {
        total: number;
        secure: number;
        memorable: number;
        favorites: number;
    };
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
                className="fixed inset-0 z-50 bg-black/50 md:hidden"
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className="fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 md:hidden"
                style={{
                    background: 'var(--bg-secondary)',
                    borderRight: '1px solid var(--border-color)',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <div>
                        <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                            Password Vault
                        </h2>
                        <p className="text-xs truncate max-w-[180px]" style={{ color: 'var(--text-muted)' }}>
                            {userEmail}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/5"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Stats */}
                <div className="p-4 space-y-3">
                    <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Statistics
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard label="Total" value={stats.total} color="cyan" />
                        <StatCard label="Favorites" value={stats.favorites} color="yellow" />
                        <StatCard label="Secure" value={stats.secure} color="cyan" />
                        <StatCard label="Memorable" value={stats.memorable} color="purple" />
                    </div>
                </div>

                {/* Sign Out */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <button
                        onClick={onSignOut}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-red-500/10"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    const colorMap: Record<string, string> = {
        cyan: 'var(--color-cyan-500)',
        yellow: '#eab308',
        purple: '#a855f7',
    };

    return (
        <div
            className="p-3 rounded-xl"
            style={{ background: 'var(--bg-tertiary)' }}
        >
            <div className="text-2xl font-bold" style={{ color: colorMap[color] }}>
                {value}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {label}
            </div>
        </div>
    );
}
