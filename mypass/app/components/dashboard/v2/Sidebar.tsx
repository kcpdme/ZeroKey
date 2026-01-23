// Dashboard V2 Sidebar - Proton Pass inspired design
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
} from 'lucide-react';
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
}

interface NavItemConfig {
    id: ViewType;
    label: string;
    icon: React.ElementType;
    countKey: keyof DashboardStats;
    accentColor?: string;
}

const navItems: NavItemConfig[] = [
    { id: 'all', label: 'All Items', icon: LayoutGrid, countKey: 'total' },
    { id: 'favorites', label: 'Favorites', icon: Star, countKey: 'favorites', accentColor: 'var(--sidebar-accent-yellow)' },
    { id: 'secure', label: 'Secure', icon: Shield, countKey: 'secure', accentColor: 'var(--sidebar-accent-cyan)' },
    { id: 'memorable', label: 'Memorable', icon: Sparkles, countKey: 'memorable', accentColor: 'var(--sidebar-accent-purple)' },
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
}: SidebarProps) {
    return (
        <aside
            className="hidden md:flex flex-col h-full w-64 shrink-0"
            style={{
                background: 'var(--sidebar-bg)',
                borderRight: '1px solid var(--sidebar-border)',
            }}
        >
            {/* Logo Section with Back Button */}
            <div
                className="p-4 border-b flex items-center gap-3"
                style={{ borderColor: 'var(--sidebar-border)' }}
            >
                {/* Back/Close Button - LEFT side */}
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
                    style={{ color: 'var(--sidebar-text-muted)' }}
                    title="Close Vault"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                        className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                        style={{
                            background: 'var(--sidebar-logo-gradient)',
                            boxShadow: 'var(--sidebar-logo-shadow)',
                        }}
                    >
                        <KeyRound className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="font-bold" style={{ color: 'var(--sidebar-text-primary)' }}>
                            MyPass
                        </h1>
                        <p className="text-xs" style={{ color: 'var(--sidebar-text-muted)' }}>
                            Password Vault
                        </p>
                    </div>
                </div>
            </div>

            {/* User Section */}
            <div
                className="px-4 py-3 border-b"
                style={{ borderColor: 'var(--sidebar-border)' }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: 'var(--sidebar-avatar-gradient)' }}
                    >
                        <span className="text-white font-semibold text-sm">
                            {userEmail?.charAt(0).toUpperCase() || 'U'}
                        </span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <p
                            className="text-sm font-medium truncate"
                            style={{ color: 'var(--sidebar-text-primary)' }}
                        >
                            {userEmail?.split('@')[0] || 'User'}
                        </p>
                        <p
                            className="text-xs truncate"
                            style={{ color: 'var(--sidebar-text-muted)' }}
                        >
                            {userEmail}
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-3 px-2 space-y-4 overflow-y-auto">
                <div>
                    <div
                        className="text-[10px] font-semibold uppercase tracking-wider px-3 mb-2"
                        style={{ color: 'var(--sidebar-text-muted)' }}
                    >
                        Vault
                    </div>

                    <div className="space-y-0.5">
                        {navItems.map((item) => {
                            const isActive = activeView === item.id && !selectedTagFilter;
                            const Icon = item.icon;
                            const count = stats[item.countKey];

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        onViewChange(item.id);
                                        onTagFilterChange?.(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative"
                                    style={{
                                        background: isActive ? 'var(--sidebar-item-active-bg)' : 'transparent',
                                        color: isActive ? 'var(--sidebar-item-active-text)' : 'var(--sidebar-text-secondary)',
                                    }}
                                >
                                    {/* Active indicator bar */}
                                    {isActive && (
                                        <div
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                                            style={{ background: 'var(--sidebar-active-indicator)' }}
                                        />
                                    )}

                                    <Icon
                                        className="w-[18px] h-[18px] shrink-0 transition-colors"
                                        style={{
                                            color: isActive
                                                ? item.accentColor || 'var(--sidebar-accent-cyan)'
                                                : undefined,
                                        }}
                                    />

                                    <span className="flex-1 text-left">{item.label}</span>

                                    <span
                                        className="px-2 py-0.5 rounded-md text-xs font-medium"
                                        style={{
                                            background: isActive
                                                ? 'var(--sidebar-count-active-bg)'
                                                : 'var(--sidebar-count-bg)',
                                            color: isActive
                                                ? 'var(--sidebar-count-active-text)'
                                                : 'var(--sidebar-text-muted)',
                                        }}
                                    >
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tag Categories Filter */}
                {allTags.length > 0 && onTagFilterChange && (
                    <div
                        className="pt-3 border-t"
                        style={{ borderColor: 'var(--sidebar-border)' }}
                    >
                        <TagFilter
                            selectedTag={selectedTagFilter ?? null}
                            onSelect={onTagFilterChange}
                            tags={allTags}
                        />
                    </div>
                )}
            </nav>

            {/* Bottom Actions */}
            <div
                className="p-2 border-t space-y-0.5"
                style={{ borderColor: 'var(--sidebar-border)' }}
            >
                <button
                    onClick={onSettingsClick}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={{ color: 'var(--sidebar-text-secondary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--sidebar-hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <Settings className="w-[18px] h-[18px]" />
                    <span>Settings</span>
                </button>

                <button
                    onClick={onSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
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
                    <LogOut className="w-[18px] h-[18px]" />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
}
