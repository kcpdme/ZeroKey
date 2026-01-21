// app/components/dashboard/GenerateModal.tsx
'use client';

import React, { useState } from 'react';
import { X, Globe, User, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { PasswordProfile } from '../../services/ProfileService';
import { generatePBKDF2Password, generateMemorizablePassword } from '../../lib/generators';

interface GenerateModalProps {
    profile: PasswordProfile | null;
    onClose: () => void;
}

export function GenerateModal({ profile, onClose }: GenerateModalProps) {
    const [masterPassword, setMasterPassword] = useState('');
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!profile) return null;

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            let password: string;

            if (profile.algorithm === 'pbkdf2') {
                if (!masterPassword) return;
                password = await generatePBKDF2Password({
                    masterPassword,
                    site: profile.site,
                    login: profile.login,
                    userSalt: profile.options.userSalt || '',
                    counter: profile.options.counter,
                    length: profile.options.length,
                    useSymbols: profile.options.useSymbols,
                    useNumbers: profile.options.useNumbers,
                    useUppercase: profile.options.useUppercase,
                    useLowercase: profile.options.useLowercase,
                });
            } else {
                password = generateMemorizablePassword(
                    { login: profile.login, site: profile.site },
                    { shift: profile.options.shift, magicNumber: profile.options.magicNumber }
                );
            }

            setGeneratedPassword(password);
            setPasswordVisible(false);
        } catch (error) {
            console.error('Generation failed:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = async () => {
        if (!generatedPassword) return;
        await navigator.clipboard.writeText(generatedPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = () => {
        setMasterPassword('');
        setGeneratedPassword('');
        setPasswordVisible(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div
                className="w-full max-w-md rounded-2xl p-6"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        Generate Password
                    </h2>
                    <button onClick={handleClose} style={{ color: 'var(--text-muted)' }}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Profile Info */}
                <div
                    className="rounded-xl p-4 mb-4"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <Globe className="w-5 h-5" style={{ color: 'var(--color-cyan-500)' }} />
                        <span style={{ color: 'var(--text-primary)' }}>{profile.site}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <User className="w-5 h-5" style={{ color: 'var(--color-cyan-500)' }} />
                        <span style={{ color: 'var(--text-primary)' }}>{profile.login}</span>
                    </div>
                </div>

                {/* Master Password Input (only for PBKDF2) */}
                {profile.algorithm === 'pbkdf2' && !generatedPassword && (
                    <div className="mb-4">
                        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                            Master Password
                        </label>
                        <input
                            type="password"
                            value={masterPassword}
                            onChange={(e) => setMasterPassword(e.target.value)}
                            placeholder="Enter your master password"
                            className="w-full px-4 py-3 rounded-xl outline-none"
                            style={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                            }}
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                        />
                    </div>
                )}

                {/* Generated Password Display */}
                {generatedPassword && (
                    <div
                        className="rounded-xl p-4 mb-4"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                    >
                        <div className="flex items-center justify-between">
                            <code
                                className="font-mono text-lg flex-1"
                                style={{ color: 'var(--color-cyan-500)' }}
                            >
                                {passwordVisible ? generatedPassword : '•'.repeat(Math.min(generatedPassword.length, 20))}
                            </code>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPasswordVisible(!passwordVisible)}
                                    className="p-2 rounded-lg"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    {passwordVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                                <button
                                    onClick={handleCopy}
                                    className="p-2 rounded-lg"
                                    style={{ color: copied ? 'var(--color-cyan-500)' : 'var(--text-muted)' }}
                                >
                                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    {!generatedPassword ? (
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || (profile.algorithm === 'pbkdf2' && !masterPassword)}
                            className="flex-1 py-3 rounded-xl font-medium transition-all disabled:opacity-50"
                            style={{
                                background: 'linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-500))',
                                color: 'white',
                            }}
                        >
                            {isGenerating ? 'Generating...' : 'Generate Password'}
                        </button>
                    ) : (
                        <button
                            onClick={handleClose}
                            className="flex-1 py-3 rounded-xl font-medium"
                            style={{
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                            }}
                        >
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
