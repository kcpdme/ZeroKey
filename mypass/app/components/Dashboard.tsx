// app/components/Dashboard.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProfileService, PasswordProfile } from '../services/ProfileService';
import { Search, Shield, Brain, Trash2, X, LogOut, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface DashboardProps {
    isOpen: boolean;
    onClose: () => void;
    onLoadProfile: (profile: PasswordProfile) => void;
}

export function Dashboard({ isOpen, onClose, onLoadProfile }: DashboardProps) {
    const { user, signOut } = useAuth();
    const [profiles, setProfiles] = useState<PasswordProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'pbkdf2' | 'memorizable'>('all');

    // Load data when opened
    useEffect(() => {
        if (isOpen && user) {
            loadProfiles();
        }
    }, [isOpen, user]);

    const loadProfiles = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await ProfileService.getUserProfiles(user.uid);
            // Sort by recently updated
            data.sort((a, b) => b.updatedAt.seconds - a.updatedAt.seconds);
            setProfiles(data);
        } catch (error) {
            console.error("Failed to load profiles", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this profile?')) {
            await ProfileService.deleteProfile(id);
            setProfiles(prev => prev.filter(p => p.id !== id));
        }
    };

    const filteredProfiles = useMemo(() => {
        return profiles.filter(p => {
            const matchesSearch =
                p.site.toLowerCase().includes(search.toLowerCase()) ||
                p.login.toLowerCase().includes(search.toLowerCase());
            const matchesType = filterType === 'all' || p.algorithm === filterType;
            return matchesSearch && matchesType;
        });
    }, [profiles, search, filterType]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className="relative w-full max-w-sm bg-[#0f172a] h-full shadow-2xl flex flex-col transform transition-transform duration-300 animate-slide-in-right border-r border-slate-800"
                style={{ background: 'var(--bg-primary)' }}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-700/50 flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                    <div>
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>My Vault</h2>
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{user?.email}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700/20 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                    </button>
                </div>

                {/* Filters */}
                <div className="p-4 space-y-3 bg-slate-800/20" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search site or login..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none border transition-all"
                            style={{
                                background: 'var(--bg-input)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>
                    <div className="flex gap-2">
                        {(['all', 'pbkdf2', 'memorizable'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${filterType === type
                                        ? 'bg-cyan-600/20 text-cyan-500 border border-cyan-500/30'
                                        : 'bg-transparent text-slate-500 border border-transparent hover:bg-slate-700/10'
                                    }`}
                                style={{
                                    color: filterType === type ? 'var(--color-cyan-500)' : 'var(--text-muted)'
                                }}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-2 py-2">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filteredProfiles.length === 0 ? (
                        <div className="text-center p-8 text-slate-500 text-sm">
                            {search ? 'No matching profiles found.' : 'No saved profiles yet.'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredProfiles.map(profile => (
                                <div
                                    key={profile.id}
                                    onClick={() => onLoadProfile(profile)}
                                    className="group relative p-3 rounded-xl border border-transparent hover:border-cyan-500/30 transition-all cursor-pointer"
                                    style={{ background: 'var(--bg-secondary)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${profile.algorithm === 'pbkdf2' ? 'bg-cyan-500/10 text-cyan-500' : 'bg-purple-500/10 text-purple-500'
                                                }`}>
                                                {profile.algorithm === 'pbkdf2' ? <Shield className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{profile.site}</h3>
                                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{profile.login}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>

                                    {/* Delete Button (Hover only) */}
                                    <button
                                        onClick={(e) => handleDelete(e, profile.id!)}
                                        className="absolute right-2 top-2 p-2 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded-lg transition-all"
                                        title="Delete Profile"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700/50" style={{ borderColor: 'var(--border-color)' }}>
                    <button
                        onClick={signOut}
                        className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
