// app/components/dashboard/ExpiryBadge.tsx
'use client';

import React from 'react';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { PasswordPolicy } from '../../services/ProfileService';

interface ExpiryBadgeProps {
    passwordPolicy?: PasswordPolicy;
    size?: 'sm' | 'md';
    showIcon?: boolean;
}

export function ExpiryBadge({ passwordPolicy, size = 'sm', showIcon = true }: ExpiryBadgeProps) {
    if (!passwordPolicy?.nextExpiryAt) return null;

    try {
        const expiryDate = passwordPolicy.nextExpiryAt.toDate
            ? passwordPolicy.nextExpiryAt.toDate()
            : new Date(passwordPolicy.nextExpiryAt);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        let status: 'expired' | 'warning' | 'ok';
        let text: string;
        let color: string;
        let bgColor: string;
        let Icon = CheckCircle;

        if (daysUntilExpiry < 0) {
            status = 'expired';
            text = 'Expired';
            color = '#ef4444';
            bgColor = 'rgba(239, 68, 68, 0.12)';
            Icon = AlertTriangle;
        } else if (daysUntilExpiry === 0) {
            status = 'expired';
            text = 'Expires today';
            color = '#ef4444';
            bgColor = 'rgba(239, 68, 68, 0.12)';
            Icon = AlertTriangle;
        } else if (daysUntilExpiry <= 7) {
            status = 'warning';
            text = `${daysUntilExpiry}d left`;
            color = '#f97316';
            bgColor = 'rgba(249, 115, 22, 0.12)';
            Icon = Clock;
        } else if (daysUntilExpiry <= 30) {
            status = 'warning';
            text = `${daysUntilExpiry}d`;
            color = '#eab308';
            bgColor = 'rgba(234, 179, 8, 0.12)';
            Icon = Clock;
        } else {
            // More than 30 days - don't show badge (password is fine)
            return null;
        }

        const sizeClasses = size === 'sm'
            ? 'px-1.5 py-0.5 text-[10px] gap-1'
            : 'px-2 py-1 text-xs gap-1.5';

        const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

        return (
            <span
                className={`inline-flex items-center font-semibold rounded ${sizeClasses}`}
                style={{
                    background: bgColor,
                    color: color,
                    border: `1px solid ${color}30`,
                }}
                title={`Password ${status === 'expired' ? 'expired' : `expires in ${daysUntilExpiry} days`}`}
            >
                {showIcon && <Icon className={iconSize} />}
                {text}
            </span>
        );
    } catch {
        return null;
    }
}

// Helper function to calculate days until expiry
export function getDaysUntilExpiry(passwordPolicy?: PasswordPolicy): number | null {
    if (!passwordPolicy?.nextExpiryAt) return null;

    try {
        const expiryDate = passwordPolicy.nextExpiryAt.toDate
            ? passwordPolicy.nextExpiryAt.toDate()
            : new Date(passwordPolicy.nextExpiryAt);
        const now = new Date();
        return Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    } catch {
        return null;
    }
}

// Check if password needs rotation
export function needsRotation(passwordPolicy?: PasswordPolicy): boolean {
    const days = getDaysUntilExpiry(passwordPolicy);
    return days !== null && days <= 0;
}

// Check if password is expiring soon
export function expiringSoon(passwordPolicy?: PasswordPolicy, withinDays: number = 7): boolean {
    const days = getDaysUntilExpiry(passwordPolicy);
    return days !== null && days > 0 && days <= withinDays;
}
