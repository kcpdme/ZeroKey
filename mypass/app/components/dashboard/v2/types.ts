// Dashboard V2 Types - Shared types for the redesigned dashboard

export interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    count?: number;
    color?: string;
}

export interface DashboardStats {
    total: number;
    secure: number;
    memorable: number;
    favorites: number;
}

export interface UserInfo {
    email: string;
    displayName?: string;
    photoUrl?: string;
}

export type ViewType = 'all' | 'favorites' | 'secure' | 'memorable';
export type SortOption = 'recent' | 'name' | 'type' | 'favorites';

export interface SortConfig {
    id: SortOption;
    label: string;
}

export const SORT_OPTIONS: SortConfig[] = [
    { id: 'recent', label: 'Most Recent' },
    { id: 'favorites', label: 'Favorites First' },
    { id: 'name', label: 'Name (A-Z)' },
    { id: 'type', label: 'Type' },
];
