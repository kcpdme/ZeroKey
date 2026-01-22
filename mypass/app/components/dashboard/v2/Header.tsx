// Dashboard V2 Header - Proton Pass style
'use client';

import React from 'react';
import { Search, Plus, Download, Command } from 'lucide-react';
import { ViewType } from './types';

interface HeaderProps {
    activeView: ViewType;
    profileCount: number;
    onQuickSearch: () => void;
    onQuickAdd: () => void;
    onExportImport: () => void;
}

const viewTitles: Record<ViewType, string> = {
    all: 'All Items',
    favorites: 'Favorites',
    secure: 'Secure Passwords',
    memorable: 'Memorable Passwords',
};

const viewDescriptions: Record<ViewType, string> = {
    all: 'All your saved passwords',
    favorites: 'Your starred passwords',
    secure: 'PBKDF2 encrypted passwords',
    memorable: 'Human-readable passwords',
};

export function Header({
    activeView,
    profileCount,
    onQuickSearch,
    onQuickAdd,
    onExportImport,
}: HeaderProps) {
    return (
        <header
            className="px-6 py-4 border-b backdrop-blur-sm"
            style={{
                background: 'var(--dashboard-header-bg)',
                borderColor: 'var(--dashboard-header-border)',
            }}
        >
            <div className="flex items-center justify-between gap-4">
                {/* Title Section */}
                <div className="min-w-0">
                    <h1
                        className="text-xl font-bold"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        {viewTitles[activeView]}
                    </h1>
                    <p
                        className="text-sm mt-0.5"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        {profileCount} {profileCount === 1 ? 'password' : 'passwords'}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {/* Search Button */}
                    <button
                        onClick={onQuickSearch}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 group"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--card-border)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--card-bg-hover)';
                            e.currentTarget.style.borderColor = 'var(--card-border-hover)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--card-bg)';
                            e.currentTarget.style.borderColor = 'var(--card-border)';
                        }}
                    >
                        <Search
                            className="w-4 h-4 transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                        />
                        <span
                            className="text-sm hidden lg:block"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            Search...
                        </span>
                        <kbd
                            className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs"
                            style={{
                                background: 'var(--sidebar-count-bg)',
                                color: 'var(--text-muted)',
                            }}
                        >
                            <Command className="w-3 h-3" />K
                        </kbd>
                    </button>

                    {/* Import/Export Button */}
                    <button
                        onClick={onExportImport}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--card-border)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--card-bg-hover)';
                            e.currentTarget.style.borderColor = 'var(--card-border-hover)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--card-bg)';
                            e.currentTarget.style.borderColor = 'var(--card-border)';
                        }}
                        title="Backup & Restore"
                    >
                        <Download className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        <span
                            className="text-sm hidden lg:block"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            Backup
                        </span>
                    </button>

                    {/* Add Password Button */}
                    <button
                        onClick={onQuickAdd}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                            background: 'var(--btn-primary-gradient)',
                            color: 'white',
                            boxShadow: 'var(--btn-primary-shadow)',
                        }}
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:block">Add Password</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
