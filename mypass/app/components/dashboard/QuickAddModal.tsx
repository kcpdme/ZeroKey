// app/components/dashboard/QuickAddModal.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, Sparkles, Eye, EyeOff, Copy, Check, RefreshCw } from 'lucide-react';
import { ProfileService } from '../../services/ProfileService';
import { SettingsService, UserSettings } from '../../services/SettingsService';
import { generatePBKDF2Password, generateMemorizablePassword } from '../../lib/generators';
import { TagSelector } from './TagSelector';

interface QuickAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userSettings: UserSettings | null;
    onSuccess: () => void;
}

export function QuickAddModal({ isOpen, onClose, userId, userSettings, onSuccess }: QuickAddModalProps) {
    const [site, setSite] = useState('');
    const [login, setLogin] = useState('');
    const [type, setType] = useState<'pbkdf2' | 'memorizable'>('pbkdf2');
    const [masterPass, setMasterPass] = useState('');
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [copied, setCopied] = useState(false);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const siteInputRef = useRef<HTMLInputElement>(null);

    // Focus on open
    useEffect(() => {
        if (isOpen && siteInputRef.current) {
            setTimeout(() => siteInputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Keyboard shortcut handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleGenerate = async () => {
        if (!site || !login) return;
        if (type === 'pbkdf2' && !masterPass) return;

        setSaving(true);
        try {
            const settings = userSettings || SettingsService.getDefaultSettings();
            let password: string;
            let options: any;

            if (type === 'pbkdf2') {
                options = {
                    length: settings.pbkdf2.defaultLength,
                    counter: settings.pbkdf2.defaultCounter,
                    useLowercase: settings.pbkdf2.useLowercase,
                    useUppercase: settings.pbkdf2.useUppercase,
                    useNumbers: settings.pbkdf2.useNumbers,
                    useSymbols: settings.pbkdf2.useSymbols,
                    userSalt: settings.pbkdf2.defaultSalt,
                };

                password = await generatePBKDF2Password({
                    masterPassword: masterPass,
                    site,
                    login,
                    ...options,
                });
            } else {
                options = {
                    shift: settings.memorizable.defaultShift,
                    magicNumber: settings.memorizable.defaultMagicNumber,
                };

                password = generateMemorizablePassword(
                    { login, site },
                    options
                );
            }

            // Save to database
            await ProfileService.saveProfile({
                userId,
                site,
                login,
                algorithm: type,
                options,
                ...(selectedTags.length > 0 && { tags: selectedTags }),
            });

            setGeneratedPassword(password);
            onSuccess();

        } catch (error) {
            console.error('Quick add failed:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleCopy = async () => {
        if (!generatedPassword) return;
        await navigator.clipboard.writeText(generatedPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const reset = () => {
        setSite('');
        setLogin('');
        setMasterPass('');
        setGeneratedPassword('');
        setPasswordVisible(false);
        setSelectedTags([]);
    };

    const handleClose = () => {
        reset();
        onClose();
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
                        Quick Add Password
                    </h2>
                    <button onClick={handleClose} style={{ color: 'var(--text-muted)' }}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {!generatedPassword ? (
                        <div className="space-y-4">
                            {/* Type Toggle */}
                            <div className="flex gap-2">
                                {(['pbkdf2', 'memorizable'] as const).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setType(t)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all`}
                                        style={{
                                            background: type === t
                                                ? 'linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-500))'
                                                : 'var(--bg-secondary)',
                                            color: type === t ? 'white' : 'var(--text-secondary)',
                                            border: type === t ? 'none' : '1px solid var(--border-color)',
                                        }}
                                    >
                                        {t === 'pbkdf2' ? <Shield className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                        {t === 'pbkdf2' ? 'Secure' : 'Memorable'}
                                    </button>
                                ))}
                            </div>

                            {/* Site */}
                            <input
                                ref={siteInputRef}
                                type="text"
                                placeholder="Website (e.g., google.com)"
                                value={site}
                                onChange={(e) => setSite(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl outline-none"
                                style={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)',
                                }}
                            />

                            {/* Login */}
                            <input
                                type="text"
                                placeholder="Login / Email"
                                value={login}
                                onChange={(e) => setLogin(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl outline-none"
                                style={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)',
                                }}
                            />

                            {/* Master Password */}
                            {type === 'pbkdf2' && (
                                <input
                                    type="password"
                                    placeholder="Master Password"
                                    value={masterPass}
                                    onChange={(e) => setMasterPass(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                                    className="w-full px-4 py-3 rounded-xl outline-none"
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                            )}

                            {/* Tags */}
                            <TagSelector
                                selectedTags={selectedTags}
                                onChange={setSelectedTags}
                                showLabel={true}
                                maxTags={3}
                            />

                            {/* Generate Button */}
                            <button
                                onClick={handleGenerate}
                                disabled={saving || !site || !login || (type === 'pbkdf2' && !masterPass)}
                                className="w-full py-3 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{
                                    background: 'linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-500))',
                                    color: 'white',
                                }}
                            >
                                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                                {saving ? 'Generating...' : 'Generate & Save'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Success */}
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center bg-green-500/10">
                                    <Check className="w-6 h-6 text-green-500" />
                                </div>
                                <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                    Password Created!
                                </h3>
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                    Saved: <strong>{site}</strong>
                                </p>
                            </div>

                            {/* Password Display */}
                            <div
                                className="flex items-center justify-between p-4 rounded-xl"
                                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                            >
                                <code className="font-mono" style={{ color: 'var(--color-cyan-500)' }}>
                                    {passwordVisible ? generatedPassword : '•'.repeat(Math.min(generatedPassword.length, 16))}
                                </code>
                                <div className="flex gap-2">
                                    <button onClick={() => setPasswordVisible(!passwordVisible)} style={{ color: 'var(--text-muted)' }}>
                                        {passwordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <button onClick={handleCopy} style={{ color: copied ? 'var(--color-cyan-500)' : 'var(--text-muted)' }}>
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={reset}
                                    className="flex-1 py-2.5 rounded-xl font-medium"
                                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                                >
                                    Add Another
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="flex-1 py-2.5 rounded-xl font-medium"
                                    style={{
                                        background: 'linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-500))',
                                        color: 'white',
                                    }}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
