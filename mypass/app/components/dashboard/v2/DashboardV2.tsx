// Dashboard V2 - Main Dashboard Component (Proton Pass Style)
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../hooks/useTheme';
import { ProfileService, PasswordProfile } from '../../../services/ProfileService';
import { SettingsService, UserSettings } from '../../../services/SettingsService';
import { SettingsModal } from '../../settings';
import { GenerateModal } from '../GenerateModal';
import { DeleteConfirmModal } from '../DeleteConfirmModal';
import { QuickAddModal } from '../QuickAddModal';
import { ExportImportModal } from '../ExportImportModal';
import { QuickSearch } from '../QuickSearch';
import { ProfileListSkeleton } from '../Skeleton';
import { VersionHistoryModal } from '../VersionHistoryModal';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PasswordList } from './PasswordList';
import { MobileBottomNav, MobileHeader, MobileDrawer } from './MobileNav';
import { ViewType, DashboardStats } from './types';

interface DashboardV2Props {
    isOpen: boolean;
    onClose: () => void;
    onLoadProfile: (profile: PasswordProfile) => void;
}

export function DashboardV2({ isOpen, onClose, onLoadProfile }: DashboardV2Props) {
    const { user, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();

    // Core state
    const [profiles, setProfiles] = useState<PasswordProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

    // View state
    const [activeView, setActiveView] = useState<ViewType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

    // UI state
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Modals
    const [showSettings, setShowSettings] = useState(false);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [showExportImport, setShowExportImport] = useState(false);
    const [showQuickSearch, setShowQuickSearch] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<PasswordProfile | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PasswordProfile | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [historyProfile, setHistoryProfile] = useState<PasswordProfile | null>(null);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            // Alt + N = Quick Add
            if (e.altKey && e.key === 'n') {
                e.preventDefault();
                setShowQuickAdd(true);
            }
            // Alt + B = Backup/Export
            if (e.altKey && e.key === 'b') {
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
    }, [isOpen, showQuickSearch, showQuickAdd, showExportImport, showSettings, selectedProfile, deleteTarget, isMobileMenuOpen, onClose]);

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

    // Filter profiles based on view and search
    const filteredProfiles = profiles.filter(profile => {
        // Filter by sidebar view
        if (activeView === 'secure' && profile.algorithm !== 'pbkdf2') return false;
        if (activeView === 'memorable' && profile.algorithm !== 'memorizable') return false;
        if (activeView === 'favorites' && !profile.favorite) return false;

        // Filter by tag
        if (selectedTagFilter && (!profile.tags || !profile.tags.includes(selectedTagFilter))) {
            return false;
        }

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                profile.site.toLowerCase().includes(query) ||
                profile.login.toLowerCase().includes(query) ||
                profile.tags?.some(tag => tag.toLowerCase().includes(query));
            if (!matchesSearch) return false;
        }

        return true;
    });

    // Collect all tags for the sidebar filter
    const allTags = profiles.flatMap(p => p.tags || []);

    // Stats
    const stats: DashboardStats = {
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
        // Only call onLoadProfile - it handles closing the dashboard with populated fields
        // Do NOT call onClose here as it would reset the fields we just populated
        onLoadProfile(profile);
    };

    const handleGenerate = async (profile: PasswordProfile) => {
        if (profile.id) {
            ProfileService.updateLastUsed(profile.id).catch(console.error);
        }
        setSelectedProfile(profile);
    };

    const handleViewChange = (view: ViewType) => {
        setActiveView(view);
        setSearchQuery('');
        setSelectedTagFilter(null);
    };

    const getViewTitle = () => {
        switch (activeView) {
            case 'favorites': return 'Favorites';
            case 'secure': return 'Secure';
            case 'memorable': return 'Memorable';
            default: return 'All Items';
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex overflow-hidden"
            style={{ background: 'var(--dashboard-bg)' }}
        >
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

            {/* Quick Search */}
            <QuickSearch
                isOpen={showQuickSearch}
                onClose={() => setShowQuickSearch(false)}
                profiles={profiles}
                onSelectProfile={handleEdit}
                onGeneratePassword={handleGenerate}
            />

            {/* Version History Modal */}
            <VersionHistoryModal
                profile={historyProfile}
                onClose={() => setHistoryProfile(null)}
                onRegenerateVersion={(modifiedProfile) => {
                    setHistoryProfile(null);
                    setSelectedProfile(modifiedProfile);
                }}
                onRotate={() => {
                    loadProfiles();
                    setHistoryProfile(null);
                }}
            />


            {/* Mobile Drawer */}
            <MobileDrawer
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                userEmail={user?.email || undefined}
                onSignOut={handleSignOut}
                onSettingsClick={() => setShowSettings(true)}
                stats={stats}
                activeView={activeView}
                onViewChange={handleViewChange}
                // Search Props
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                // Tag Props
                selectedTag={selectedTagFilter}
                onTagChange={setSelectedTagFilter}
                allTags={allTags}
            />

            {/* Desktop Sidebar */}
            <Sidebar
                activeView={activeView}
                onViewChange={handleViewChange}
                onSettingsClick={() => setShowSettings(true)}
                onSignOut={handleSignOut}
                onClose={onClose}
                stats={stats}
                userEmail={user?.email || undefined}
                selectedTagFilter={selectedTagFilter}
                onTagFilterChange={setSelectedTagFilter}
                allTags={profiles.flatMap(p => p.tags || [])}
                theme={theme}
                onThemeToggle={toggleTheme}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Mobile Header */}
                <MobileHeader
                    title={getViewTitle()}
                    subtitle={`${filteredProfiles.length} passwords`}
                    onMenuToggle={() => setIsMobileMenuOpen(true)}
                    onClose={onClose}
                    theme={theme}
                    onThemeToggle={toggleTheme}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                />

                {/* Desktop Header */}
                <div className="hidden md:block">
                    <Header
                        activeView={activeView}
                        profileCount={filteredProfiles.length}
                        onQuickSearch={() => setShowQuickSearch(true)}
                        onQuickAdd={() => setShowQuickAdd(true)}
                        onExportImport={() => setShowExportImport(true)}
                    />
                </div>

                {/* Password List */}
                <div className="flex-1 overflow-y-auto px-3 md:px-6 py-3 pb-24 md:pb-6">
                    {loading ? (
                        <ProfileListSkeleton count={6} />
                    ) : (
                        <PasswordList
                            profiles={filteredProfiles}
                            loading={false}
                            isEmpty={profiles.length === 0}
                            onGenerate={handleGenerate}
                            onEdit={handleEdit}
                            onDelete={setDeleteTarget}
                            onViewHistory={setHistoryProfile}
                            onProfilesChange={loadProfiles}
                        />
                    )}
                </div>
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
