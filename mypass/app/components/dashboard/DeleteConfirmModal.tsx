// app/components/dashboard/DeleteConfirmModal.tsx
'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { PasswordProfile } from '../../services/ProfileService';

interface DeleteConfirmModalProps {
    profile: PasswordProfile | null;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    isDeleting: boolean;
}

export function DeleteConfirmModal({ profile, onClose, onConfirm, isDeleting }: DeleteConfirmModalProps) {
    if (!profile) return null;

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div
                className="w-full max-w-sm rounded-2xl p-6 text-center"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
            >
                <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center bg-red-500/10">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                    Delete Profile?
                </h3>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                    This will permanently delete the profile for <strong>{profile.site}</strong>.
                    This action cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-lg font-medium"
                        style={{
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex-1 py-2 rounded-lg font-medium bg-red-500 text-white disabled:opacity-50"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}
