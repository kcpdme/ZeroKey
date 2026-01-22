// app/components/dashboard/DuplicateWarning.tsx
'use client';

import React from 'react';
import { AlertTriangle, X, ArrowRight } from 'lucide-react';
import { DuplicateCheckResult } from '../../lib/duplicateDetection';
import { PasswordProfile } from '../../services/ProfileService';

interface DuplicateWarningProps {
    result: DuplicateCheckResult;
    onDismiss: () => void;
    onGoToExisting?: (profile: PasswordProfile) => void;
    onContinueAnyway?: () => void;
}

export function DuplicateWarning({
    result,
    onDismiss,
    onGoToExisting,
    onContinueAnyway,
}: DuplicateWarningProps) {
    if (!result.isDuplicate && !result.isSimilar) return null;

    const isExact = result.isDuplicate;

    return (
        <div
            className="relative rounded-xl p-4 animate-fade-in"
            style={{
                background: isExact ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                border: `1px solid ${isExact ? 'rgba(239, 68, 68, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
            }}
        >
            {/* Close button */}
            <button
                onClick={onDismiss}
                className="absolute top-2 right-2 p-1 rounded hover:bg-white/10"
                style={{ color: 'var(--text-muted)' }}
            >
                <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="flex items-start gap-3">
                <div
                    className="p-2 rounded-lg shrink-0"
                    style={{
                        background: isExact ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                    }}
                >
                    <AlertTriangle
                        className="w-5 h-5"
                        style={{ color: isExact ? '#ef4444' : '#eab308' }}
                    />
                </div>

                <div className="flex-1 min-w-0">
                    <h4
                        className="font-medium text-sm"
                        style={{ color: isExact ? '#ef4444' : '#eab308' }}
                    >
                        {isExact ? 'Duplicate Detected' : 'Similar Entry Found'}
                    </h4>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {result.reason}
                    </p>

                    {/* Existing profile preview */}
                    {result.matchingProfile && (
                        <div
                            className="mt-3 p-2 rounded-lg text-xs"
                            style={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <span style={{ color: 'var(--text-primary)' }}>
                                        {result.matchingProfile.site}
                                    </span>
                                    <span className="mx-2" style={{ color: 'var(--text-muted)' }}>•</span>
                                    <span style={{ color: 'var(--text-muted)' }}>
                                        {result.matchingProfile.login}
                                    </span>
                                </div>
                                <span
                                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                    style={{
                                        background: result.matchingProfile.algorithm === 'pbkdf2'
                                            ? 'rgba(6, 182, 212, 0.1)'
                                            : 'rgba(139, 92, 246, 0.1)',
                                        color: result.matchingProfile.algorithm === 'pbkdf2'
                                            ? 'var(--color-cyan-500)' : '#a855f7',
                                    }}
                                >
                                    {result.matchingProfile.algorithm === 'pbkdf2' ? 'Secure' : 'Memorable'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                        {result.matchingProfile && onGoToExisting && (
                            <button
                                onClick={() => onGoToExisting(result.matchingProfile!)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
                                style={{
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                }}
                            >
                                Use Existing
                                <ArrowRight className="w-3 h-3" />
                            </button>
                        )}
                        {!isExact && onContinueAnyway && (
                            <button
                                onClick={onContinueAnyway}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                Create Anyway
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
