// app/components/dashboard/ExportImportModal.tsx
'use client';

import React, { useState, useRef } from 'react';
import { X, Download, Upload, Check, AlertTriangle, FileJson } from 'lucide-react';
import { ProfileService, PasswordProfile } from '../../services/ProfileService';
import { buildBackup, parseBackup } from '../../lib/backup';

interface ExportImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    profiles: PasswordProfile[];
    onImportComplete: () => void;
}

export function ExportImportModal({
    isOpen,
    onClose,
    userId,
    profiles,
    onImportComplete
}: ExportImportModalProps) {
    const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const exportableCount = profiles.filter((profile) => !profile.id?.startsWith('seed-')).length;

    const handleExport = () => {
        const exportData = buildBackup(profiles);

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zerokey-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setError(null);
        setImportResult(null);

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const parsed = parseBackup(data);

            let success = 0;
            let failed = parsed.invalid;

            for (const profile of parsed.profiles) {
                try {
                    await ProfileService.importProfile(userId, profile);
                    success++;
                } catch {
                    failed++;
                }
            }

            setImportResult({ success, failed });
            onImportComplete();
        } catch (err: any) {
            setError(err.message || 'Failed to import file');
        } finally {
            setImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div
                className="w-full max-w-md rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4 border-b"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}
                >
                    <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                        Backup & Restore
                    </h2>
                    <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
                    {[
                        { id: 'export', label: 'Export', icon: Download },
                        { id: 'import', label: 'Import', icon: Upload },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id as any);
                                setError(null);
                                setImportResult(null);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors"
                            style={{
                                color: activeTab === tab.id ? 'var(--color-cyan-500)' : 'var(--text-secondary)',
                                borderBottom: activeTab === tab.id ? '2px solid var(--color-cyan-500)' : '2px solid transparent',
                            }}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-6">
                    {activeTab === 'export' ? (
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-cyan-500/10">
                                <FileJson className="w-8 h-8" style={{ color: 'var(--color-cyan-500)' }} />
                            </div>
                            <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                                Export Passwords
                            </h3>
                            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                                Download a JSON backup of your {exportableCount} saved profiles.
                                <br /><strong>Note:</strong> Master password is never stored or exported.
                            </p>
                            <button
                                onClick={handleExport}
                                className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                                style={{
                                    background: 'linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-500))',
                                    color: 'white',
                                }}
                            >
                                <Download className="w-4 h-4" />
                                Download Backup
                            </button>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-cyan-500/10">
                                <Upload className="w-8 h-8" style={{ color: 'var(--color-cyan-500)' }} />
                            </div>
                            <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                                Import Passwords
                            </h3>
                            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                                Restore from a previously exported JSON backup file.
                            </p>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {!importResult && !error && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={importing}
                                    className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-color)',
                                    }}
                                >
                                    {importing ? 'Importing...' : 'Select Backup File'}
                                </button>
                            )}

                            {importResult && (
                                <div
                                    className="p-4 rounded-xl text-left"
                                    style={{ background: 'var(--bg-secondary)' }}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <Check className="w-5 h-5 text-green-500" />
                                        <span style={{ color: 'var(--text-primary)' }}>Import Complete</span>
                                    </div>
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                        ✓ {importResult.success} profiles imported
                                        {importResult.failed > 0 && ` • ${importResult.failed} failed`}
                                    </p>
                                </div>
                            )}

                            {error && (
                                <div
                                    className="p-4 rounded-xl text-left flex items-start gap-2"
                                    style={{ background: 'rgba(239, 68, 68, 0.1)' }}
                                >
                                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                                    <p className="text-sm text-red-500">{error}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
