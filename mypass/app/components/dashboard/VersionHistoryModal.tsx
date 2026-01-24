// app/components/dashboard/VersionHistoryModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X, History, Clock, RotateCcw, Shield, Sparkles, AlertTriangle, ChevronRight, KeyRound } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { PasswordProfile, VersionHistoryEntry, ProfileService } from '../../services/ProfileService';

interface VersionHistoryModalProps {
    profile: PasswordProfile | null;
    onClose: () => void;
    onRegenerateVersion: (profile: PasswordProfile, version: number) => void;
    onRotate: () => Promise<void>;
    onGenerateNew?: (profile: PasswordProfile) => void;
}

const ROTATION_REASONS = [
    { id: 'expired', label: 'Password expired' },
    { id: 'breach', label: 'Security breach' },
    { id: 'policy', label: 'Company policy' },
    { id: 'regular', label: 'Regular rotation' },
    { id: 'other', label: 'Other reason' },
];

export function VersionHistoryModal({
    profile,
    onClose,
    onRegenerateVersion,
    onRotate,
    onGenerateNew,
}: VersionHistoryModalProps) {
    const [isRotating, setIsRotating] = useState(false);
    const [showRotateForm, setShowRotateForm] = useState(false);
    const [rotateReason, setRotateReason] = useState('regular');
    const [expiryDays, setExpiryDays] = useState<number | undefined>(90);
    const [rotateSuccess, setRotateSuccess] = useState(false);

    // Reset state when profile changes (different profile opened)
    useEffect(() => {
        setRotateSuccess(false);
        setShowRotateForm(false);
        setRotateReason('regular');
        setExpiryDays(90);
    }, [profile?.id]);

    // Auto-hide success message after 5 seconds
    useEffect(() => {
        if (rotateSuccess) {
            const timer = setTimeout(() => setRotateSuccess(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [rotateSuccess]);

    if (!profile) return null;

    const isSecure = profile.algorithm === 'pbkdf2';
    const currentVersion = profile.options?.counter || 1;
    const history = profile.versionHistory || [];

    // Sort history by version descending (newest first)
    const sortedHistory = [...history].sort((a, b) => b.version - a.version);

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Unknown';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return format(date, 'MMM d, yyyy');
        } catch {
            return 'Unknown';
        }
    };

    const formatTimeAgo = (timestamp: any) => {
        if (!timestamp) return '';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return formatDistanceToNow(date, { addSuffix: true });
        } catch {
            return '';
        }
    };

    const handleRotate = async () => {
        if (!profile.id) return;
        setIsRotating(true);
        try {
            const reason = ROTATION_REASONS.find(r => r.id === rotateReason)?.label || 'Password rotated';
            await ProfileService.rotatePassword(profile.id, reason, expiryDays);
            setShowRotateForm(false);
            setRotateSuccess(true);
            // Call onRotate after showing success (this refreshes data)
            await onRotate();
            // Don't auto-hide - user can dismiss manually or click Generate
        } catch (error) {
            console.error('Failed to rotate password:', error);
        } finally {
            setIsRotating(false);
        }
    };

    const handleRegenerateOldVersion = (version: number) => {
        // Create a modified profile with the old version's counter
        const modifiedProfile = {
            ...profile,
            options: {
                ...profile.options,
                counter: version
            }
        };
        onRegenerateVersion(modifiedProfile, version);
    };

    // Calculate expiry status
    const getExpiryStatus = () => {
        if (!profile.passwordPolicy?.nextExpiryAt) return null;
        try {
            const expiryDate = profile.passwordPolicy.nextExpiryAt.toDate();
            const now = new Date();
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (daysUntilExpiry < 0) {
                return { status: 'expired', text: 'Expired', color: '#ef4444' };
            } else if (daysUntilExpiry <= 7) {
                return { status: 'warning', text: `Expires in ${daysUntilExpiry} days`, color: '#f97316' };
            } else {
                return { status: 'ok', text: `Expires in ${daysUntilExpiry} days`, color: '#22c55e' };
            }
        } catch {
            return null;
        }
    };

    const expiryStatus = getExpiryStatus();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
                style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                }}
            >
                {/* Header */}
                <div
                    className="px-6 py-4 border-b flex items-center justify-between"
                    style={{ borderColor: 'var(--border-color)' }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{
                                background: isSecure
                                    ? 'rgba(6, 182, 212, 0.12)'
                                    : 'rgba(168, 85, 247, 0.12)',
                            }}
                        >
                            <History
                                className="w-5 h-5"
                                style={{
                                    color: isSecure ? 'var(--sidebar-accent-cyan)' : 'var(--sidebar-accent-purple)'
                                }}
                            />
                        </div>
                        <div>
                            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                Version History
                            </h2>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                {profile.site} • {profile.login}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg transition-colors hover:bg-white/5"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Expiry Warning */}
                {expiryStatus && expiryStatus.status !== 'ok' && (
                    <div
                        className="mx-6 mt-4 px-4 py-3 rounded-lg flex items-center gap-3"
                        style={{
                            background: `${expiryStatus.color}15`,
                            border: `1px solid ${expiryStatus.color}30`,
                        }}
                    >
                        <AlertTriangle className="w-5 h-5" style={{ color: expiryStatus.color }} />
                        <span className="text-sm font-medium" style={{ color: expiryStatus.color }}>
                            {expiryStatus.text}
                        </span>
                    </div>
                )}

                {/* Current Version */}
                <div className="px-6 py-4">
                    <div
                        className="p-4 rounded-xl"
                        style={{
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                        }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span
                                    className="px-2 py-1 rounded-md text-xs font-bold"
                                    style={{
                                        background: isSecure ? 'rgba(6, 182, 212, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                                        color: isSecure ? 'var(--sidebar-accent-cyan)' : 'var(--sidebar-accent-purple)',
                                    }}
                                >
                                    v{currentVersion}
                                </span>
                                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                    Current Version
                                </span>
                            </div>
                            {isSecure && (
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {profile.options.length} chars
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                            <Clock className="w-3.5 h-3.5" />
                            <span>Last updated {formatTimeAgo(profile.updatedAt)}</span>
                        </div>

                        {/* Success Message with Generate Button */}
                        {rotateSuccess && (
                            <div
                                className="mt-3 p-3 rounded-lg relative"
                                style={{
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                }}
                            >
                                {/* Dismiss button */}
                                <button
                                    onClick={() => setRotateSuccess(false)}
                                    className="absolute top-2 right-2 p-1 rounded-full transition-colors hover:bg-white/10"
                                    style={{ color: '#22c55e' }}
                                    aria-label="Dismiss"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                                <p
                                    className="text-sm font-medium text-center mb-2 pr-6"
                                    style={{ color: '#22c55e' }}
                                >
                                    ✓ Password rotated to v{currentVersion}!
                                </p>
                                {onGenerateNew && (
                                    <button
                                        onClick={() => {
                                            onClose();
                                            onGenerateNew(profile);
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
                                        style={{
                                            background: 'var(--btn-primary-gradient)',
                                            color: 'white',
                                        }}
                                    >
                                        <KeyRound className="w-4 h-4" />
                                        Generate v{currentVersion} Password
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Rotate Button */}
                        {!showRotateForm ? (
                            <button
                                onClick={() => setShowRotateForm(true)}
                                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
                                style={{
                                    background: 'var(--btn-primary-gradient)',
                                    color: 'white',
                                }}
                            >
                                <RotateCcw className="w-4 h-4" />
                                Rotate to v{currentVersion + 1}
                            </button>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {/* Reason Select */}
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                                        Reason for rotation
                                    </label>
                                    <select
                                        value={rotateReason}
                                        onChange={(e) => setRotateReason(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg text-sm"
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--border-color)',
                                        }}
                                    >
                                        {ROTATION_REASONS.map(r => (
                                            <option key={r.id} value={r.id}>{r.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Expiry Days */}
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                                        New password expires in (days)
                                    </label>
                                    <input
                                        type="number"
                                        value={expiryDays || ''}
                                        onChange={(e) => setExpiryDays(e.target.value ? parseInt(e.target.value) : undefined)}
                                        placeholder="90"
                                        className="w-full px-3 py-2 rounded-lg text-sm"
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--border-color)',
                                        }}
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowRotateForm(false)}
                                        className="flex-1 py-2 rounded-lg text-sm font-medium"
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-secondary)',
                                            border: '1px solid var(--border-color)',
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleRotate}
                                        disabled={isRotating}
                                        className="flex-1 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] disabled:opacity-50"
                                        style={{
                                            background: 'var(--btn-primary-gradient)',
                                            color: 'white',
                                        }}
                                    >
                                        {isRotating ? 'Rotating...' : 'Rotate Now'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* History Timeline */}
                <div className="px-6 pb-6">
                    <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                        Previous Versions
                    </h3>

                    {sortedHistory.length === 0 ? (
                        <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
                            No previous versions yet
                        </p>
                    ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {sortedHistory.map((entry, index) => (
                                <div
                                    key={`${entry.version}-${index}`}
                                    className="p-3 rounded-lg flex items-center justify-between group"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--border-color)',
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className="px-2 py-0.5 rounded text-xs font-medium"
                                            style={{
                                                background: 'var(--sidebar-count-bg)',
                                                color: 'var(--text-secondary)',
                                            }}
                                        >
                                            v{entry.version}
                                        </span>
                                        <div>
                                            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                                {entry.reason || 'Version created'}
                                            </p>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                {formatDate(entry.changedAt)}
                                                {entry.length && ` • ${entry.length} chars`}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRegenerateOldVersion(entry.version)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1"
                                        style={{
                                            background: 'var(--sidebar-count-bg)',
                                            color: 'var(--text-secondary)',
                                        }}
                                        title="Regenerate this version's password"
                                    >
                                        Regenerate
                                        <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
