// app/components/dashboard/ProfileCard.tsx
'use client';

import React from 'react';
import { KeyRound, Shield, Sparkles, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ProfileCardProps } from './types';

export function ProfileCard({ profile, onGenerate, onEdit, onDelete }: ProfileCardProps) {
    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Unknown';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return format(date, 'MMM d, yyyy');
        } catch {
            return 'Unknown';
        }
    };

    return (
        <div
            className="rounded-xl p-4 transition-all hover:scale-[1.02] cursor-pointer group"
            style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
            }}
        >
            {/* Card Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                            background: profile.algorithm === 'pbkdf2'
                                ? 'linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-500))'
                                : 'linear-gradient(135deg, #8b5cf6, #a855f7)'
                        }}
                    >
                        {profile.algorithm === 'pbkdf2' ? (
                            <Shield className="w-5 h-5 text-white" />
                        ) : (
                            <Sparkles className="w-5 h-5 text-white" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {profile.site}
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            {profile.login}
                        </p>
                    </div>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(profile);
                    }}
                    className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <Trash2 className="w-4 h-4 text-red-500" />
                </button>
            </div>

            {/* Card Details */}
            <div className="space-y-2 text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex justify-between">
                    <span>Type</span>
                    <span className="font-medium">
                        {profile.algorithm === 'pbkdf2' ? 'Secure' : 'Memorable'}
                    </span>
                </div>
                {profile.algorithm === 'pbkdf2' && (
                    <>
                        <div className="flex justify-between">
                            <span>Length</span>
                            <span className="font-medium">{profile.options.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Counter</span>
                            <span className="font-medium">{profile.options.counter}</span>
                        </div>
                    </>
                )}
                <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Updated
                    </span>
                    <span className="font-medium">{formatDate(profile.updatedAt)}</span>
                </div>
            </div>

            {/* Card Actions */}
            <div className="flex gap-2">
                <button
                    onClick={() => onGenerate(profile)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium text-sm transition-all"
                    style={{
                        background: 'linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-500))',
                        color: 'white',
                    }}
                >
                    <KeyRound className="w-4 h-4" />
                    Generate
                </button>
                <button
                    onClick={() => onEdit(profile)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                    }}
                >
                    Edit
                </button>
            </div>
        </div>
    );
}
