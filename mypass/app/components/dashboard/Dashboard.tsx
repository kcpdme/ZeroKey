// app/components/dashboard/Dashboard.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Download, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProfileService, PasswordProfile } from '../../services/ProfileService';
import { SettingsService, UserSettings } from '../../services/SettingsService';
import { SettingsModal } from '../settings';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardStats } from './DashboardStats';
import { ProfileFilters } from './ProfileFilters';
import { ProfileList } from './ProfileList';
import { GenerateModal } from './GenerateModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { QuickAddModal } from './QuickAddModal';
import { ExportImportModal } from './ExportImportModal';
import { MobileBottomNav, MobileHeader, MobileDrawer } from './MobileNav';
import { ProfileListSkeleton, StatsSkeleton } from './Skeleton';
import { QuickSearch } from './QuickSearch';
import { TagFilter } from './TagSelector';

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

    // Mobile state
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Quick Search state
    const [showQuickSearch, setShowQuickSearch] = useState(false);

    // Tag filter state
    const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

    // Modals
    const [showSettings, setShowSettings] = useState(false);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [showExportImport, setShowExportImport] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<PasswordProfile | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PasswordProfile | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            // Ctrl/Cmd + N = Quick Add
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                setShowQuickAdd(true);
            }
            // Ctrl/Cmd + E = Export/Import
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                setShowExportImport(true);
            }
            // Ctrl/Cmd + K = Quick Search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setShowQuickSearch(true);
            }
            // Escape = Close modals or dashboard
            if (e.key === 'Escape') {
                if (showQuickSearch) setShowQuickSearch(false);
                else if (showQuickAdd) setShowQuickAdd(false);
                else if (showExportImport) setShowExportImport(false);
                else if (showSettings) setShowSettings(false);
                else if (selectedProfile) setSelectedProfile(null);
                else if (deleteTarget) setDeleteTarget(null);
                else if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                else onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, showQuickAdd, showExportImport, showSettings, selectedProfile, deleteTarget, isMobileMenuOpen, onClose]);

    // Load data
    useEffect(() => {
        if (isOpen && user) {
            loadProfiles();
            loadSettings();
        }
    }, [isOpen, user]);

    const loadProfiles = useCallback(async () => {
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
    }, [user]);

    const loadSettings = async () => {
        if (!user) return;
        try {
            const settings = await SettingsService.getSettings(user.uid);
            setUserSettings(settings);
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    // Computed - filter by sidebar selection AND search AND tags
    const filteredProfiles = profiles.filter(profile => {
        // Filter by sidebar selection
        if (activeView === 'secure' && profile.algorithm !== 'pbkdf2') return false;
        if (activeView === 'memorable' && profile.algorithm !== 'memorizable') return false;
        if (activeView === 'favorites' && !profile.favorite) return false;

        // Filter by selected tag
        if (selectedTagFilter && (!profile.tags || !profile.tags.includes(selectedTagFilter))) {
            return false;
        }

        // Filter by search
        if (searchQuery) {
            const matchesSearch =
                profile.site.toLowerCase().includes(searchQuery.toLowerCase()) ||
                profile.login.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (profile.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
            if (!matchesSearch) return false;
        }

        return true;
    });

    // Collect all tags for the sidebar filter
    const allTags = profiles.flatMap(p => p.tags || []);

    const stats = {
        total: profiles.length,
        secure: profiles.filter(p => p.algorithm === 'pbkdf2').length,
        memorable: profiles.filter(p => p.algorithm === 'memorizable').length,
        favorites: profiles.filter(p => p.favorite).length,
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

    const handleGenerate = async (profile: PasswordProfile) => {
        // Update last used timestamp
        if (profile.id) {
            ProfileService.updateLastUsed(profile.id).catch(console.error);
        }
        setSelectedProfile(profile);
    };

    const handleViewChange = (view: string) => {
        setActiveView(view);
        setSearchQuery(''); // Clear search when changing views
        setSelectedTagFilter(null); // Clear tag filter when changing views
    };

    // Get view title
    const getViewTitle = () => {
        switch (activeView) {
            case 'favorites': return 'Favorites';
            case 'secure': return 'Secure';
            case 'memorable': return 'Memorable';
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

            {/* Quick Add Modal */}
            {user && (
                <QuickAddModal
                    isOpen={showQuickAdd}
                    onClose={() => setShowQuickAdd(false)}
                    userId={user.uid}
                    userSettings={userSettings}
                    onSuccess={loadProfiles}
                />
            )}

            {/* Export/Import Modal */}
            {user && (
                <ExportImportModal
                    isOpen={showExportImport}
                    onClose={() => setShowExportImport(false)}
                    userId={user.uid}
                    profiles={profiles}
                    onImportComplete={loadProfiles}
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

            {/* Quick Search (Cmd+K) */}
            <QuickSearch
                isOpen={showQuickSearch}
                onClose={() => setShowQuickSearch(false)}
                profiles={profiles}
                onSelectProfile={handleEdit}
                onGeneratePassword={handleGenerate}
            />

            {/* Mobile Drawer */}
            <MobileDrawer
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                userEmail={user?.email || undefined}
                onSignOut={handleSignOut}
                stats={stats}
            />

            {/* Desktop Sidebar - Hidden on mobile */}
            <div className="hidden md:block">
                <DashboardSidebar
                    activeView={activeView}
                    onViewChange={handleViewChange}
                    onSettingsClick={() => setShowSettings(true)}
                    onSignOut={handleSignOut}
                    stats={stats}
                    userEmail={user?.email || undefined}
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Header */}
                <MobileHeader
                    title={getViewTitle()}
                    subtitle={`${filteredProfiles.length} passwords`}
                    onMenuToggle={() => setIsMobileMenuOpen(true)}
                    onSettingsClick={() => setShowSettings(true)}
                />

                {/* Desktop Header */}
                <header
                    className="hidden md:flex items-center justify-between px-6 py-4 border-b"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}
                >
                    <div>
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            {getViewTitle()}
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            {filteredProfiles.length} {filteredProfiles.length === 1 ? 'password' : 'passwords'}
                            <span className="ml-2 opacity-50">• Ctrl+K: Search • Ctrl+N: Add</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Quick Search Button */}
                        <button
                            onClick={() => setShowQuickSearch(true)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-white/10"
                            style={{
                                background: 'var(--bg-tertiary)',
                                color: 'var(--text-secondary)',
                            }}
                            title="Quick Search (Ctrl+K)"
                        >
                            <Search className="w-4 h-4" />
                            <span className="text-sm">Search...</span>
                            <kbd className="hidden lg:inline-flex px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--bg-secondary)' }}>⌘K</kbd>
                        </button>

                        {/* Quick Add Button */}
                        <button
                            onClick={() => setShowQuickAdd(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all hover:scale-105"
                            style={{
                                background: 'linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-500))',
                                color: 'white',
                            }}
                        >
                            <Plus className="w-4 h-4" />
                            Add
                        </button>

                        {/* Export/Import Button */}
                        <button
                            onClick={() => setShowExportImport(true)}
                            className="p-2 rounded-lg transition-colors hover:bg-white/10"
                            style={{ color: 'var(--text-secondary)' }}
                            title="Backup & Restore (Ctrl+E)"
                        >
                            <Download className="w-5 h-5" />
                        </button>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg transition-colors hover:bg-white/10"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Stats Bar (only for All view on desktop) */}
                {activeView === 'all' && (
                    <div className="hidden md:block">
                        {loading ? (
                            <StatsSkeleton />
                        ) : (
                            <DashboardStats
                                total={stats.total}
                                secure={stats.secure}
                                memorable={stats.memorable}
                            />
                        )}
                    </div>
                )}

                {/* Search */}
                <div className="px-4 md:px-6 py-3 md:py-4">
                    <ProfileFilters
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        hideTypeFilter={true}
                    />
                </div>

                {/* Profile List */}
                <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 md:pb-6">
                    {loading ? (
                        <ProfileListSkeleton count={6} />
                    ) : (
                        <ProfileList
                            profiles={filteredProfiles}
                            loading={false}
                            isEmpty={profiles.length === 0}
                            onGenerate={handleGenerate}
                            onEdit={handleEdit}
                            onDelete={setDeleteTarget}
                            onProfilesChange={loadProfiles}
                        />
                    )}
                </div>

                {/* Mobile Close Button (top-right) */}
                <button
                    onClick={onClose}
                    className="fixed top-3 right-3 md:hidden p-2 rounded-lg z-30"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav
                activeView={activeView}
                onViewChange={handleViewChange}
                onQuickAdd={() => setShowQuickAdd(true)}
            />
        </div>
    );
}
