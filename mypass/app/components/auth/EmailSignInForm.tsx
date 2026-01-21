// app/components/auth/EmailSignInForm.tsx
'use client';

import React, { useState } from 'react';
import { Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface EmailSignInFormProps {
    onSignIn: (email: string, password: string) => Promise<void>;
    onSignUp: (email: string, password: string) => Promise<void>;
    onBack: () => void;
    error?: string | null;
}

export function EmailSignInForm({ onSignIn, onSignUp, onBack, error }: EmailSignInFormProps) {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        if (!email || !password) {
            setLocalError('Please fill in all fields');
            return;
        }

        if (isSignUp && password !== confirmPassword) {
            setLocalError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setLocalError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                await onSignUp(email, password);
            } else {
                await onSignIn(email, password);
            }
        } catch {
            // Error handled by parent
        } finally {
            setLoading(false);
        }
    };

    const displayError = localError || error;

    return (
        <div className="space-y-4">
            {/* Back Button */}
            <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 text-sm transition-colors"
                style={{ color: 'var(--text-secondary)' }}
            >
                <ArrowLeft className="w-4 h-4" />
                Back to options
            </button>

            {/* Title */}
            <h3
                className="text-xl font-semibold text-center"
                style={{ color: 'var(--text-primary)' }}
            >
                {isSignUp ? 'Create Account' : 'Sign In with Email'}
            </h3>

            {/* Error Display */}
            {displayError && (
                <div className="p-3 rounded-lg text-sm text-red-500 bg-red-500/10 border border-red-500/20">
                    {displayError}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div className="relative">
                    <Mail
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                        style={{ color: 'var(--text-muted)' }}
                    />
                    <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-lg outline-none transition-all"
                        style={{
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                        }}
                        autoComplete="email"
                    />
                </div>

                {/* Password */}
                <div className="relative">
                    <Lock
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                        style={{ color: 'var(--text-muted)' }}
                    />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 pr-11 py-3 rounded-lg outline-none transition-all"
                        style={{
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                        }}
                        autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>

                {/* Confirm Password (Sign Up only) */}
                {isSignUp && (
                    <div className="relative">
                        <Lock
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                            style={{ color: 'var(--text-muted)' }}
                        />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-lg outline-none transition-all"
                            style={{
                                background: 'var(--bg-input)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                            }}
                            autoComplete="new-password"
                        />
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-lg font-medium transition-all hover:scale-[1.02] disabled:opacity-50"
                    style={{
                        background: 'linear-gradient(135deg, var(--color-cyan-600), var(--color-cyan-500))',
                        color: 'white',
                    }}
                >
                    {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
                </button>
            </form>

            {/* Toggle Sign In / Sign Up */}
            <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                    type="button"
                    onClick={() => {
                        setIsSignUp(!isSignUp);
                        setLocalError(null);
                    }}
                    className="font-medium underline"
                    style={{ color: 'var(--color-cyan-500)' }}
                >
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
            </p>
        </div>
    );
}
