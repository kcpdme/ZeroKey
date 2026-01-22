// Dashboard V2 PasswordList - Container for password cards with sorting
'use client';

import React, { useState, useMemo } from 'react';
import { KeyRound, RefreshCw, ArrowUpDown, Check, Trash2, X, Filter } from 'lucide-react';
import { PasswordProfile, ProfileService } from '../../../services/ProfileService';
import { PasswordCard } from './PasswordCard';
import { SortOption, SORT_OPTIONS } from './types';

interface PasswordListProps {
    profiles: PasswordProfile[];
    loading: boolean;
    isEmpty: boolean;
    onGenerate: (profile: PasswordProfile) => void;
    onEdit: (profile: PasswordProfile) => void;
    onDelete: (profile: PasswordProfile) => void;
    onProfilesChange?: () => void;
}

export function PasswordList({
    profiles,
    loading,
    isEmpty,
    onGenerate,
    onEdit,
    onDelete,
    onProfilesChange,
}: PasswordListProps) {
    const [sortBy, setSortBy] = useState<SortOption>('recent');
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [copiedLogin, setCopiedLogin] = useState<string | null>(null);
    const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkMode, setBulkMode] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);

    // Sort profiles
    const sortedProfiles = useMemo(() => {
        return [...profiles].sort((a, b) => {
            // Always show favorites first if that sort is selected
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
                case 'recent':
                default:
                    const aTime = a.updatedAt?.toDate?.() || new Date(0);
                    const bTime = b.updatedAt?.toDate?.() || new Date(0);
                    return bTime.getTime() - aTime.getTime();
            }
        });
    }, [profiles, sortBy]);

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

    const handleToggleSelect = (profile: PasswordProfile) => {
        if (!profile.id) return;
        const newSelected = new Set(selectedIds);
        if (newSelected.has(profile.id)) {
            newSelected.delete(profile.id);
        } else {
            newSelected.add(profile.id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === profiles.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(profiles.map(p => p.id!).filter(Boolean)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        setBulkDeleting(true);
        try {
            await ProfileService.bulkDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
            setBulkMode(false);
            onProfilesChange?.();
        } catch (error) {
            console.error('Bulk delete failed:', error);
        } finally {
            setBulkDeleting(false);
        }
    };

    const cancelBulkMode = () => {
        setBulkMode(false);
        setSelectedIds(new Set());
    };

    const favoriteCount = profiles.filter(p => p.favorite).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-40">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
            </div>
        );
    }

    if (profiles.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div
                    className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
                    style={{
                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(99, 102, 241, 0.1))',
                    }}
                >
                    <KeyRound className="w-10 h-10 text-slate-500" />
                </div>
                {isEmpty ? (
                    <>
                        <h3 className="text-lg font-semibold text-white mb-2">
                            No saved passwords yet
                        </h3>
                        <p className="text-slate-400 text-center max-w-[300px]">
                            Click the "Add Password" button to create your first secure password profile.
                        </p>
                    </>
                ) : (
                    <p className="text-slate-400">No passwords match your search.</p>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    {bulkMode ? (
                        <>
                            <input
                                type="checkbox"
                                checked={selectedIds.size === profiles.length && profiles.length > 0}
                                onChange={handleSelectAll}
                                className="w-4 h-4 rounded accent-cyan-500"
                            />
                            <span className="text-sm text-slate-400">
                                {selectedIds.size} selected
                            </span>
                        </>
                    ) : (
                        <span className="text-sm text-slate-400">
                            {profiles.length} {profiles.length === 1 ? 'password' : 'passwords'}
                            {favoriteCount > 0 && (
                                <span className="text-yellow-400"> • {favoriteCount} ★</span>
                            )}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {bulkMode ? (
                        <>
                            <button
                                onClick={handleBulkDelete}
                                disabled={selectedIds.size === 0 || bulkDeleting}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                                style={{
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    color: 'white',
                                }}
                            >
                                <Trash2 className="w-4 h-4" />
                                {bulkDeleting ? 'Deleting...' : `Delete (${selectedIds.size})`}
                            </button>
                            <button
                                onClick={cancelBulkMode}
                                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setBulkMode(true)}
                                className="px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/5 text-slate-400 hover:text-white"
                            >
                                Select
                            </button>

                            {/* Sort dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowSortMenu(!showSortMenu)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/5 text-slate-400 hover:text-white"
                                >
                                    <ArrowUpDown className="w-4 h-4" />
                                    <span className="hidden sm:inline">
                                        {SORT_OPTIONS.find(o => o.id === sortBy)?.label}
                                    </span>
                                </button>

                                {showSortMenu && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setShowSortMenu(false)}
                                        />
                                        <div
                                            className="absolute right-0 top-full mt-2 py-2 rounded-xl shadow-xl z-20 min-w-[180px]"
                                            style={{
                                                background: '#1e293b',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                            }}
                                        >
                                            {SORT_OPTIONS.map(option => (
                                                <button
                                                    key={option.id}
                                                    onClick={() => {
                                                        setSortBy(option.id);
                                                        setShowSortMenu(false);
                                                    }}
                                                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                                                    style={{
                                                        color: sortBy === option.id
                                                            ? 'var(--color-cyan-400)'
                                                            : '#94a3b8',
                                                    }}
                                                >
                                                    {option.label}
                                                    {sortBy === option.id && (
                                                        <Check className="w-4 h-4" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Toast notification */}
            {copiedLogin && (
                <div
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl text-sm font-medium z-50 flex items-center gap-2"
                    style={{
                        background: 'linear-gradient(135deg, var(--color-cyan-500), #6366f1)',
                        color: 'white',
                        boxShadow: '0 8px 32px rgba(6, 182, 212, 0.3)',
                    }}
                >
                    <Check className="w-4 h-4" />
                    Copied: {copiedLogin}
                </div>
            )}

            {/* Password Cards */}
            <div className="space-y-2">
                {sortedProfiles.map((profile) => (
                    <PasswordCard
                        key={profile.id}
                        profile={profile}
                        onGenerate={onGenerate}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onCopyLogin={handleCopyLogin}
                        onToggleFavorite={handleToggleFavorite}
                        showCheckbox={bulkMode}
                        isSelected={profile.id ? selectedIds.has(profile.id) : false}
                        onToggleSelect={handleToggleSelect}
                    />
                ))}
            </div>
        </div>
    );
}
