// Dashboard V2 PasswordCard - Alt Design RecipeRow style
'use client';

import React, { useState } from 'react';
import {
    KeyRound,
    Shield,
    Sparkles,
    Copy,
    Edit,
    Trash2,
    Star,
    MoreVertical,
    Clock,
    Check,
    History,
    WavesIcon
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PasswordProfile } from '../../../services/ProfileService';
import { getFaviconUrl } from '../../../lib/favicon';
import { TagChips } from '../TagSelector';
import { ExpiryBadge } from '../ExpiryBadge';

interface PasswordCardProps {
    profile: PasswordProfile;
    onGenerate: (profile: PasswordProfile) => void;
    onEdit: (profile: PasswordProfile) => void;
    onDelete: (profile: PasswordProfile) => void;
    onCopyLogin: (login: string) => void;
    onToggleFavorite: (profile: PasswordProfile) => void;
    onViewHistory?: (profile: PasswordProfile) => void;
    isSelected?: boolean;
    onToggleSelect?: (profile: PasswordProfile) => void;
    showCheckbox?: boolean;
}

/* Deterministic color from site name (like alt design SiteAvatar) */
function siteColor(site: string): string {
    const PALETTE = [
        '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981',
        '#ec4899', '#3b82f6', '#f97316', '#14b8a6', '#6366f1',
    ];
    let hash = 0;
    for (let i = 0; i < site.length; i++) {
        hash = site.charCodeAt(i) + ((hash << 5) - hash);
    }
    return PALETTE[Math.abs(hash) % PALETTE.length];
}

function siteInitials(site: string): string {
    const cleaned = site.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
    const parts = cleaned.split('.');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[0][1]).toUpperCase();
    }
    return cleaned.slice(0, 2).toUpperCase();
}

