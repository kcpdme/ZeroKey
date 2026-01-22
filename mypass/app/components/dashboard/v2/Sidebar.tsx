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
    ChevronLeft,
    User
} from 'lucide-react';
import { ViewType, DashboardStats } from './types';

interface SidebarProps {
    activeView: ViewType;
    onViewChange: (view: ViewType) => void;
    onSettingsClick: () => void;
    onSignOut: () => void;
    onClose: () => void;
    stats: DashboardStats;
    userEmail?: string;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
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
    { id: 'favorites', label: 'Favorites', icon: Star, countKey: 'favorites', accentColor: '#eab308' },
    { id: 'secure', label: 'Secure', icon: Shield, countKey: 'secure', accentColor: 'var(--color-cyan-500)' },
    { id: 'memorable', label: 'Memorable', icon: Sparkles, countKey: 'memorable', accentColor: '#a855f7' },
];

export function Sidebar({
    activeView,
    onViewChange,
    onSettingsClick,
    onSignOut,
    onClose,
    stats,
    userEmail,
    isCollapsed = false,
    onToggleCollapse
}: SidebarProps) {
    return (
        <aside
            className={`
                hidden md:flex flex-col h-full
                transition-all duration-300 ease-in-out
                ${isCollapsed ? 'w-20' : 'w-64'}
            `}
            style={{
                background: 'linear-gradient(180deg, #0d1424 0%, #0f172a 100%)',
                borderRight: '1px solid rgba(148, 163, 184, 0.1)',
            }}
        >
            {/* Gradient accent border */}
            <div
                className="absolute right-0 top-0 bottom-0 w-[1px]"
                style={{
                    background: 'linear-gradient(180deg, var(--color-cyan-500) 0%, #a855f7 50%, var(--color-cyan-500) 100%)',
                    opacity: 0.3,
                }}
            />

            {/* Logo Section */}
            <div className="p-4 border-b border-white/5">
                <button
                    onClick={onClose}
                    className="flex items-center gap-3 w-full text-left hover:opacity-90 transition-opacity group"
                    title="Back to Generator"
                >
                    <div
                        className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-transform group-hover:scale-105"
                        style={{
                            background: 'linear-gradient(135deg, var(--color-cyan-500), #6366f1)',
                            boxShadow: '0 4px 20px rgba(6, 182, 212, 0.3)',
                        }}
                    >
                        <KeyRound className="w-5 h-5 text-white" />
                    </div>
                    {!isCollapsed && (
                        <div className="min-w-0">
                            <h1 className="font-bold text-white">MyPass</h1>
                            <p className="text-xs text-slate-400">Password Vault</p>
                        </div>
                    )}
                </button>
            </div>

            {/* User Section */}
            <div className={`px-4 py-4 border-b border-white/5 ${isCollapsed ? 'flex justify-center' : ''}`}>
                {isCollapsed ? (
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--bg-tertiary)' }}
                        title={userEmail}
                    >
                        <User className="w-5 h-5 text-slate-400" />
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                        >
                            <span className="text-white font-semibold">
                                {userEmail?.charAt(0).toUpperCase() || 'U'}
                            </span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">
                                {userEmail?.split('@')[0] || 'User'}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                                {userEmail}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {!isCollapsed && (
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-3">
                        Vault
                    </div>
                )}

                {navItems.map((item) => {
                    const isActive = activeView === item.id;
                    const Icon = item.icon;
                    const count = stats[item.countKey];

                    return (
                        <button
                            key={item.id}
                            onClick={() => onViewChange(item.id)}
                            className={`
                                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                                transition-all duration-200 group relative
                                ${isActive ? '' : 'hover:bg-white/5'}
                                ${isCollapsed ? 'justify-center' : ''}
                            `}
                            style={{
                                background: isActive
                                    ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(99, 102, 241, 0.1))'
                                    : 'transparent',
                                color: isActive ? 'var(--color-cyan-400)' : 'var(--text-secondary)',
                            }}
                            title={isCollapsed ? item.label : undefined}
                        >
                            {/* Active indicator */}
                            {isActive && (
                                <div
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                                    style={{
                                        background: 'linear-gradient(180deg, var(--color-cyan-400), #6366f1)',
                                    }}
                                />
                            )}

                            <Icon
                                className={`w-5 h-5 shrink-0 ${isActive ? '' : 'group-hover:text-white'}`}
                                style={{ color: isActive ? item.accentColor || 'var(--color-cyan-400)' : undefined }}
                            />

                            {!isCollapsed && (
                                <>
                                    <span className={`flex-1 text-left ${isActive ? 'text-white' : ''}`}>
                                        {item.label}
                                    </span>
                                    <span
                                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                                        style={{
                                            background: isActive
                                                ? 'rgba(255, 255, 255, 0.1)'
                                                : 'var(--bg-tertiary)',
                                            color: isActive
                                                ? 'white'
                                                : 'var(--text-muted)',
                                        }}
                                    >
                                        {count}
                                    </span>
                                </>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="p-3 border-t border-white/5 space-y-1">
                <button
                    onClick={onSettingsClick}
                    className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                        transition-all hover:bg-white/5 text-slate-400 hover:text-white
                        ${isCollapsed ? 'justify-center' : ''}
                    `}
                    title={isCollapsed ? 'Settings' : undefined}
                >
                    <Settings className="w-5 h-5" />
                    {!isCollapsed && <span>Settings</span>}
                </button>

                <button
                    onClick={onSignOut}
                    className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                        transition-all hover:bg-red-500/10 text-slate-500 hover:text-red-400
                        ${isCollapsed ? 'justify-center' : ''}
                    `}
                    title={isCollapsed ? 'Sign Out' : undefined}
                >
                    <LogOut className="w-5 h-5" />
                    {!isCollapsed && <span>Sign Out</span>}
                </button>
            </div>

            {/* Collapse Toggle */}
            {onToggleCollapse && (
                <button
                    onClick={onToggleCollapse}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors z-10"
                >
                    <ChevronLeft
                        className={`w-4 h-4 text-slate-400 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                    />
                </button>
            )}
        </aside>
    );
}
