// app/components/dashboard/Skeleton.tsx
'use client';

import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
    className = '',
    variant = 'rectangular',
    width,
    height,
    animation = 'pulse'
}: SkeletonProps) {
    const baseStyles: React.CSSProperties = {
        background: 'var(--bg-tertiary)',
        borderRadius: variant === 'circular' ? '50%' : variant === 'text' ? '4px' : '8px',
        width: width || '100%',
        height: height || (variant === 'text' ? '1em' : '100%'),
    };

    return (
        <div
            className={`${animation === 'pulse' ? 'animate-skeleton-pulse' : ''} ${className}`}
            style={baseStyles}
            aria-hidden="true"
        />
    );
}

// Profile Row Skeleton
export function ProfileRowSkeleton() {
    return (
        <div
            className="flex items-center gap-4 px-4 py-3 rounded-xl"
            style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
            }}
        >
            {/* Favicon skeleton */}
            <Skeleton variant="circular" width={40} height={40} />

            {/* Site & Login */}
            <div className="flex-1 min-w-0 space-y-2">
                <Skeleton variant="text" width="60%" height={16} />
                <Skeleton variant="text" width="40%" height={12} />
            </div>

            {/* Type badge */}
            <Skeleton variant="rectangular" width={60} height={24} className="hidden sm:block" />

            {/* Details */}
            <div className="hidden md:flex items-center gap-2">
                <Skeleton variant="rectangular" width={50} height={16} />
                <Skeleton variant="rectangular" width={30} height={16} />
            </div>

            {/* Button */}
            <Skeleton variant="rectangular" width={90} height={32} className="rounded-lg" />
        </div>
    );
}

// Profile List Skeleton
export function ProfileListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: count }).map((_, i) => (
                <ProfileRowSkeleton key={i} />
            ))}
        </div>
    );
}

// Stats Skeleton
export function StatsSkeleton() {
    return (
        <div className="flex items-center gap-4 px-6 py-3" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
            {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                    <Skeleton variant="circular" width={32} height={32} />
                    <div className="space-y-1">
                        <Skeleton variant="text" width={40} height={20} />
                        <Skeleton variant="text" width={60} height={12} />
                    </div>
                </div>
            ))}
        </div>
    );
}

// Search Skeleton
export function SearchSkeleton() {
    return (
        <div className="px-6 py-4">
            <Skeleton variant="rectangular" width="100%" height={44} className="rounded-xl" />
        </div>
    );
}
