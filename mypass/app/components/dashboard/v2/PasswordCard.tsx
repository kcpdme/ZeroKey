// Dashboard V2 PasswordCard - Proton Pass style card design
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
    History
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
    const [isHovered, setIsHovered] = useState(false);

    const faviconUrl = getFaviconUrl(profile.site, 32);

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

    const isSecure = profile.algorithm === 'pbkdf2';

    return (
        <div
            className={`
                relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                transition-all duration-200 ease-in-out group cursor-pointer
                ${showCheckbox && isSelected ? 'pass-item--bulk-selected' : ''}
            `}
            style={{
                background: isSelected
                    ? 'var(--card-bg-selected)'
                    : isHovered
                        ? 'var(--card-bg-hover)'
                        : 'var(--card-bg)',
                border: '1px solid',
                borderColor: isSelected
                    ? 'var(--card-border-selected)'
                    : isHovered
                        ? 'var(--card-border-hover)'
                        : 'var(--card-border)',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
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
                        className="w-5 h-5 rounded-md accent-cyan-500 cursor-pointer"
                        style={{
                            accentColor: 'var(--color-cyan-500)',
                        }}
                    />
                </div>
            )}

            {/* Favorite Star - Desktop only, hidden on mobile */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(profile);
                }}
                className={`
                    hidden md:flex p-1.5 rounded-lg transition-all duration-150 shrink-0
                    ${profile.favorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                `}
                style={{
                    background: profile.favorite ? 'rgba(250, 204, 21, 0.1)' : 'transparent',
                }}
                title={profile.favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
                <Star
                    className={`w-4 h-4 transition-all ${profile.favorite
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-slate-400 hover:text-yellow-400'
                        }`}
                />
            </button>

            {/* Favicon / Icon - Smaller on mobile */}
            <div className="relative shrink-0">
                {!faviconError ? (
                    <div
                        className="w-9 h-9 md:w-10 md:h-10 rounded-lg overflow-hidden flex items-center justify-center"
                        style={{ background: 'var(--sidebar-count-bg)' }}
                    >
                        <img
                            src={faviconUrl}
                            alt=""
                            className="w-4 h-4 md:w-5 md:h-5"
                            onError={() => setFaviconError(true)}
                        />
                    </div>
                ) : (
                    <div
                        className="w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center"
                        style={{
                            background: isSecure
                                ? 'rgba(6, 182, 212, 0.12)'
                                : 'rgba(168, 85, 247, 0.12)',
                        }}
                    >
                        {isSecure ? (
                            <Shield className="w-4 h-4 md:w-5 md:h-5" style={{ color: 'var(--sidebar-accent-cyan)' }} />
                        ) : (
                            <Sparkles className="w-4 h-4 md:w-5 md:h-5" style={{ color: 'var(--sidebar-accent-purple)' }} />
                        )}
                    </div>
                )}

                {/* Mobile favorite indicator - Small star badge */}
                {profile.favorite && (
                    <Star
                        className="absolute -top-0.5 -right-0.5 w-3 h-3 fill-yellow-400 text-yellow-400 md:hidden"
                    />
                )}
            </div>

            {/* Main Content - Column 1 */}
            <div className="flex-1 min-w-0 lg:flex-initial lg:w-64">
                {/* Site Name + Type Badge (inline on mobile) */}
                <div className="flex items-center gap-1.5">
                    <h3
                        className="font-semibold text-sm md:text-base truncate"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        {profile.site}
                    </h3>
                    {/* Type Badge - Mobile inline */}
                    <span
                        className="md:hidden px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wide shrink-0"
                        style={{
                            background: isSecure
                                ? 'rgba(6, 182, 212, 0.12)'
                                : 'rgba(168, 85, 247, 0.12)',
                            color: isSecure ? 'var(--sidebar-accent-cyan)' : 'var(--sidebar-accent-purple)',
                        }}
                    >
                        {isSecure ? 'Secure' : 'Mem'}
                    </span>
                    {/* Type Icon - Desktop only */}
                    <div className="hidden md:flex items-center justify-center w-5 h-5 rounded shrink-0"
                        style={{
                            background: isSecure
                                ? 'rgba(6, 182, 212, 0.12)'
                                : 'rgba(168, 85, 247, 0.12)',
                        }}
                    >
                        {isSecure ? (
                            <Shield className="w-3 h-3" style={{ color: 'var(--sidebar-accent-cyan)' }} />
                        ) : (
                            <Sparkles className="w-3 h-3" style={{ color: 'var(--sidebar-accent-purple)' }} />
                        )}
                    </div>
                </div>

                {/* Login/Email + Copy button */}
                <div className="flex items-center gap-1.5 mt-0.5">
                    <p
                        className="text-xs md:text-sm truncate"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        {profile.login}
                    </p>
                    <button
                        onClick={handleCopyLogin}
                        className={`
                            hidden md:flex p-1 rounded transition-all duration-150 shrink-0
                            ${copiedField === 'login'
                                ? ''
                                : 'opacity-0 group-hover:opacity-100'
                            }
                        `}
                        style={{
                            color: copiedField === 'login' ? '#22c55e' : 'var(--text-muted)',
                        }}
                        title="Copy login"
                    >
                        {copiedField === 'login' ? (
                            <Check className="w-3.5 h-3.5" />
                        ) : (
                            <Copy className="w-3.5 h-3.5" />
                        )}
                    </button>
                </div>
            </div>

            {/* Tags Column - Column 2 */}
            <div className="hidden lg:flex items-center w-72 px-3">
                {profile.tags && profile.tags.length > 0 ? (
                    <TagChips tags={profile.tags} size="sm" maxVisible={3} />
                ) : (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                )}
            </div>

            {/* Version & Length Column - Column 3 (Secure only) */}
            {isSecure ? (
                <div className="hidden lg:flex items-center gap-1.5 shrink-0">
                    <span
                        className="px-2 py-1 rounded-md text-xs font-medium"
                        style={{
                            background: 'var(--sidebar-count-bg)',
                            color: 'var(--text-secondary)',
                        }}
                        title={`Version ${profile.options.counter} - Increment when password expires`}
                    >
                        v{profile.options.counter}
                    </span>
                    <span
                        className="px-2 py-1 rounded-md text-xs font-medium"
                        style={{
                            background: 'var(--sidebar-count-bg)',
                            color: 'var(--text-secondary)',
                        }}
                        title={`Password length: ${profile.options.length} characters`}
                    >
                        L{profile.options.length}
                    </span>
                    <ExpiryBadge passwordPolicy={profile.passwordPolicy} size="sm" />
                </div>
            ) : (
                <div className="hidden lg:flex items-center gap-1.5 shrink-0">
                    <ExpiryBadge passwordPolicy={profile.passwordPolicy} size="sm" />
                </div>
            )}

            {/* Spacer to push right content */}
            <div className="hidden lg:flex flex-1" />

            {/* Last Used (Desktop) */}
            <div
                className="hidden lg:flex items-center gap-1.5 text-xs shrink-0 mr-4"
                style={{ color: 'var(--text-muted)' }}
            >
                <Clock className="w-3.5 h-3.5" />
                <span>{formatLastUsed(profile.lastUsedAt)}</span>
            </div>

            {/* Desktop Actions - Simplified */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onGenerate(profile);
                    }}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                        background: 'var(--btn-primary-gradient)',
                        color: 'white',
                        boxShadow: '0 2px 8px rgba(6, 182, 212, 0.2)',
                    }}
                >
                    <KeyRound className="w-4 h-4" />
                    <span className="hidden lg:inline">Generate</span>
                </button>

                {/* Edit button - visible on hover */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(profile);
                    }}
                    className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--sidebar-hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    title="Edit"
                >
                    <Edit className="w-4 h-4" />
                </button>

                {/* History button - visible on hover */}
                {onViewHistory && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewHistory(profile);
                        }}
                        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--sidebar-hover-bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        title="Version History"
                    >
                        <History className="w-4 h-4" />
                    </button>
                )}

                {/* Delete button - visible on hover */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(profile);
                    }}
                    className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150"
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--sidebar-danger-hover-bg)';
                        e.currentTarget.style.color = 'var(--sidebar-danger-text)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                    style={{ color: 'var(--text-muted)' }}
                    title="Delete"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-1.5 shrink-0">
                {/* Generate Password Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onGenerate(profile);
                    }}
                    className="flex items-center justify-center rounded-lg shrink-0"
                    style={{
                        width: '32px',
                        height: '32px',
                        minWidth: '32px',
                        minHeight: '32px',
                        background: 'var(--btn-primary-gradient)',
                        color: 'white',
                    }}
                >
                    <KeyRound className="w-4 h-4" />
                </button>

                {/* Menu Button */}
                <div className="relative shrink-0">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMobileMenu(!showMobileMenu);
                        }}
                        className="flex items-center justify-center rounded-lg"
                        style={{
                            width: '32px',
                            height: '32px',
                            minWidth: '32px',
                            minHeight: '32px',
                            color: 'var(--text-muted)',
                            background: 'var(--bg-tertiary)',
                        }}
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>

                    {showMobileMenu && (
                        <>
                            {/* Backdrop */}
                            <div
                                className="fixed inset-0 z-50 bg-black/40"
                                style={{ backdropFilter: 'blur(2px)' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMobileMenu(false);
                                }}
                            />
                            {/* Bottom Sheet Menu */}
                            <div
                                className="fixed left-3 right-3 bottom-20 z-50 p-4 rounded-2xl shadow-2xl"
                                style={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Site name header */}
                                <div
                                    className="text-center text-sm font-semibold truncate mb-4"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    {profile.site}
                                </div>

                                {/* Horizontal action buttons */}
                                <div className="flex justify-center gap-6">
                                    {/* Favorite */}
                                    <button
                                        onClick={() => {
                                            onToggleFavorite(profile);
                                            setShowMobileMenu(false);
                                        }}
                                        className="flex flex-col items-center gap-1.5"
                                    >
                                        <div
                                            className="w-12 h-12 flex items-center justify-center rounded-xl"
                                            style={{ background: profile.favorite ? 'rgba(250, 204, 21, 0.15)' : 'var(--bg-tertiary)' }}
                                        >
                                            <Star
                                                className={`w-5 h-5 ${profile.favorite ? 'fill-yellow-400 text-yellow-400' : ''}`}
                                                style={{ color: profile.favorite ? undefined : 'var(--text-secondary)' }}
                                            />
                                        </div>
                                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                            {profile.favorite ? 'Unfav' : 'Favorite'}
                                        </span>
                                    </button>

                                    {/* Edit */}
                                    <button
                                        onClick={() => {
                                            onEdit(profile);
                                            setShowMobileMenu(false);
                                        }}
                                        className="flex flex-col items-center gap-1.5"
                                    >
                                        <div
                                            className="w-12 h-12 flex items-center justify-center rounded-xl"
                                            style={{ background: 'var(--bg-tertiary)' }}
                                        >
                                            <Edit className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                                        </div>
                                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Edit</span>
                                    </button>

                                    {/* History */}
                                    {onViewHistory && (
                                        <button
                                            onClick={() => {
                                                onViewHistory(profile);
                                                setShowMobileMenu(false);
                                            }}
                                            className="flex flex-col items-center gap-1.5"
                                        >
                                            <div
                                                className="w-12 h-12 flex items-center justify-center rounded-xl"
                                                style={{ background: 'rgba(6, 182, 212, 0.1)' }}
                                            >
                                                <History className="w-5 h-5" style={{ color: 'var(--sidebar-accent-cyan)' }} />
                                            </div>
                                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>History</span>
                                        </button>
                                    )}

                                    {/* Delete */}
                                    <button
                                        onClick={() => {
                                            onDelete(profile);
                                            setShowMobileMenu(false);
                                        }}
                                        className="flex flex-col items-center gap-1.5"
                                    >
                                        <div
                                            className="w-12 h-12 flex items-center justify-center rounded-xl"
                                            style={{ background: 'rgba(239, 68, 68, 0.1)' }}
                                        >
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

function MobileMenuItem({
    icon: Icon,
    label,
    onClick,
    danger = false,
    iconClass = '',
}: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    danger?: boolean;
    iconClass?: string;
}) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
            style={{
                color: danger ? 'var(--sidebar-danger-text)' : 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = danger
                    ? 'var(--sidebar-danger-hover-bg)'
                    : 'var(--sidebar-hover-bg)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
            }}
        >
            <Icon className={`w-4 h-4 ${iconClass}`} />
            {label}
        </button>
    );
}
