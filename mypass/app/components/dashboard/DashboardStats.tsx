// app/components/dashboard/DashboardStats.tsx
'use client';

import React from 'react';

interface DashboardStatsProps {
    total: number;
    secure: number;
    memorable: number;
}

export function DashboardStats({ total, secure, memorable }: DashboardStatsProps) {
    return (
        <div
            className="grid grid-cols-3 gap-4 px-6 py-4 border-b"
            style={{ borderColor: 'var(--border-color)' }}
        >
            <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--color-cyan-500)' }}>
                    {total}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Profiles</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--color-cyan-500)' }}>
                    {secure}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Secure</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--color-cyan-500)' }}>
                    {memorable}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Memorable</div>
            </div>
        </div>
    );
}
