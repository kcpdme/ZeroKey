// Dashboard V2 Header - Alt Design style
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
    all: 'Vault',
    favorites: 'Favorites',
    secure: 'Secure Passwords',
    memorable: 'Memorable Passwords',
};

const viewDescriptions: Record<ViewType, string> = {
    all: 'Ingredients only — never the passwords.',
    favorites: 'Your starred recipes.',
    secure: 'PBKDF2 encrypted passwords.',
    memorable: 'Easy-to-say passwords.',
};

export function Header({
    activeView,
    profileCount,
    onQuickSearch,
    onQuickAdd,
    onExportImport,
}: HeaderProps) {
    return (
        <header className="dashboard-header px-6 py-4">
            <div className="flex items-center justify-between gap-4">
                {/* Title Section */}
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold tracking-tight dashboard-title sm:text-3xl">
                        {viewTitles[activeView]}
                        <span className="ml-2 text-base font-normal dashboard-subtitle">
                            · {profileCount}
                        </span>
                    </h1>
                    <p className="mt-1 text-sm dashboard-subtitle">
                        {viewDescriptions[activeView]}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {/* Search Bar */}
                    <button
                        onClick={onQuickSearch}
                        className="dashboard-search-btn flex items-center gap-2 px-3 py-2 rounded-xl min-w-[180px] lg:min-w-[220px] transition-colors"
                    >
                        <Search className="h-4 w-4 dashboard-search-icon" aria-hidden />
                        <span className="text-sm flex-1 text-left dashboard-search-text">
                            Search sites, logins or tags
                        </span>
                        <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs dashboard-kbd">
                            <Command className="w-3 h-3" />K
                        </kbd>
                    </button>

                    {/* Export/Import */}
                    <button
                        onClick={onExportImport}
                        className="dashboard-action-btn flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
                        title="Backup & Restore"
                    >
                        <Download className="w-4 h-4" />
                        <span className="text-sm hidden lg:block">Backup</span>
                    </button>

                    {/* Add Password */}
                    <button
                        onClick={onQuickAdd}
                        className="dashboard-btn-primary flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-150"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:block">Add Password</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
