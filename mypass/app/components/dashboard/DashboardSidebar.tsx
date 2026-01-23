// app/components/dashboard/DashboardSidebar.tsx
'use client';

import React from 'react';
import {
    KeyRound,
    Shield,
    Sparkles,
    Settings,
    LogOut,
    LayoutGrid,
    Star
} from 'lucide-react';
import { TagFilter } from './TagSelector';

interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    count?: number;
    onClick?: () => void;
}

interface DashboardSidebarProps {
    activeView: string;
    onViewChange: (view: string) => void;
    onSettingsClick: () => void;
    onSignOut: () => void;
    onClose: () => void;
    stats: {
        total: number;
        secure: number;
        memorable: number;
        favorites: number;
    };
    userEmail?: string;
    // Tag filter props
    selectedTagFilter: string | null;
    onTagFilterChange: (tag: string | null) => void;
    allTags: string[];
}

export function DashboardSidebar({
    activeView,
    onViewChange,
    onSettingsClick,
    onSignOut,
    onClose,
    stats,
    userEmail,
    selectedTagFilter,
    onTagFilterChange,
    allTags
}: DashboardSidebarProps) {
    const mainNavItems: NavItem[] = [
        { id: 'all', label: 'All Passwords', icon: LayoutGrid, count: stats.total },
        { id: 'favorites', label: 'Favorites', icon: Star, count: stats.favorites },
        { id: 'secure', label: 'Secure', icon: Shield, count: stats.secure },
        { id: 'memorable', label: 'Memorable', icon: Sparkles, count: stats.memorable },
    ];

    return (
        <aside
            className="w-64 flex flex-col border-r h-full"
            style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)'
            }}
        >
            {/* Logo - Click to go back to homepage */}
            <div className="p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <button
                    onClick={onClose}
                    className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity"
                    title="Back to Generator"
                >
                    <div
                        className="flex items-center justify-center w-10 h-10 rounded-xl"
                        style={{
                            background: 'linear-gradient(135deg, var(--color-cyan-400), var(--color-cyan-600))',
                        }}
                    >
                        <KeyRound className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                            Password Vault
                        </h1>
                        <p className="text-xs truncate max-w-[140px]" style={{ color: 'var(--text-muted)' }}>
                            {userEmail}
                        </p>
                    </div>
                </button>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
                <div>
                    <div className="text-xs font-medium uppercase tracking-wider mb-3 px-3"
                        style={{ color: 'var(--text-muted)' }}>
                        Vault
                    </div>

                    <div className="space-y-1">
                        {mainNavItems.map((item) => {
                            const isActive = activeView === item.id && !selectedTagFilter;
                            const Icon = item.icon;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        onViewChange(item.id);
                                        onTagFilterChange(null); // Clear tag filter when switching views
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'scale-[1.02]' : 'hover:bg-white/5'
                                        }`}
                                    style={{
                                        background: isActive
                                            ? 'linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-500))'
                                            : 'transparent',
                                        color: isActive ? 'white' : 'var(--text-secondary)',
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className="w-4 h-4" />
                                        <span>{item.label}</span>
                                    </div>
                                    {item.count !== undefined && (
                                        <span
                                            className="text-xs px-2 py-0.5 rounded-full"
                                            style={{
                                                background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-tertiary)',
                                                color: isActive ? 'white' : 'var(--text-muted)',
                                            }}
                                        >
                                            {item.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tag Categories Filter */}
                {allTags.length > 0 && (
                    <div className="pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                        <TagFilter
                            selectedTag={selectedTagFilter}
                            onSelect={onTagFilterChange}
                            tags={allTags}
                        />
                    </div>
                )}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t space-y-1" style={{ borderColor: 'var(--border-color)' }}>
                <button
                    onClick={onSettingsClick}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                </button>
                <button
                    onClick={onSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-red-500/10"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
}