export function PasswordCard({
    profile,
    onGenerate,
    onEdit,
    onDelete,
    onCopyLogin,
    onToggleFavorite,
    onViewHistory,
    isSelected = false,
    onToggleSelect,
    showCheckbox = false,
}: PasswordCardProps) {
    const [faviconError, setFaviconError] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const faviconUrl = getFaviconUrl(profile.site, 32);
    const color = siteColor(profile.site);
    const isSecure = profile.algorithm === 'pbkdf2';

    const formatLastUsed = (timestamp: any) => {
        if (!timestamp) return 'Never used';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return formatDistanceToNow(date, { addSuffix: true });
        } catch {
            return 'Never used';
        }
    };

    const handleCopyLogin = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(profile.login);
        setCopiedField('login');
        onCopyLogin(profile.login);
        setTimeout(() => setCopiedField(null), 2000);
    };

    return (
        <div
            className={`
                group flex items-center gap-3 rounded-2xl px-3 transition-colors
                recipe-row
                ${isSelected ? 'recipe-row--selected' : ''}
                ${showCheckbox ? 'py-2.5' : 'py-3'}
            `}
            onClick={() => showCheckbox ? onToggleSelect?.(profile) : onGenerate(profile)}
        >
            {/* Checkbox for bulk select */}
            {showCheckbox && (
                <div className="relative shrink-0">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect?.(profile)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 rounded-md cursor-pointer"
                        style={{ accentColor: 'var(--c-accent, var(--color-cyan-500))' }}
                    />
                </div>
            )}

            {/* Clickable body — site info */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onGenerate(profile);
                }}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
                {/* Site Avatar */}
                <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold tracking-wide"
                    style={{ backgroundColor: `${color}1f`, color }}
                >
                    {!faviconError ? (
                        <img
                            src={faviconUrl}
                            alt=""
                            className="w-5 h-5"
                            onError={() => setFaviconError(true)}
                        />
                    ) : (
                        siteInitials(profile.site)
                    )}
                </span>

                {/* Site + Login text */}
                <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium recipe-ink">
                            {profile.site}
                        </span>
                        {profile.algorithm === 'memorizable' && (
                            <WavesIcon className="h-3.5 w-3.5 shrink-0 recipe-muted" aria-label="Memorizable" />
                        )}
                    </span>
                    <span className="block truncate text-xs recipe-muted">
                        {profile.login}
                    </span>
                </span>

                {/* Last used – desktop */}
                <span className="hidden shrink-0 text-xs recipe-muted sm:block">
                    {formatLastUsed(profile.lastUsedAt || profile.updatedAt)}
                </span>
            </button>

            {/* Tags – desktop */}
            <div className="hidden lg:flex items-center gap-1.5 shrink-0">
                {profile.tags && profile.tags.length > 0 && (
                    <TagChips tags={profile.tags} size="sm" maxVisible={2} />
                )}
            </div>

            {/* Version / length badges – secure only, desktop */}
            {isSecure && (
                <div className="hidden lg:flex items-center gap-1.5 shrink-0">
                    <span className="recipe-badge" title={`Version ${profile.options.counter}`}>
                        v{profile.options.counter}
                    </span>
                    <span className="recipe-badge" title={`Length: ${profile.options.length}`}>
                        L{profile.options.length}
                    </span>
                    <ExpiryBadge passwordPolicy={profile.passwordPolicy} size="sm" />
                </div>
            )}

            {/* Favorite toggle */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(profile);
                }}
                aria-label={profile.favorite ? 'Remove from favorites' : 'Add to favorites'}
                className={`
                    hidden md:flex rounded-lg p-1.5 transition-colors
                    ${profile.favorite ? 'recipe-star-active' : 'recipe-star-idle'}
                `}
            >
                <Star
                    className="h-4 w-4"
                    fill={profile.favorite ? 'currentColor' : 'none'}
                />
            </button>

            {/* Desktop hover actions */}
            <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                    onClick={(e) => { e.stopPropagation(); onGenerate(profile); }}
                    className="recipe-action-btn-primary rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
                >
                    <KeyRound className="w-4 h-4 inline mr-1" />
                    <span className="hidden lg:inline">Generate</span>
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(profile); }}
                    className="recipe-action-btn rounded-lg p-1.5 transition-colors"
                    title="Edit"
                >
                    <Edit className="w-4 h-4" />
                </button>

                {onViewHistory && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onViewHistory(profile); }}
                        className="recipe-action-btn rounded-lg p-1.5 transition-colors"
                        title="Version History"
                    >
                        <History className="w-4 h-4" />
                    </button>
                )}

                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(profile); }}
                    className="recipe-action-btn-danger rounded-lg p-1.5 transition-colors"
                    title="Delete"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-1.5 shrink-0">
                {/* Favorite badge on mobile */}
                {profile.favorite && (
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                )}

                {/* Generate */}
                <button
                    onClick={(e) => { e.stopPropagation(); onGenerate(profile); }}
                    className="recipe-action-btn-primary w-8 h-8 flex items-center justify-center rounded-lg"
                >
                    <KeyRound className="w-4 h-4" />
                </button>

                {/* More menu */}
                <div className="relative shrink-0">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMobileMenu(!showMobileMenu);
                        }}
                        className="recipe-action-btn w-8 h-8 flex items-center justify-center rounded-lg"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>

                    {showMobileMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-50 bg-black/40"
                                style={{ backdropFilter: 'blur(2px)' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMobileMenu(false);
                                }}
                            />
                            <div
                                className="fixed left-3 right-3 bottom-20 z-50 p-4 rounded-2xl shadow-2xl recipe-mobile-sheet"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="text-center text-sm font-semibold truncate mb-4 recipe-ink">
                                    {profile.site}
                                </div>
                                <div className="flex justify-center gap-6">
                                    {/* Favorite */}
                                    <button
                                        onClick={() => { onToggleFavorite(profile); setShowMobileMenu(false); }}
                                        className="flex flex-col items-center gap-1.5"
                                    >
                                        <div className="w-12 h-12 flex items-center justify-center rounded-xl recipe-mobile-action-bg">
                                            <Star
                                                className={`w-5 h-5 ${profile.favorite ? 'fill-yellow-400 text-yellow-400' : ''}`}
                                                style={{ color: profile.favorite ? undefined : 'var(--c-muted, var(--text-secondary))' }}
                                            />
                                        </div>
                                        <span className="text-[10px] recipe-muted">
                                            {profile.favorite ? 'Unfav' : 'Favorite'}
                                        </span>
                                    </button>

                                    {/* Edit */}
                                    <button
                                        onClick={() => { onEdit(profile); setShowMobileMenu(false); }}
                                        className="flex flex-col items-center gap-1.5"
                                    >
                                        <div className="w-12 h-12 flex items-center justify-center rounded-xl recipe-mobile-action-bg">
                                            <Edit className="w-5 h-5" style={{ color: 'var(--c-muted, var(--text-secondary))' }} />
                                        </div>
                                        <span className="text-[10px] recipe-muted">Edit</span>
                                    </button>

                                    {/* History */}
                                    {onViewHistory && (
                                        <button
                                            onClick={() => { onViewHistory(profile); setShowMobileMenu(false); }}
                                            className="flex flex-col items-center gap-1.5"
                                        >
                                            <div className="w-12 h-12 flex items-center justify-center rounded-xl" style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
                                                <History className="w-5 h-5" style={{ color: 'var(--c-accent, var(--sidebar-accent-cyan))' }} />
                                            </div>
                                            <span className="text-[10px] recipe-muted">History</span>
                                        </button>
                                    )}

                                    {/* Delete */}
                                    <button
                                        onClick={() => { onDelete(profile); setShowMobileMenu(false); }}
                                        className="flex flex-col items-center gap-1.5"
                                    >
                                        <div className="w-12 h-12 flex items-center justify-center rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                                            <Trash2 className="w-5 h-5 text-red-500" />
                                        </div>
                                        <span className="text-[10px] text-red-500">Delete</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
