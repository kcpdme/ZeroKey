'use client';

import React, { memo } from 'react';
import { Eye, EyeOff, Copy, Check, AlertCircle } from 'lucide-react';
import { PasswordDisplayProps } from '../types';

export const PasswordDisplay = memo<PasswordDisplayProps>(({
    password,
    isLoading,
    error,
    isVisible,
    onToggleVisibility,
    onCopy,
    isCopied,
}) => (
    <div className="pt-4">
        <div
            className="relative rounded-lg flex items-center h-16"
            style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--input-shadow, none)'
            }}
            role="region"
            aria-label="Generated password"
            aria-live="polite"
        >
            {/* Loading State */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <div
                            className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                            style={{ borderColor: 'var(--color-cyan-500)', borderTopColor: 'transparent' }}
                        />
                        <span>Generating...</span>
                    </div>
                </div>
            )}

            {/* Error State */}
            {!isLoading && error && (
                <div className="flex items-center gap-2 px-4 text-red-500">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{error}</span>
                </div>
            )}

            {/* Password Display */}
            {!isLoading && !error && password && (
                <>
                    <pre
                        className="flex-grow px-4 text-lg font-mono tracking-widest truncate"
                        style={{ color: 'var(--text-primary)' }}
                        aria-label={isVisible ? 'Password visible' : 'Password hidden'}
                    >
                        {isVisible ? password : '•'.repeat(password.length)}
                    </pre>
                    <div className="flex items-center h-full">
                        <button
                            onClick={onToggleVisibility}
                            className="p-4 h-full flex items-center justify-center transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                            aria-label={isVisible ? 'Hide password' : 'Show password'}
                            type="button"
                        >
                            {isVisible ? (
                                <EyeOff className="w-6 h-6" />
                            ) : (
                                <Eye className="w-6 h-6" />
                            )}
                        </button>
                        <button
                            onClick={onCopy}
                            className="p-4 h-full flex items-center justify-center transition-colors rounded-r-lg"
                            style={{
                                background: 'var(--bg-tertiary)',
                                color: isCopied ? '#22c55e' : 'var(--text-secondary)'
                            }}
                            aria-label={isCopied ? 'Copied!' : 'Copy password'}
                            type="button"
                        >
                            {isCopied ? (
                                <Check className="w-6 h-6" />
                            ) : (
                                <Copy className="w-6 h-6" />
                            )}
                        </button>
                    </div>
                </>
            )}

            {/* Empty State */}
            {!isLoading && !error && !password && (
                <div
                    className="flex-grow px-4 text-center"
                    style={{ color: 'var(--text-muted)' }}
                >
                    Press &apos;Generate&apos; to create a password
                </div>
            )}
        </div>
    </div>
));

PasswordDisplay.displayName = 'PasswordDisplay';
