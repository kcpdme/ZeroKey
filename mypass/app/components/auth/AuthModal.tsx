// app/components/auth/AuthModal.tsx
'use client';

import React, { useState, useId, useEffect } from 'react';
import {
    X,
    ShieldIcon,
    MailIcon,
    LockIcon,
    AlertCircleIcon,
    ArrowRightIcon,
    EyeIcon,
    EyeOffIcon,
    Loader2Icon,
    KeyRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ZeroKeyLogo } from '../ui/ZeroKeyLogo';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type AuthView = 'options' | 'email';

const featurePoints = [
    'Your passwords are derived, never stored.',
    'One master key unlocks every site.',
    'Works the same on any device, offline.',
];

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail, authError, clearError } = useAuth();
    const [view, setView] = useState<AuthView>('options');
    const [loading, setLoading] = useState(false);

    // Email form state
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const emailId = useId();
    const passwordId = useId();
    const confirmId = useId();

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setView('options');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setShowPassword(false);
            setLocalError(null);
            setIsSignUp(false);
            setLoading(false);
            clearError();
        }
    }, [isOpen, clearError]);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setLocalError(null);
        try {
            await signInWithGoogle();
            onClose();
        } catch {
            // Error handled in context
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        if (!email || !password) {
            setLocalError('Please fill in all fields');
            return;
        }
        if (password.length < 6) {
            setLocalError('Password must be at least 6 characters');
            return;
        }
        if (isSignUp && password !== confirmPassword) {
            setLocalError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                await signUpWithEmail(email, password);
            } else {
                await signInWithEmail(email, password);
            }
            onClose();
        } catch {
            // Error handled in context
        } finally {
            setLoading(false);
        }
    };

    const displayError = localError || authError;

    if (!isOpen) return null;

    return (
        <div
            className="auth-fullscreen fixed inset-0 z-50 grid min-h-screen w-full lg:grid-cols-2 overflow-y-auto"
            style={{ background: 'var(--bg-primary)' }}
        >
            {/* Close / Skip back Button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 z-20 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105"
                style={{
                    color: 'var(--text-muted)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                }}
                aria-label="Close sign in"
            >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Close</span>
            </button>

            {/* ─── Left Branding Section (desktop alt design) ─── */}
            <section
                className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex"
                style={{
                    background: 'var(--bg-secondary)',
                    borderRight: '1px solid var(--border-color)',
                }}
            >
                {/* Brand Logo */}
                <div className="flex items-center gap-2.5">
                    <ZeroKeyLogo 
                        className="h-7 w-7" 
                        style={{ color: 'var(--color-cyan-500)' }} 
                    />
                    <span
                        className="text-base font-bold tracking-tight"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        ZeroKey
                    </span>
                </div>

                {/* Hero Title and Bullets */}
                <div className="max-w-md my-auto">
                    <h1
                        className="text-4xl font-semibold leading-tight tracking-tight"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        The password you need,
                        <br />
                        <span style={{ color: 'var(--color-cyan-500)' }}>
                            recreated on the spot.
                        </span>
                    </h1>
                    <ul className="mt-8 space-y-3.5">
                        {featurePoints.map((point, i) => (
                            <li
                                key={point}
                                className="auth-point-enter flex items-start gap-3 text-sm"
                                style={{
                                    color: 'var(--text-secondary)',
                                    animationDelay: `${0.1 + i * 0.08}s`,
                                }}
                            >
                                <span
                                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                                    style={{ background: 'var(--color-cyan-500)' }}
                                />
                                {point}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Monospace Footer Note */}
                <p
                    className="font-mono text-xs"
                    style={{ color: 'var(--text-muted)' }}
                >
                    master key + site + login → the same password, every time
                </p>
            </section>

            {/* ─── Right Form Section (alt design) ─── */}
            <section className="flex items-center justify-center px-5 py-14 min-h-screen">
                <div className="auth-content-enter w-full max-w-sm">
                    {/* Header */}
                    <div className="mb-8 text-center lg:text-left">
                        {/* Mobile Logo & Brand */}
                        <div className="flex items-center justify-center gap-2.5 mb-6 lg:hidden">
                            <ZeroKeyLogo 
                                className="w-8 h-8" 
                                style={{ color: 'var(--color-cyan-500)' }} 
                            />
                            <span
                                className="text-xl font-bold tracking-tight"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                ZeroKey
                            </span>
                        </div>

                        <h2
                            className="text-2xl font-semibold tracking-tight"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            {view === 'email'
                                ? isSignUp
                                    ? 'Create account'
                                    : 'Welcome back'
                                : 'Welcome back'}
                        </h2>
                        <p
                            className="mt-1.5 text-sm"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            {view === 'email'
                                ? isSignUp
                                    ? 'Create an account to sync your vault across devices.'
                                    : 'Sign in to reach your saved profiles. Generating works without an account too.'
                                : 'Sign in to reach your saved profiles. Generating works without an account too.'}
                        </p>
                    </div>

                    {/* Error Display */}
                    {displayError && (
                        <div
                            role="alert"
                            className="mb-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm"
                            style={{
                                border: '1px solid rgba(220, 38, 38, 0.3)',
                                background: 'rgba(220, 38, 38, 0.1)',
                                color: '#f87171',
                            }}
                        >
                            <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                            {displayError}
                        </div>
                    )}

                    {/* ─── Options View ─── */}
                    {view === 'options' ? (
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl font-medium transition-all duration-150 h-12 px-6 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    background: 'linear-gradient(135deg, var(--color-cyan-500), var(--color-cyan-600))',
                                    color: 'white',
                                    boxShadow: '0 1px 2px rgb(0 0 0 / 0.06), 0 8px 24px -12px rgb(0 0 0 / 0.25)',
                                }}
                            >
                                {loading ? (
                                    <Loader2Icon className="h-4 w-4 animate-spin" />
                                ) : (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="rgba(255,255,255,0.7)" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="rgba(255,255,255,0.5)" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="rgba(255,255,255,0.85)" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                )}
                                Continue with Google
                            </button>

                            <button
                                type="button"
                                onClick={() => setView('email')}
                                className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl font-medium transition-all duration-150 h-12 px-6 text-base"
                                style={{
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                }}
                            >
                                <MailIcon className="h-4 w-4" />
                                Continue with email
                            </button>

                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors duration-200"
                                style={{ color: 'var(--text-muted)' }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-cyan-500)')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                            >
                                Skip and just generate
                                <ArrowRightIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        /* ─── Email Form View ─── */
                        <form onSubmit={handleEmailSubmit} className="space-y-4">
                            {/* Email Field */}
                            <div className="w-full">
                                <label
                                    htmlFor={emailId}
                                    className="mb-1.5 block text-xs font-medium uppercase tracking-wide"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    Email
                                </label>
                                <div
                                    className="field-box flex items-center gap-2 rounded-xl px-3 transition-colors border"
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        borderColor: 'var(--border-color)',
                                    }}
                                >
                                    <span style={{ color: 'var(--text-muted)' }}>
                                        <MailIcon className="h-4 w-4" />
                                    </span>
                                    <input
                                        id={emailId}
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@company.com"
                                        className="auth-input h-11 w-full bg-transparent text-sm"
                                        style={{ color: 'var(--text-primary)' }}
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="w-full">
                                <label
                                    htmlFor={passwordId}
                                    className="mb-1.5 block text-xs font-medium uppercase tracking-wide"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    Password
                                </label>
                                <div
                                    className="field-box flex items-center gap-2 rounded-xl px-3 transition-colors border"
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        borderColor: 'var(--border-color)',
                                    }}
                                >
                                    <span style={{ color: 'var(--text-muted)' }}>
                                        <LockIcon className="h-4 w-4" />
                                    </span>
                                    <input
                                        id={passwordId}
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="At least 6 characters"
                                        className="auth-input h-11 w-full bg-transparent text-sm"
                                        style={{ color: 'var(--text-primary)' }}
                                        autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((r) => !r)}
                                        className="rounded-md p-1 transition-colors shrink-0"
                                        style={{ color: 'var(--text-muted)' }}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
                                            <EyeOffIcon className="h-4 w-4" />
                                        ) : (
                                            <EyeIcon className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password (Sign Up) */}
                            {isSignUp && (
                                <div className="w-full">
                                    <label
                                        htmlFor={confirmId}
                                        className="mb-1.5 block text-xs font-medium uppercase tracking-wide"
                                        style={{ color: 'var(--text-muted)' }}
                                    >
                                        Confirm Password
                                    </label>
                                    <div
                                        className="field-box flex items-center gap-2 rounded-xl px-3 transition-colors border"
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            borderColor: 'var(--border-color)',
                                        }}
                                    >
                                        <span style={{ color: 'var(--text-muted)' }}>
                                            <LockIcon className="h-4 w-4" />
                                        </span>
                                        <input
                                            id={confirmId}
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter your password"
                                            className="auth-input h-11 w-full bg-transparent text-sm"
                                            style={{ color: 'var(--text-primary)' }}
                                            autoComplete="new-password"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl font-medium transition-all duration-150 h-12 px-6 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    background: 'linear-gradient(135deg, var(--color-cyan-500), var(--color-cyan-600))',
                                    color: 'white',
                                    boxShadow: '0 1px 2px rgb(0 0 0 / 0.06), 0 8px 24px -12px rgb(0 0 0 / 0.25)',
                                }}
                            >
                                {loading && <Loader2Icon className="h-4 w-4 animate-spin" />}
                                {loading
                                    ? 'Please wait...'
                                    : isSignUp
                                        ? 'Create Account'
                                        : 'Sign in'}
                            </button>

                            {/* Toggle Sign In / Sign Up */}
                            <p
                                className="text-center text-sm"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsSignUp(!isSignUp);
                                        setLocalError(null);
                                        clearError();
                                    }}
                                    className="font-medium underline transition-colors"
                                    style={{ color: 'var(--color-cyan-500)' }}
                                >
                                    {isSignUp ? 'Sign In' : 'Sign Up'}
                                </button>
                            </p>

                            {/* Back to options */}
                            <button
                                type="button"
                                onClick={() => {
                                    setView('options');
                                    setLocalError(null);
                                    clearError();
                                }}
                                className="w-full py-1 text-sm transition-colors"
                                style={{ color: 'var(--text-muted)' }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                            >
                                Back to all options
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </div>
    );
}
