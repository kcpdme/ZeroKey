// app/components/dashboard/QuickAddForm.tsx
'use client';

import React, { useState } from 'react';
import { Shield, Sparkles, Eye, EyeOff, Copy, Check, RefreshCw } from 'lucide-react';
import { ProfileService } from '../../services/ProfileService';
import { SettingsService, UserSettings } from '../../services/SettingsService';
import { generatePBKDF2Password, generateMemorizablePassword } from '../../lib/generators';
import { QuickAddFormProps } from './types';

export function QuickAddForm({ userId, userSettings, onSuccess }: QuickAddFormProps) {
    const [site, setSite] = useState('');
    const [login, setLogin] = useState('');
    const [type, setType] = useState<'pbkdf2' | 'memorizable'>('pbkdf2');
    const [masterPass, setMasterPass] = useState('');
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [copied, setCopied] = useState(false);

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
    };

    return (
        <div
            className="rounded-2xl p-6"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
        >
            {!generatedPassword ? (
                <div className="space-y-5">
                    {/* Type Toggle */}
                    <div>
                        <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
                            Password Type
                        </label>
                        <div className="flex gap-3">
                            {(['pbkdf2', 'memorizable'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setType(t)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${type === t ? 'scale-[1.02]' : ''
                                        }`}
                                    style={{
                                        background: type === t
                                            ? 'linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-500))'
                                            : 'var(--bg-tertiary)',
                                        color: type === t ? 'white' : 'var(--text-secondary)',
                                        border: type === t ? 'none' : '1px solid var(--border-color)',
                                    }}
                                >
                                    {t === 'pbkdf2' ? <Shield className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                    {t === 'pbkdf2' ? 'Secure (PBKDF2)' : 'Memorable'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Site */}
                    <div>
                        <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
                            Website
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., google.com, facebook.com"
                            value={site}
                            onChange={(e) => setSite(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl outline-none"
                            style={{
                                background: 'var(--bg-input)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                            }}
                        />
                    </div>

                    {/* Login */}
                    <div>
                        <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
                            Login / Email
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., john@example.com"
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl outline-none"
                            style={{
                                background: 'var(--bg-input)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                            }}
                        />
                    </div>

                    {/* Master Password (PBKDF2 only) */}
                    {type === 'pbkdf2' && (
                        <div>
                            <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Master Password
                            </label>
                            <input
                                type="password"
                                placeholder="Your master password"
                                value={masterPass}
                                onChange={(e) => setMasterPass(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl outline-none"
                                style={{
                                    background: 'var(--bg-input)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)',
                                }}
                            />
                        </div>
                    )}

                    {/* Info box */}
                    <div
                        className="rounded-lg p-3 text-sm"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                    >
                        Using your default settings: Length {userSettings?.pbkdf2.defaultLength || 16},
                        Counter {userSettings?.pbkdf2.defaultCounter || 1}
                        {userSettings?.pbkdf2.defaultSalt && ', with your saved salt'}
                    </div>

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
                        {saving ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            'Generate & Save Password'
                        )}
                    </button>
                </div>
            ) : (
                <div className="space-y-5">
                    {/* Success Header */}
                    <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center bg-green-500/10">
                            <Check className="w-6 h-6 text-green-500" />
                        </div>
                        <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                            Password Generated!
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            Saved to vault: <strong>{site}</strong>
                        </p>
                    </div>

                    {/* Password Display */}
                    <div
                        className="flex items-center justify-between p-4 rounded-xl"
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
                    >
                        <code className="font-mono text-lg" style={{ color: 'var(--color-cyan-500)' }}>
                            {passwordVisible ? generatedPassword : '•'.repeat(Math.min(generatedPassword.length, 16))}
                        </code>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPasswordVisible(!passwordVisible)}
                                className="p-2 rounded-lg hover:bg-white/5"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                {passwordVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={handleCopy}
                                className="p-2 rounded-lg hover:bg-white/5"
                                style={{ color: copied ? 'var(--color-cyan-500)' : 'var(--text-muted)' }}
                            >
                                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Add Another */}
                    <button
                        onClick={reset}
                        className="w-full py-3 rounded-xl font-medium"
                        style={{
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        Add Another Password
                    </button>
                </div>
            )}
        </div>
    );
}
