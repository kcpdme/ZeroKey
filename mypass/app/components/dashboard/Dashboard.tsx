// app/components/dashboard/Dashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProfileService, PasswordProfile } from '../../services/ProfileService';
import { SettingsService, UserSettings } from '../../services/SettingsService';
import { SettingsModal } from '../settings';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardStats } from './DashboardStats';
import { QuickAddForm } from './QuickAddForm';
import { ProfileFilters } from './ProfileFilters';
import { ProfileList } from './ProfileList';
import { GenerateModal } from './GenerateModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface DashboardProps {
    isOpen: boolean;
    onClose: () => void;
    onLoadProfile: (profile: PasswordProfile) => void;
}

export function Dashboard({ isOpen, onClose, onLoadProfile }: DashboardProps) {
    const { user, signOut } = useAuth();

    // State
    const [profiles, setProfiles] = useState<PasswordProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

    // View state (sidebar navigation)
    const [activeView, setActiveView] = useState<string>('all');

    // Modals
    const [showSettings, setShowSettings] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<PasswordProfile | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PasswordProfile | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Load data
    useEffect(() => {
        if (isOpen && user) {
            loadProfiles();
            loadSettings();
        }
    }, [isOpen, user]);

    const loadProfiles = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await ProfileService.getUserProfiles(user.uid);
            const sorted = data.sort((a, b) => {
                const aTime = a.updatedAt?.toDate?.() || new Date(0);
                const bTime = b.updatedAt?.toDate?.() || new Date(0);
                return bTime.getTime() - aTime.getTime();
            });
            setProfiles(sorted);
        } catch (error) {
            console.error('Failed to load profiles:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSettings = async () => {
        if (!user) return;
        try {
            const settings = await SettingsService.getSettings(user.uid);
            setUserSettings(settings);
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    // Computed - filter by sidebar selection AND search
    const filteredProfiles = profiles.filter(profile => {
        // Filter by sidebar selection
        if (activeView === 'secure' && profile.algorithm !== 'pbkdf2') return false;
        if (activeView === 'memorable' && profile.algorithm !== 'memorizable') return false;

        // Filter by search
        if (searchQuery) {
            const matchesSearch =
                profile.site.toLowerCase().includes(searchQuery.toLowerCase()) ||
                profile.login.toLowerCase().includes(searchQuery.toLowerCase());
            if (!matchesSearch) return false;
        }

        return true;
    });

    const stats = {
        total: profiles.length,
        secure: profiles.filter(p => p.algorithm === 'pbkdf2').length,
        memorable: profiles.filter(p => p.algorithm === 'memorizable').length,
    };

    // Handlers
    const handleSignOut = async () => {
        await signOut();
        onClose();
    };

    const handleDelete = async () => {
        if (!deleteTarget?.id) return;
        setIsDeleting(true);
        try {
            await ProfileService.deleteProfile(deleteTarget.id);
            setProfiles(prev => prev.filter(p => p.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (error) {
            console.error('Delete failed:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = (profile: PasswordProfile) => {
        onLoadProfile(profile);
        onClose();
    };

    const handleViewChange = (view: string) => {
        setActiveView(view);
        setSearchQuery(''); // Clear search when changing views
    };

    // Get view title
    const getViewTitle = () => {
        switch (activeView) {
            case 'secure': return 'Secure Passwords';
            case 'memorable': return 'Memorable Passwords';
            case 'quick-add': return 'Quick Add Password';
            default: return 'All Passwords';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex" style={{ background: 'var(--bg-primary)' }}>
            {/* Settings Modal */}
            {user && (
                <SettingsModal
                    isOpen={showSettings}
                    onClose={() => setShowSettings(false)}
                    userId={user.uid}
                    onSettingsSaved={setUserSettings}
                />
            )}

            {/* Generate Modal */}
            <GenerateModal
                profile={selectedProfile}
                onClose={() => setSelectedProfile(null)}
            />

            {/* Delete Modal */}
            <DeleteConfirmModal
                profile={deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                isDeleting={isDeleting}
            />

            {/* Sidebar */}
            <DashboardSidebar
                activeView={activeView}
                onViewChange={handleViewChange}
                onSettingsClick={() => setShowSettings(true)}
                onSignOut={handleSignOut}
                stats={stats}
                userEmail={user?.email || undefined}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header
                    className="flex items-center justify-between px-6 py-4 border-b"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}
                >
                    <div>
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            {getViewTitle()}
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            {activeView === 'quick-add'
                                ? 'Create a new password using your default settings'
                                : `${filteredProfiles.length} ${filteredProfiles.length === 1 ? 'password' : 'passwords'}`
                            }
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg transition-colors hover:bg-white/10"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </header>

                {/* Content based on active view */}
                {activeView === 'quick-add' ? (
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="max-w-xl mx-auto">
                            {user && (
                                <QuickAddForm
                                    userId={user.uid}
                                    userSettings={userSettings}
                                    onSuccess={() => {
                                        loadProfiles();
                                        // Stay on quick-add for rapid password creation
                                    }}
                                />
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Stats Bar (only for All view) */}
                        {activeView === 'all' && (
                            <DashboardStats
                                total={stats.total}
                                secure={stats.secure}
                                memorable={stats.memorable}
                            />
                        )}

                        {/* Search */}
                        <div className="px-6 py-4">
                            <ProfileFilters
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                                typeFilter="all"
                                onTypeFilterChange={() => { }}
                                hideTypeFilter={true}
                            />
                        </div>

                        {/* Profile List */}
                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                            <ProfileList
                                profiles={filteredProfiles}
                                loading={loading}
                                isEmpty={profiles.length === 0}
                                onGenerate={setSelectedProfile}
                                onEdit={handleEdit}
                                onDelete={setDeleteTarget}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
