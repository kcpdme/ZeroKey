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
    Check
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PasswordProfile } from '../../../services/ProfileService';
import { getFaviconUrl } from '../../../lib/favicon';
import { TagChips } from '../TagSelector';

interface PasswordCardProps {
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

export function PasswordCard({
    profile,
    onGenerate,
    onEdit,
    onDelete,
    onCopyLogin,
    onToggleFavorite,
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

            {/* Main Content */}
            <div className="flex-1 min-w-0">
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
                </div>

                {/* Login/Email */}
                <p
                    className="text-xs md:text-sm truncate"
                    style={{ color: 'var(--text-muted)' }}
                >
                    {profile.login}
                </p>

                {/* Desktop: Type Badge + Copy button */}
                <div className="hidden md:flex items-center gap-2 mt-0.5">
                    <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                            background: isSecure
                                ? 'rgba(6, 182, 212, 0.12)'
                                : 'rgba(168, 85, 247, 0.12)',
                            color: isSecure ? 'var(--sidebar-accent-cyan)' : 'var(--sidebar-accent-purple)',
                        }}
                    >
                        {isSecure ? 'Secure' : 'Memorable'}
                    </span>
                    <button
                        onClick={handleCopyLogin}
                        className={`
                            p-1 rounded transition-all duration-150 shrink-0
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

                {/* Tags - Desktop only */}
                {profile.tags && profile.tags.length > 0 && (
                    <div className="hidden md:block mt-1.5">
                        <TagChips tags={profile.tags} size="sm" maxVisible={2} />
                    </div>
                )}
            </div>

            {/* Password Details (Desktop) */}
            {isSecure && (
                <div
                    className="hidden lg:flex items-center gap-3 text-xs shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <span
                        className="px-2 py-1 rounded-md"
                        style={{ background: 'var(--sidebar-count-bg)' }}
                    >
                        {profile.options.length} chars
                    </span>
                    <span
                        className="px-2 py-1 rounded-md"
                        style={{ background: 'var(--sidebar-count-bg)' }}
                    >
                        v{profile.options.counter}
                    </span>
                </div>
            )}

            {/* Last Used (Desktop) */}
            <div
                className="hidden xl:flex items-center gap-1.5 text-xs shrink-0"
                style={{ color: 'var(--text-muted)' }}
            >
                <Clock className="w-3.5 h-3.5" />
                <span>{formatLastUsed(profile.lastUsedAt)}</span>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-1 shrink-0">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onGenerate(profile);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                        background: 'var(--btn-primary-gradient)',
                        color: 'white',
                        boxShadow: '0 2px 8px rgba(6, 182, 212, 0.2)',
                    }}
                >
                    <KeyRound className="w-4 h-4" />
                    <span className="hidden lg:inline">Generate</span>
                </button>

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
                            <div
                                className="fixed inset-0 z-10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMobileMenu(false);
                                }}
                            />
                            <div
                                className="absolute right-0 top-full mt-1 py-2 rounded-xl shadow-xl z-20 min-w-[160px]"
                                style={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                }}
                            >
                                <MobileMenuItem
                                    icon={Copy}
                                    label="Copy Login"
                                    onClick={() => {
                                        onCopyLogin(profile.login);
                                        setShowMobileMenu(false);
                                    }}
                                />
                                <MobileMenuItem
                                    icon={Star}
                                    label={profile.favorite ? 'Unfavorite' : 'Favorite'}
                                    onClick={() => {
                                        onToggleFavorite(profile);
                                        setShowMobileMenu(false);
                                    }}
                                    iconClass={profile.favorite ? 'fill-yellow-400 text-yellow-400' : ''}
                                />
                                <MobileMenuItem
                                    icon={Edit}
                                    label="Edit"
                                    onClick={() => {
                                        onEdit(profile);
                                        setShowMobileMenu(false);
                                    }}
                                />
                                <div
                                    className="my-1 border-t"
                                    style={{ borderColor: 'var(--border-color)' }}
                                />
                                <MobileMenuItem
                                    icon={Trash2}
                                    label="Delete"
                                    onClick={() => {
                                        onDelete(profile);
                                        setShowMobileMenu(false);
                                    }}
                                    danger
                                />
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
