'use client';

import { AlertTriangle } from 'lucide-react';
import {
    explainMemorizablePassword,
    findMemorableCollisions,
    MemorableProfileRef,
} from '../lib/memorable-explain';

const EMPTY_PROFILES: MemorableProfileRef[] = [];

interface MemorableMemoryCardProps {
    login: string;
    site: string;
    shift: number;
    magicNumber: number;
    editingProfileId?: string | null;
    profiles?: MemorableProfileRef[];
}

export function MemorableMemoryCard({
    login,
    site,
    shift,
    magicNumber,
    editingProfileId,
    profiles = EMPTY_PROFILES,
}: MemorableMemoryCardProps) {
    const explanation = explainMemorizablePassword(login, site, shift, magicNumber);
    if (!explanation) return null;

    const collisions = findMemorableCollisions(
        {
            id: editingProfileId || undefined,
            site,
            login,
            shift: explanation.shift,
            magicNumber: explanation.magicNumber,
        },
        profiles
    );

    return (
        <div
            className="rounded-2xl p-4 space-y-3"
            style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
            }}
        >
            <div>
                <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Memory map
                </p>
                <p className="mt-1 text-base" style={{ color: 'var(--text-primary)' }}>
                    {explanation.story}
                </p>
                <p className="mt-1 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {explanation.river1}
                    {explanation.river2}
                    @{explanation.product}
                    {explanation.checksum}
                </p>
            </div>

            {explanation.warnings.map((warning) => (
                <div
                    key={warning.id}
                    role="status"
                    className="flex items-start gap-2 rounded-xl px-3 py-2 text-sm"
                    style={{
                        background: 'rgba(249, 115, 22, 0.1)',
                        color: '#fb923c',
                    }}
                >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{warning.message}</span>
                </div>
            ))}

            {collisions.length > 0 && (
                <div
                    role="status"
                    className="flex items-start gap-2 rounded-xl px-3 py-2 text-sm"
                    style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#f87171',
                    }}
                >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                        This password matches {collisions.map((hit) => `${hit.site} (${hit.login})`).join(', ')}. Memorable passwords only use the first letter of the login and one letter of the site, so different accounts often collide.
                    </span>
                </div>
            )}
        </div>
    );
}
