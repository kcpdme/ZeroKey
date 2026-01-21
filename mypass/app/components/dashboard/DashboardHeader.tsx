// app/components/dashboard/DashboardHeader.tsx
'use client';

import React from 'react';
import { KeyRound, Settings, LogOut, X } from 'lucide-react';

interface DashboardHeaderProps {
    email: string | undefined;
    onSettingsClick: () => void;
    onSignOut: () => void;
    onClose: () => void;
}

export function DashboardHeader({ email, onSettingsClick, onSignOut, onClose }: DashboardHeaderProps) {
    return (
        <header
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}
        >
            <div className="flex items-center gap-4">
                <div
                    className="flex items-center justify-center w-10 h-10 rounded-xl"
                    style={{
                        background: 'linear-gradient(135deg, var(--color-cyan-400), var(--color-cyan-600))',
                    }}
                >
                    <KeyRound className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        Password Vault
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {email}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={onSettingsClick}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    <Settings className="w-4 h-4" />
                    Settings
                </button>
                <button
                    onClick={onSignOut}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg transition-colors hover:bg-white/10"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
}
