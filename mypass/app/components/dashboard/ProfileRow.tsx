// app/components/dashboard/ProfileRow.tsx
'use client';

import React, { useState } from 'react';
import { KeyRound, Shield, Sparkles, Trash2, Clock, Copy, Edit, Star, MoreVertical, ExternalLink } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { PasswordProfile } from '../../services/ProfileService';
import { getFaviconUrl } from '../../lib/favicon';

interface ProfileRowProps {
    profile: PasswordProfile;
    onGenerate: (profile: PasswordProfile) => void;
    onEdit: (profile: PasswordProfile) => void;
    onDelete: (profile: PasswordProfile) => void;
    onCopyLogin: (login: string) => void;
    onToggleFavorite: (profile: PasswordProfile) => void;
    isSelected?: boolean;
    onToggleSelect?: (profile: PasswordProfile) => void;
    showCheckbox?: boolean;
}

export function ProfileRow({
    profile,
    onGenerate,
    onEdit,
    onDelete,
    onCopyLogin,
    onToggleFavorite,
    isSelected = false,
    onToggleSelect,
    showCheckbox = false
}: ProfileRowProps) {
    const [faviconError, setFaviconError] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    const formatLastUsed = (timestamp: any) => {
        if (!timestamp) return 'Never';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return formatDistanceToNow(date, { addSuffix: true });
        } catch {
            return 'Never';
        }
    };

    const faviconUrl = getFaviconUrl(profile.site, 32);

    // Render algorithm icon as fallback
    const renderFallbackIcon = () => (
        <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
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
    );

    return (
        <div
            className={`flex items-center gap-3 md:gap-4 px-3 md:px-4 py-3 rounded-xl transition-all hover:bg-white/5 group ${isSelected ? 'ring-2 ring-cyan-500' : ''
                }`}
            style={{
                background: isSelected ? 'var(--color-cyan-500)/5' : 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
            }}
        >
            {/* Checkbox for bulk select */}
            {showCheckbox && (
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect?.(profile)}
                    className="w-4 h-4 rounded accent-cyan-500"
                />
            )}

            {/* Favorite Star - Hidden on mobile, visible on hover for desktop */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(profile);
                }}
                className={`hidden md:block p-1 rounded transition-all ${profile.favorite ? '' : 'opacity-0 group-hover:opacity-100'}`}
                title={profile.favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
                <Star
                    className={`w-4 h-4 transition-all ${profile.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`}
                />
            </button>

            {/* Favicon or Algorithm Icon */}
            <div className="relative shrink-0">
                {!faviconError ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
                        <img
                            src={faviconUrl}
                            alt=""
                            className="w-6 h-6"
                            onError={() => setFaviconError(true)}
                        />
                    </div>
                ) : (
                    renderFallbackIcon()
                )}
                {/* Favorite indicator for mobile */}
                {profile.favorite && (
                    <Star className="absolute -top-1 -right-1 w-3 h-3 fill-yellow-400 text-yellow-400 md:hidden" />
                )}
            </div>

            {/* Site & Login */}
            <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate text-sm md:text-base" style={{ color: 'var(--text-primary)' }}>
                    {profile.site}
                </h3>
                <div className="flex items-center gap-2">
                    <p className="text-xs md:text-sm truncate" style={{ color: 'var(--text-muted)' }}>
                        {profile.login}
                    </p>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCopyLogin(profile.login);
                        }}
                        className="hidden md:block opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-all"
                        title="Copy login"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <Copy className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Type Badge - Hidden on small mobile */}
            <div
                className="hidden sm:block px-2 py-1 rounded-lg text-xs font-medium shrink-0"
                style={{
                    background: profile.algorithm === 'pbkdf2' ? 'rgba(6, 182, 212, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                    color: profile.algorithm === 'pbkdf2' ? 'var(--color-cyan-500)' : '#a855f7',
                }}
            >
                {profile.algorithm === 'pbkdf2' ? 'Secure' : 'Memorable'}
            </div>

            {/* Details - Hidden on mobile */}
            {profile.algorithm === 'pbkdf2' && (
                <div className="hidden lg:flex items-center gap-4 text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>
                    <span>Len: {profile.options.length}</span>
                    <span>v{profile.options.counter}</span>
                </div>
            )}

            {/* Last Used - Hidden on mobile/tablet */}
            <div className="hidden xl:block text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatLastUsed(profile.lastUsedAt)}</span>
                </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-1 shrink-0">
                <button
                    onClick={() => onGenerate(profile)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                    style={{
                        background: 'linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-500))',
                        color: 'white',
                    }}
                >
                    <KeyRound className="w-4 h-4" />
                    <span className="hidden lg:inline">Generate</span>
                </button>

                <button
                    onClick={() => onEdit(profile)}
                    className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10"
                    style={{ color: 'var(--text-secondary)' }}
                    title="Edit"
                >
                    <Edit className="w-4 h-4" />
                </button>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(profile);
                    }}
                    className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10"
                    title="Delete"
                >
                    <Trash2 className="w-4 h-4 text-red-500" />
                </button>
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-1 shrink-0">
                {/* Quick Generate Button */}
                <button
                    onClick={() => onGenerate(profile)}
                    className="p-2 rounded-lg"
                    style={{
                        background: 'linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-500))',
                        color: 'white',
                    }}
                >
                    <KeyRound className="w-4 h-4" />
                </button>

                {/* More Menu */}
                <div className="relative">
                    <button
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        className="p-2 rounded-lg hover:bg-white/10"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>

                    {showMobileMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowMobileMenu(false)}
                            />
                            <div
                                className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-20 min-w-[150px]"
                                style={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                }}
                            >
                                <button
                                    onClick={() => {
                                        onCopyLogin(profile.login);
                                        setShowMobileMenu(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    <Copy className="w-4 h-4" />
                                    Copy Login
                                </button>
                                <button
                                    onClick={() => {
                                        onToggleFavorite(profile);
                                        setShowMobileMenu(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    <Star className={`w-4 h-4 ${profile.favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                    {profile.favorite ? 'Unfavorite' : 'Favorite'}
                                </button>
                                <button
                                    onClick={() => {
                                        onEdit(profile);
                                        setShowMobileMenu(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => {
                                        onDelete(profile);
                                        setShowMobileMenu(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-500/10"
                                    style={{ color: '#ef4444' }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
