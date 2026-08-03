// Dashboard V2 Sidebar - Alt Design style
'use client';

import React from 'react';
import {
    KeyRound,
    Shield,
    Sparkles,
    Settings,
    LogOut,
    LayoutGrid,
    Star,
    ArrowLeft,
    Moon,
    Sun,
} from 'lucide-react';
import { ZeroKeyLogo } from '../../ui/ZeroKeyLogo';
import { Theme } from '../../../hooks/useTheme';
import { ViewType, DashboardStats } from './types';
import { TagFilter } from '../TagSelector';

interface SidebarProps {
    activeView: ViewType;
    onViewChange: (view: ViewType) => void;
    onSettingsClick: () => void;
    onSignOut: () => void;
    onClose: () => void;
    stats: DashboardStats;
    userEmail?: string;
    // Tag filter props
    selectedTagFilter?: string | null;
    onTagFilterChange?: (tag: string | null) => void;
    allTags?: string[];
    // Theme props
    theme?: Theme;
    onThemeToggle?: () => void;
}

interface NavItemConfig {
    id: ViewType;
    label: string;
    icon: React.ElementType;
    countKey: keyof DashboardStats;
}

const navItems: NavItemConfig[] = [
    { id: 'all', label: 'All Items', icon: LayoutGrid, countKey: 'total' },
    { id: 'favorites', label: 'Favorites', icon: Star, countKey: 'favorites' },
    { id: 'secure', label: 'Secure', icon: Shield, countKey: 'secure' },
    { id: 'memorable', label: 'Memorable', icon: Sparkles, countKey: 'memorable' },
];

export function Sidebar({
    activeView,
    onViewChange,
    onSettingsClick,
    onSignOut,
    onClose,
    stats,
    userEmail,
    selectedTagFilter,
    onTagFilterChange,
    allTags = [],
    theme = 'dark',
    onThemeToggle,
}: SidebarProps) {
    const initials = userEmail
        ? userEmail.split('@')[0].slice(0, 2).toUpperCase()
        : 'U';

    return (
        <aside className="hidden md:flex flex-col h-full w-60 shrink-0 sidebar-alt">
            {/* Logo + brand */}
            <div className="flex items-center gap-2.5 px-5 pt-5 pb-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl sidebar-logo-badge">
                    <ZeroKeyLogo
                        className="w-5 h-5"
                        style={{ color: 'var(--c-accent, var(--color-cyan-500))' }}
                    />
                </span>
                <span>
                    <span className="block text-sm font-semibold leading-tight sidebar-ink">
                        ZeroKey
                    </span>
                    <span className="block text-[11px] sidebar-muted">nothing stored, ever</span>
                </span>
            </div>

            {/* Navigation */}
            <nav aria-label="Vault" className="mt-5 space-y-0.5 px-3 flex-1 overflow-y-auto">
                <div
                    className="text-[10px] font-semibold uppercase tracking-wider px-3 mb-2 sidebar-muted"
                >
                    Vault
                </div>

                {navItems.map(({ id, label, icon: Icon, countKey }) => {
                    const isActive = activeView === id && !selectedTagFilter;
                    const count = stats[countKey];

                    return (
                        <button
                            key={id}
                            onClick={() => {
                                onViewChange(id);
                                onTagFilterChange?.(null);
                            }}
                            className={`
                                relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5
                                text-sm font-medium transition-colors
                                ${isActive ? 'sidebar-nav-active' : 'sidebar-nav-idle'}
                            `}
                        >
                            {/* Animated highlight background */}
                            {isActive && (
                                <span className="absolute inset-0 rounded-xl sidebar-nav-bg" />
                            )}

                            <Icon
                                className={`relative h-4 w-4 ${isActive ? 'sidebar-icon-active' : ''}`}
                                aria-hidden
                            />
                            <span className="relative flex-1 text-left">{label}</span>
                            <span
                                className={`relative px-2 py-0.5 rounded-md text-xs font-medium ${
                                    isActive ? 'sidebar-count-active' : 'sidebar-count-idle'
                                }`}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}

                {/* Tag Categories Filter */}
                {allTags.length > 0 && onTagFilterChange && (
                    <div className="mt-4 pt-3 sidebar-divider">
                        <TagFilter
                            selectedTag={selectedTagFilter ?? null}
                            onSelect={onTagFilterChange}
                            tags={allTags}
                        />
                    </div>
                )}
            </nav>

            {/* Bottom section - Uncluttered modern footer */}
            <div className="mt-auto space-y-2 px-3 pb-3 pt-3 sidebar-divider-top">
                {/* Back to Generator */}
                <button
                    onClick={onClose}
                    className="sidebar-btn-ghost w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Generator</span>
                </button>

                {/* Integrated User Profile Card with Compact Action Toolbar */}
                <div className="flex items-center justify-between rounded-xl px-2.5 py-2 sidebar-user-card">
                    {/* User Avatar + Name */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold sidebar-user-avatar">
                            {initials}
                        </span>
                        <span className="block truncate text-xs font-medium sidebar-ink">
                            {userEmail?.split('@')[0] || 'User'}
                        </span>
                    </div>

                    {/* Compact Icon Action Toolbar */}
                    <div className="flex items-center gap-0.5 shrink-0">
                        {/* Theme toggle */}
                        {onThemeToggle && (
                            <button
                                type="button"
                                onClick={onThemeToggle}
                                className="sidebar-action-icon flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                                title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
                                aria-label="Toggle theme"
                            >
                                {theme === 'dark' ? (
                                    <Sun className="h-3.5 w-3.5" />
                                ) : (
                                    <Moon className="h-3.5 w-3.5" />
                                )}
                            </button>
                        )}

                        {/* Settings */}
                        <button
                            onClick={onSettingsClick}
                            className="sidebar-action-icon flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                            title="Settings"
                            aria-label="Settings"
                        >
                            <Settings className="w-3.5 h-3.5" />
                        </button>

                        {/* Sign Out */}
                        <button
                            onClick={onSignOut}
                            className="sidebar-action-icon-danger flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                            title="Sign Out"
                            aria-label="Sign Out"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
}
