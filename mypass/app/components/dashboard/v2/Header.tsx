// Dashboard V2 Header - Clean, action-focused header
'use client';

import React from 'react';
import { Search, Plus, Download, Upload, Command } from 'lucide-react';
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
        <header className="px-6 py-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between gap-4">
                {/* Title Section */}
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-white">
                        {viewTitles[activeView]}
                    </h1>
                    <p className="text-sm text-slate-400 mt-0.5">
                        {profileCount} {profileCount === 1 ? 'password' : 'passwords'} • {viewDescriptions[activeView]}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {/* Search Button */}
                    <button
                        onClick={onQuickSearch}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:bg-white/5 group"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <Search className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                        <span className="text-sm text-slate-400 group-hover:text-slate-300 hidden lg:block">
                            Search passwords...
                        </span>
                        <kbd
                            className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs text-slate-500"
                            style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                        >
                            <Command className="w-3 h-3" />K
                        </kbd>
                    </button>

                    {/* Import/Export Button */}
                    <button
                        onClick={onExportImport}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:bg-white/5"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                        title="Backup & Restore"
                    >
                        <Download className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-400 hidden lg:block">Backup</span>
                    </button>

                    {/* Add Password Button */}
                    <button
                        onClick={onQuickAdd}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all hover:scale-105 hover:shadow-lg"
                        style={{
                            background: 'linear-gradient(135deg, var(--color-cyan-500), #6366f1)',
                            color: 'white',
                            boxShadow: '0 4px 20px rgba(6, 182, 212, 0.25)',
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
