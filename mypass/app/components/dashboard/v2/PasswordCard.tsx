// Dashboard V2 PasswordCard - Modern card design for password entries
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
    Eye,
    EyeOff,
    Check
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
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
                relative flex items-center gap-4 px-4 py-3.5 rounded-2xl
                transition-all duration-200 group cursor-pointer
                ${isSelected ? 'ring-2 ring-cyan-500/50' : ''}
            `}
            style={{
                background: isHovered
                    ? 'rgba(255, 255, 255, 0.04)'
                    : isSelected
                        ? 'rgba(6, 182, 212, 0.08)'
                        : 'rgba(255, 255, 255, 0.02)',
                border: '1px solid',
                borderColor: isHovered
                    ? 'rgba(255, 255, 255, 0.1)'
                    : isSelected
                        ? 'rgba(6, 182, 212, 0.3)'
                        : 'rgba(255, 255, 255, 0.05)',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => showCheckbox ? onToggleSelect?.(profile) : onGenerate(profile)}
        >
            {/* Checkbox for bulk select */}
            {showCheckbox && (
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect?.(profile)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
                />
            )}

            {/* Favorite Star */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(profile);
                }}
                className={`
                    p-1.5 rounded-lg transition-all shrink-0
                    ${profile.favorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                    hover:bg-white/10
                `}
                title={profile.favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
                <Star
                    className={`w-4 h-4 transition-all ${profile.favorite
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-slate-500 hover:text-yellow-400'
                        }`}
                />
            </button>

            {/* Favicon / Icon */}
            <div className="relative shrink-0">
                {!faviconError ? (
                    <div
                        className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center"
                        style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                    >
                        <img
                            src={faviconUrl}
                            alt=""
                            className="w-6 h-6"
                            onError={() => setFaviconError(true)}
                        />
                    </div>
                ) : (
                    <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center"
                        style={{
                            background: isSecure
                                ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(99, 102, 241, 0.2))'
                                : 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))',
                        }}
                    >
                        {isSecure ? (
                            <Shield className="w-5 h-5 text-cyan-400" />
                        ) : (
                            <Sparkles className="w-5 h-5 text-purple-400" />
                        )}
                    </div>
                )}

                {/* Favorite indicator overlay for mobile */}
                {profile.favorite && (
                    <Star
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 fill-yellow-400 text-yellow-400 md:hidden"
                    />
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white truncate">
                        {profile.site}
                    </h3>

                    {/* Type Badge */}
                    <span
                        className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0"
                        style={{
                            background: isSecure
                                ? 'rgba(6, 182, 212, 0.15)'
                                : 'rgba(139, 92, 246, 0.15)',
                            color: isSecure ? 'var(--color-cyan-400)' : '#a855f7',
                        }}
                    >
                        {isSecure ? 'Secure' : 'Memorable'}
                    </span>
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm text-slate-400 truncate">
                        {profile.login}
                    </p>
                    <button
                        onClick={handleCopyLogin}
                        className={`
                            p-1 rounded transition-all shrink-0
                            ${copiedField === 'login' ? 'text-green-400' : 'text-slate-500 hover:text-white opacity-0 group-hover:opacity-100'}
                        `}
                        title="Copy login"
                    >
                        {copiedField === 'login' ? (
                            <Check className="w-3.5 h-3.5" />
                        ) : (
                            <Copy className="w-3.5 h-3.5" />
                        )}
                    </button>
                </div>

                {/* Tags */}
                {profile.tags && profile.tags.length > 0 && (
                    <div className="hidden md:block mt-1.5">
                        <TagChips tags={profile.tags} size="sm" maxVisible={2} />
                    </div>
                )}
            </div>

            {/* Password Details (Desktop) */}
            {isSecure && (
                <div className="hidden lg:flex items-center gap-4 text-xs text-slate-500 shrink-0">
                    <span className="px-2 py-1 rounded-lg bg-white/5">
                        {profile.options.length} chars
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-white/5">
                        v{profile.options.counter}
                    </span>
                </div>
            )}

            {/* Last Used (Desktop) */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
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
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                    style={{
                        background: 'linear-gradient(135deg, var(--color-cyan-500), #6366f1)',
                        color: 'white',
                        boxShadow: '0 2px 10px rgba(6, 182, 212, 0.2)',
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
                    className="p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10"
                    title="Edit"
                >
                    <Edit className="w-4 h-4 text-slate-400" />
                </button>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(profile);
                    }}
                    className="p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/15"
                    title="Delete"
                >
                    <Trash2 className="w-4 h-4 text-red-400" />
                </button>
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-1 shrink-0">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onGenerate(profile);
                    }}
                    className="p-2.5 rounded-xl"
                    style={{
                        background: 'linear-gradient(135deg, var(--color-cyan-500), #6366f1)',
                        color: 'white',
                    }}
                >
                    <KeyRound className="w-4 h-4" />
                </button>

                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMobileMenu(!showMobileMenu);
                        }}
                        className="p-2.5 rounded-xl hover:bg-white/10"
                    >
                        <MoreVertical className="w-4 h-4 text-slate-400" />
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
                                    background: '#1e293b',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
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
                                <div className="my-1 border-t border-white/10" />
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
            className={`
                w-full flex items-center gap-3 px-4 py-2.5 text-sm
                transition-colors
                ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-slate-300 hover:bg-white/5'}
            `}
        >
            <Icon className={`w-4 h-4 ${iconClass}`} />
            {label}
        </button>
    );
}
