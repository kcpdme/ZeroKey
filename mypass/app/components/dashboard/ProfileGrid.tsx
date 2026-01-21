// app/components/dashboard/ProfileGrid.tsx
'use client';

import React from 'react';
import { KeyRound, RefreshCw } from 'lucide-react';
import { PasswordProfile } from '../../services/ProfileService';
import { ProfileCard } from './ProfileCard';

interface ProfileGridProps {
    profiles: PasswordProfile[];
    loading: boolean;
    isEmpty: boolean;
    onGenerate: (profile: PasswordProfile) => void;
    onEdit: (profile: PasswordProfile) => void;
    onDelete: (profile: PasswordProfile) => void;
}

export function ProfileGrid({
    profiles,
    loading,
    isEmpty,
    onGenerate,
    onEdit,
    onDelete
}: ProfileGridProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-40">
                <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--color-cyan-500)' }} />
            </div>
        );
    }

    if (profiles.length === 0) {
        return (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                {isEmpty ? (
                    <>
                        <KeyRound className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No saved profiles yet.</p>
                        <p className="text-sm mt-1">Use Quick Add above to create your first password!</p>
                    </>
                ) : (
                    <p>No profiles match your search.</p>
                )}
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => (
                <ProfileCard
                    key={profile.id}
                    profile={profile}
                    onGenerate={onGenerate}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
}
