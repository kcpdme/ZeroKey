// app/components/dashboard/ProfileRow.tsx
'use client';

import React from 'react';
import { KeyRound, Shield, Sparkles, Trash2, Clock, Copy, Edit, Star } from 'lucide-react';
import { format } from 'date-fns';
import { PasswordProfile } from '../../services/ProfileService';

interface ProfileRowProps {
    profile: PasswordProfile;
    onGenerate: (profile: PasswordProfile) => void;
    onEdit: (profile: PasswordProfile) => void;
    onDelete: (profile: PasswordProfile) => void;
    onCopyLogin: (login: string) => void;
    onToggleFavorite: (profile: PasswordProfile) => void;
}

export function ProfileRow({ profile, onGenerate, onEdit, onDelete, onCopyLogin, onToggleFavorite }: ProfileRowProps) {
    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return format(date, 'MMM d, yyyy');
        } catch {
            return '-';
        }
    };

    return (
        <div
            className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all hover:bg-white/5 group"
            style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
            }}
        >
            {/* Favorite Star */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(profile);
                }}
                className={`p-1 rounded transition-all ${profile.favorite ? '' : 'opacity-0 group-hover:opacity-100'}`}
                title={profile.favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
                <Star
                    className={`w-4 h-4 transition-all ${profile.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`}
                />
            </button>

            {/* Icon */}
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

            {/* Site & Login */}
            <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {profile.site}
                </h3>
                <div className="flex items-center gap-2">
                    <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>
                        {profile.login}
                    </p>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCopyLogin(profile.login);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-all"
                        title="Copy login"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <Copy className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Type Badge */}
            <div
                className="px-2 py-1 rounded-lg text-xs font-medium shrink-0"
                style={{
                    background: profile.algorithm === 'pbkdf2' ? 'var(--color-cyan-500)/10' : '#8b5cf6/10',
                    color: profile.algorithm === 'pbkdf2' ? 'var(--color-cyan-500)' : '#a855f7',
                }}
            >
                {profile.algorithm === 'pbkdf2' ? 'Secure' : 'Memorable'}
            </div>

            {/* Details */}
            {profile.algorithm === 'pbkdf2' && (
                <div className="hidden md:flex items-center gap-4 text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>
                    <span>Len: {profile.options.length}</span>
                    <span>v{profile.options.counter}</span>
                </div>
            )}

            {/* Date */}
            <div className="hidden lg:flex items-center gap-1 text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>
                <Clock className="w-3 h-3" />
                {formatDate(profile.updatedAt)}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
                <button
                    onClick={() => onGenerate(profile)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                    style={{
                        background: 'linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-500))',
                        color: 'white',
                    }}
                >
                    <KeyRound className="w-4 h-4" />
                    <span className="hidden sm:inline">Generate</span>
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
        </div>
    );
}
