// app/components/auth/AuthModal.tsx
'use client';

import React, { useState } from 'react';
import { X, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GoogleSignInButton } from './GoogleSignInButton';
import { EmailSignInForm } from './EmailSignInForm';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type AuthView = 'options' | 'email';

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail, authError } = useAuth();
    const [view, setView] = useState<AuthView>('options');
    const [loading, setLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            await signInWithGoogle();
            onClose();
        } catch {
            // Error handled in context
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSignIn = async (email: string, password: string) => {
        await signInWithEmail(email, password);
        onClose();
    };

    const handleEmailSignUp = async (email: string, password: string) => {
        await signUpWithEmail(email, password);
        onClose();
    };

    const handleClose = () => {
        setView('options');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6"
                style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)'
                }}
            >
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <div
                        className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                        style={{
                            background: 'linear-gradient(135deg, var(--color-cyan-400), var(--color-cyan-600))',
                        }}
                    >
                        <KeyRound className="w-7 h-7 text-white" />
                    </div>
                    <h2
                        className="text-2xl font-bold"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        {view === 'options' ? 'Welcome' : 'Email Sign In'}
                    </h2>
                    {view === 'options' && (
                        <p
                            className="text-sm mt-1"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            Sign in to sync your vault across devices
                        </p>
                    )}
                </div>

                {/* Content */}
                {view === 'options' ? (
                    <div className="space-y-3">
                        {/* Google Button */}
                        <GoogleSignInButton
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                        />

                        {/* Divider */}
                        <div className="flex items-center gap-4 my-4">
                            <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or</span>
                            <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
                        </div>

                        {/* Email Button */}
                        <button
                            onClick={() => setView('email')}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg font-medium transition-all hover:scale-[1.02]"
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                            }}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span>Continue with Email</span>
                        </button>
                    </div>
                ) : (
                    <EmailSignInForm
                        onSignIn={handleEmailSignIn}
                        onSignUp={handleEmailSignUp}
                        onBack={() => setView('options')}
                        error={authError}
                    />
                )}
            </div>
        </div>
    );
}
