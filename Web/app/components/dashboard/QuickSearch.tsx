// app/components/dashboard/QuickSearch.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, KeyRound, Shield, Sparkles, Clock, Star, ArrowRight, Command } from 'lucide-react';
import { PasswordProfile } from '../../services/ProfileService';
import { getFaviconUrl } from '../../lib/favicon';

interface QuickSearchProps {
    isOpen: boolean;
    onClose: () => void;
    profiles: PasswordProfile[];
    onSelectProfile: (profile: PasswordProfile) => void;
    onGeneratePassword: (profile: PasswordProfile) => void;
}

export function QuickSearch({
    isOpen,
    onClose,
    profiles,
    onSelectProfile,
    onGeneratePassword,
}: QuickSearchProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Filter profiles based on search (site and login only, not tags)
    const filteredProfiles = profiles.filter(profile => {
        if (!searchQuery.trim()) return true; // Show all if no search
        const query = searchQuery.toLowerCase();
        return (
            profile.site.toLowerCase().includes(query) ||
            profile.login.toLowerCase().includes(query)
        );
    }).slice(0, 8); // Limit to 8 results

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, filteredProfiles.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredProfiles[selectedIndex]) {
                    if (e.shiftKey) {
                        onSelectProfile(filteredProfiles[selectedIndex]);
                    } else {
                        onGeneratePassword(filteredProfiles[selectedIndex]);
                    }
                    onClose();
                }
                break;
            case 'Escape':
                e.preventDefault();
                e.stopPropagation(); // Prevent Dashboard from also handling this
                onClose();
                break;
        }
    }, [filteredProfiles, selectedIndex, onSelectProfile, onGeneratePassword, onClose]);

    // Scroll selected item into view
    useEffect(() => {
        const selectedElement = listRef.current?.children[selectedIndex] as HTMLElement;
        selectedElement?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Search Modal */}
            <div
                className="relative w-full max-w-xl mx-4 rounded-2xl shadow-2xl overflow-hidden"
                style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                }}
            >
                {/* Search Input */}
                <div
                    className="flex items-center gap-3 px-4 py-4 border-b"
                    style={{ borderColor: 'var(--border-color)' }}
                >
                    <Search className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Search by website or email..."
                        className="flex-1 bg-transparent text-lg border-none shadow-none"
                        style={{
                            color: 'var(--text-primary)',
                            outline: 'none',
                            boxShadow: 'none',
                        }}
                        autoComplete="off"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="p-1 rounded hover:bg-white/10"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <kbd
                        className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                    >
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div
                    ref={listRef}
                    className="max-h-[50vh] overflow-y-auto py-2"
                >
                    {filteredProfiles.length === 0 ? (
                        <div className="py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                            <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
                            <p>No passwords found</p>
                            <p className="text-sm mt-1">Try a different search term</p>
                        </div>
                    ) : (
                        filteredProfiles.map((profile, index) => (
                            <SearchResultItem
                                key={profile.id}
                                profile={profile}
                                isSelected={index === selectedIndex}
                                onSelect={() => {
                                    onGeneratePassword(profile);
                                    onClose();
                                }}
                                onEdit={() => {
                                    onSelectProfile(profile);
                                    onClose();
                                }}
                                onMouseEnter={() => setSelectedIndex(index)}
                            />
                        ))
                    )}
                </div>

                {/* Footer with hints */}
                <div
                    className="flex items-center justify-between px-4 py-3 border-t text-xs"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                >
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)' }}>↵</kbd>
                            Generate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)' }}>⇧↵</kbd>
                            Edit
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)' }}>↑↓</kbd>
                        Navigate
                    </div>
                </div>
            </div>
        </div>
    );
}

// Individual search result item
function SearchResultItem({
    profile,
    isSelected,
    onSelect,
    onEdit,
    onMouseEnter,
}: {
    profile: PasswordProfile;
    isSelected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onMouseEnter: () => void;
}) {
    const [faviconError, setFaviconError] = useState(false);
    const faviconUrl = getFaviconUrl(profile.site, 32);

    return (
        <div
            onClick={onSelect}
            onMouseEnter={onMouseEnter}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-white/5' : 'hover:bg-white/5'
                }`}
            style={{
                background: isSelected ? 'rgba(6, 182, 212, 0.1)' : undefined,
            }}
        >
            {/* Favicon */}
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
                style={{ background: 'var(--bg-tertiary)' }}
            >
                {!faviconError ? (
                    <img
                        src={faviconUrl}
                        alt=""
                        className="w-6 h-6"
                        onError={() => setFaviconError(true)}
                    />
                ) : (
                    profile.algorithm === 'pbkdf2' ? (
                        <Shield className="w-5 h-5" style={{ color: 'var(--color-cyan-500)' }} />
                    ) : (
                        <Sparkles className="w-5 h-5" style={{ color: '#a855f7' }} />
                    )
                )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {profile.site}
                    </h4>
                    {profile.favorite && (
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
                    )}
                </div>
                <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>
                    {profile.login}
                </p>
            </div>

            {/* Type badge */}
            <div
                className="px-2 py-1 rounded text-xs font-medium shrink-0"
                style={{
                    background: profile.algorithm === 'pbkdf2' ? 'rgba(6, 182, 212, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                    color: profile.algorithm === 'pbkdf2' ? 'var(--color-cyan-500)' : '#a855f7',
                }}
            >
                {profile.algorithm === 'pbkdf2' ? 'Secure' : 'Memorable'}
            </div>

            {/* Quick action */}
            {isSelected && (
                <div className="flex items-center gap-1 shrink-0">
                    <ArrowRight className="w-4 h-4" style={{ color: 'var(--color-cyan-500)' }} />
                </div>
            )}
        </div>
    );
}

// Hook to handle Cmd/Ctrl+K shortcut
export function useQuickSearch(isOpen: boolean, setIsOpen: (open: boolean) => void) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(!isOpen);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, setIsOpen]);
}
