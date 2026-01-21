// app/components/dashboard/types.ts
import { PasswordProfile } from '../../services/ProfileService';
import { UserSettings } from '../../services/SettingsService';

export interface DashboardContextValue {
    // Profiles
    profiles: PasswordProfile[];
    loading: boolean;
    filteredProfiles: PasswordProfile[];

    // Filters
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    typeFilter: 'all' | 'pbkdf2' | 'memorizable';
    setTypeFilter: (filter: 'all' | 'pbkdf2' | 'memorizable') => void;

    // Stats
    stats: {
        total: number;
        secure: number;
        memorable: number;
    };

    // Settings
    userSettings: UserSettings | null;
    setUserSettings: (settings: UserSettings) => void;

    // Actions
    loadProfiles: () => Promise<void>;
    deleteProfile: (id: string) => Promise<void>;

    // Modals
    selectedProfile: PasswordProfile | null;
    setSelectedProfile: (profile: PasswordProfile | null) => void;
    deleteTarget: PasswordProfile | null;
    setDeleteTarget: (profile: PasswordProfile | null) => void;
}

export interface ProfileCardProps {
    profile: PasswordProfile;
    onGenerate: (profile: PasswordProfile) => void;
    onEdit: (profile: PasswordProfile) => void;
    onDelete: (profile: PasswordProfile) => void;
}

export interface QuickAddFormProps {
    userId: string;
    userSettings: UserSettings | null;
    onSuccess: () => void;
}

export interface GenerateModalProps {
    profile: PasswordProfile | null;
    onClose: () => void;
}

export interface DeleteConfirmModalProps {
    profile: PasswordProfile | null;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    isDeleting: boolean;
}
