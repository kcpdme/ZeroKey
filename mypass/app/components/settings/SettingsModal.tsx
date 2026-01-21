// app/components/settings/SettingsModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, Shield, Sparkles, Save, RotateCcw } from 'lucide-react';
import { SettingsService, UserSettings } from '../../services/SettingsService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onSettingsSaved?: (settings: UserSettings) => void;
}

export function SettingsModal({ isOpen, onClose, userId, onSettingsSaved }: SettingsModalProps) {
    const [settings, setSettings] = useState<UserSettings>(SettingsService.getDefaultSettings());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'pbkdf2' | 'memorizable' | 'preferences'>('pbkdf2');

    useEffect(() => {
        if (isOpen && userId) {
            loadSettings();
        }
    }, [isOpen, userId]);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await SettingsService.getSettings(userId);
            setSettings(data);
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await SettingsService.saveSettings(userId, settings);
            onSettingsSaved?.(settings);
            onClose();
        } catch (error) {
            console.error('Failed to save settings:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setSettings(SettingsService.getDefaultSettings());
    };

    const updatePbkdf2 = (key: keyof UserSettings['pbkdf2'], value: any) => {
        setSettings(prev => ({
            ...prev,
            pbkdf2: { ...prev.pbkdf2, [key]: value }
        }));
    };

    const updateMemorizable = (key: keyof UserSettings['memorizable'], value: any) => {
        setSettings(prev => ({
            ...prev,
            memorizable: { ...prev.memorizable, [key]: value }
        }));
    };

    const updatePreferences = (key: keyof UserSettings['preferences'], value: any) => {
        setSettings(prev => ({
            ...prev,
            preferences: { ...prev.preferences, [key]: value }
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div
                className="w-full max-w-lg rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4 border-b"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}
                >
                    <div className="flex items-center gap-3">
                        <Settings className="w-5 h-5" style={{ color: 'var(--color-cyan-500)' }} />
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                            Default Settings
                        </h2>
                    </div>
                    <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
                    {[
                        { id: 'pbkdf2', label: 'Secure', icon: Shield },
                        { id: 'memorizable', label: 'Memorable', icon: Sparkles },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? '' : 'opacity-60'
                                }`}
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
                <div className="p-6 max-h-[400px] overflow-y-auto">
                    {loading ? (
                        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                            Loading settings...
                        </div>
                    ) : (
                        <>
                            {/* PBKDF2 Settings */}
                            {activeTab === 'pbkdf2' && (
                                <div className="space-y-5">
                                    {/* Default Salt */}
                                    <div>
                                        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                                            Default Salt
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.pbkdf2.defaultSalt}
                                            onChange={(e) => updatePbkdf2('defaultSalt', e.target.value)}
                                            placeholder="Your secret salt (optional)"
                                            className="w-full px-4 py-3 rounded-xl outline-none"
                                            style={{
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-color)',
                                                color: 'var(--text-primary)',
                                            }}
                                        />
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                            This will be used as the default salt for new passwords
                                        </p>
                                    </div>

                                    {/* Default Length */}
                                    <div>
                                        <label className="flex justify-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                                            <span>Default Length</span>
                                            <span style={{ color: 'var(--color-cyan-500)' }}>{settings.pbkdf2.defaultLength}</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="8"
                                            max="64"
                                            value={settings.pbkdf2.defaultLength}
                                            onChange={(e) => updatePbkdf2('defaultLength', parseInt(e.target.value))}
                                            className="w-full accent-cyan-500"
                                        />
                                    </div>

                                    {/* Default Counter */}
                                    <div>
                                        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                                            Default Counter (Version)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={settings.pbkdf2.defaultCounter}
                                            onChange={(e) => updatePbkdf2('defaultCounter', parseInt(e.target.value) || 1)}
                                            className="w-full px-4 py-3 rounded-xl outline-none"
                                            style={{
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-color)',
                                                color: 'var(--text-primary)',
                                            }}
                                        />
                                    </div>

                                    {/* Character Options */}
                                    <div>
                                        <label className="block text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                                            Default Character Types
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { key: 'useLowercase', label: 'Lowercase (a-z)' },
                                                { key: 'useUppercase', label: 'Uppercase (A-Z)' },
                                                { key: 'useNumbers', label: 'Numbers (0-9)' },
                                                { key: 'useSymbols', label: 'Symbols (!@#)' },
                                            ].map(option => (
                                                <label
                                                    key={option.key}
                                                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                                                    style={{
                                                        background: settings.pbkdf2[option.key as keyof typeof settings.pbkdf2]
                                                            ? 'var(--color-cyan-500)/10'
                                                            : 'var(--bg-secondary)',
                                                        border: '1px solid var(--border-color)',
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={settings.pbkdf2[option.key as keyof typeof settings.pbkdf2] as boolean}
                                                        onChange={(e) => updatePbkdf2(option.key as any, e.target.checked)}
                                                        className="w-4 h-4 accent-cyan-500"
                                                    />
                                                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                                        {option.label}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Memorizable Settings */}
                            {activeTab === 'memorizable' && (
                                <div className="space-y-5">
                                    {/* Default Shift */}
                                    <div>
                                        <label className="flex justify-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                                            <span>Default Shift</span>
                                            <span style={{ color: 'var(--color-cyan-500)' }}>{settings.memorizable.defaultShift}</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            value={settings.memorizable.defaultShift}
                                            onChange={(e) => updateMemorizable('defaultShift', parseInt(e.target.value))}
                                            className="w-full accent-cyan-500"
                                        />
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                            Shift value for the memorizable algorithm
                                        </p>
                                    </div>

                                    {/* Default Magic Number */}
                                    <div>
                                        <label className="flex justify-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                                            <span>Default Magic Number</span>
                                            <span style={{ color: 'var(--color-cyan-500)' }}>{settings.memorizable.defaultMagicNumber}</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="50"
                                            value={settings.memorizable.defaultMagicNumber}
                                            onChange={(e) => updateMemorizable('defaultMagicNumber', parseInt(e.target.value))}
                                            className="w-full accent-cyan-500"
                                        />
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                            Magic number for river selection
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div
                    className="flex items-center justify-between px-6 py-4 border-t"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}
                >
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset to Defaults
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-all disabled:opacity-50"
                        style={{
                            background: 'linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-500))',
                            color: 'white',
                        }}
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}
