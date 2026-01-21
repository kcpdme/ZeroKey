// app/components/dashboard/ProfileFilters.tsx
'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface ProfileFiltersProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    typeFilter?: 'all' | 'pbkdf2' | 'memorizable';
    onTypeFilterChange?: (filter: 'all' | 'pbkdf2' | 'memorizable') => void;
    hideTypeFilter?: boolean;
}

export function ProfileFilters({
    searchQuery,
    onSearchChange,
    typeFilter = 'all',
    onTypeFilterChange,
    hideTypeFilter = false
}: ProfileFiltersProps) {
    return (
        <div className="flex gap-4">
            <div className="flex-1 relative">
                <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{ color: 'var(--text-muted)' }}
                />
                <input
                    type="text"
                    placeholder="Search by site or login..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-all"
                    style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                    }}
                />
            </div>

            {!hideTypeFilter && onTypeFilterChange && (
                <div className="flex gap-2">
                    {(['all', 'pbkdf2', 'memorizable'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => onTypeFilterChange(type)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${typeFilter === type ? 'scale-105' : ''
                                }`}
                            style={{
                                background: typeFilter === type
                                    ? 'linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-500))'
                                    : 'var(--bg-secondary)',
                                color: typeFilter === type ? 'white' : 'var(--text-secondary)',
                                border: typeFilter === type ? 'none' : '1px solid var(--border-color)',
                            }}
                        >
                            {type === 'all' ? 'All' : type === 'pbkdf2' ? 'Secure' : 'Memorable'}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
