// app/components/dashboard/ProfileList.tsx
'use client';

import React, { useState } from 'react';
import { KeyRound, RefreshCw, ArrowUpDown, Check } from 'lucide-react';
import { PasswordProfile, ProfileService } from '../../services/ProfileService';
import { ProfileRow } from './ProfileRow';

type SortOption = 'recent' | 'name' | 'type' | 'favorites';

interface ProfileListProps {
    profiles: PasswordProfile[];
    loading: boolean;
    isEmpty: boolean;
    onGenerate: (profile: PasswordProfile) => void;
    onEdit: (profile: PasswordProfile) => void;
    onDelete: (profile: PasswordProfile) => void;
    onProfilesChange?: () => void;
}

export function ProfileList({
    profiles,
    loading,
    isEmpty,
    onGenerate,
    onEdit,
    onDelete,
    onProfilesChange
}: ProfileListProps) {
    const [sortBy, setSortBy] = useState<SortOption>('recent');
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [copiedLogin, setCopiedLogin] = useState<string | null>(null);
    const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);

    // Sort profiles - favorites always come first
    const sortedProfiles = [...profiles].sort((a, b) => {
        // Favorites first
        if (sortBy === 'favorites') {
            if (a.favorite && !b.favorite) return -1;
            if (!a.favorite && b.favorite) return 1;
        }

        switch (sortBy) {
            case 'name':
                return a.site.toLowerCase().localeCompare(b.site.toLowerCase());
            case 'type':
                return a.algorithm.localeCompare(b.algorithm);
            case 'favorites':
                // After favorites sorting, sort by recent
                const aTime1 = a.updatedAt?.toDate?.() || new Date(0);
                const bTime1 = b.updatedAt?.toDate?.() || new Date(0);
                return bTime1.getTime() - aTime1.getTime();
            case 'recent':
            default:
                const aTime = a.updatedAt?.toDate?.() || new Date(0);
                const bTime = b.updatedAt?.toDate?.() || new Date(0);
                return bTime.getTime() - aTime.getTime();
        }
    });

    const handleCopyLogin = async (login: string) => {
        await navigator.clipboard.writeText(login);
        setCopiedLogin(login);
        setTimeout(() => setCopiedLogin(null), 2000);
    };

    const handleToggleFavorite = async (profile: PasswordProfile) => {
        if (!profile.id || togglingFavorite) return;

        setTogglingFavorite(profile.id);
        try {
            await ProfileService.toggleFavorite(profile.id, !profile.favorite);
            onProfilesChange?.();
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        } finally {
            setTogglingFavorite(null);
        }
    };

    const sortOptions: { id: SortOption; label: string }[] = [
        { id: 'recent', label: 'Most Recent' },
        { id: 'favorites', label: 'Favorites First' },
        { id: 'name', label: 'Name (A-Z)' },
        { id: 'type', label: 'Type' },
    ];

    const favoriteCount = profiles.filter(p => p.favorite).length;

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
                        <p className="text-sm mt-1">Use Quick Add from the sidebar to create your first password!</p>
                    </>
                ) : (
                    <p>No profiles match your search.</p>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Header with sort */}
            <div className="flex items-center justify-between px-1">
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {profiles.length} {profiles.length === 1 ? 'password' : 'passwords'}
                    {favoriteCount > 0 && ` • ${favoriteCount} favorite${favoriteCount > 1 ? 's' : ''}`}
                </span>

                {/* Sort dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowSortMenu(!showSortMenu)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/5"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <ArrowUpDown className="w-4 h-4" />
                        Sort: {sortOptions.find(o => o.id === sortBy)?.label}
                    </button>

                    {showSortMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowSortMenu(false)}
                            />
                            <div
                                className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-20 min-w-[170px]"
                                style={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)'
                                }}
                            >
                                {sortOptions.map(option => (
                                    <button
                                        key={option.id}
                                        onClick={() => {
                                            setSortBy(option.id);
                                            setShowSortMenu(false);
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-white/5 transition-colors"
                                        style={{ color: sortBy === option.id ? 'var(--color-cyan-500)' : 'var(--text-secondary)' }}
                                    >
                                        {option.label}
                                        {sortBy === option.id && <Check className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Copied notification */}
            {copiedLogin && (
                <div
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium z-50"
                    style={{
                        background: 'var(--color-cyan-500)',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}
                >
                    Copied: {copiedLogin}
                </div>
            )}

            {/* Profile rows */}
            <div className="space-y-2">
                {sortedProfiles.map((profile) => (
                    <ProfileRow
                        key={profile.id}
                        profile={profile}
                        onGenerate={onGenerate}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onCopyLogin={handleCopyLogin}
                        onToggleFavorite={handleToggleFavorite}
                    />
                ))}
            </div>
        </div>
    );
}
