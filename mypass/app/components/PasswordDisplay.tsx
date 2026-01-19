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
    <div className="pt-2">
        <div
            className="relative bg-slate-800 border border-slate-700 rounded-lg flex items-center h-16"
            role="region"
            aria-label="Generated password"
            aria-live="polite"
        >
            {/* Loading State */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-slate-400">
                        <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                        <span>Generating...</span>
                    </div>
                </div>
            )}

            {/* Error State */}
            {!isLoading && error && (
                <div className="flex items-center gap-2 px-4 text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{error}</span>
                </div>
            )}

            {/* Password Display */}
            {!isLoading && !error && password && (
                <>
                    <pre
                        className="flex-grow px-4 text-slate-200 text-lg font-mono tracking-widest truncate"
                        aria-label={isVisible ? 'Password visible' : 'Password hidden'}
                    >
                        {isVisible ? password : '•'.repeat(password.length)}
                    </pre>
                    <div className="flex items-center h-full">
                        <button
                            onClick={onToggleVisibility}
                            className="p-4 h-full flex items-center justify-center hover:bg-slate-700 transition-colors"
                            aria-label={isVisible ? 'Hide password' : 'Show password'}
                            type="button"
                        >
                            {isVisible ? (
                                <EyeOff className="w-6 h-6 text-slate-300" />
                            ) : (
                                <Eye className="w-6 h-6 text-slate-300" />
                            )}
                        </button>
                        <button
                            onClick={onCopy}
                            className="p-4 h-full flex items-center justify-center bg-slate-700 hover:bg-slate-600 transition-colors rounded-r-lg"
                            aria-label={isCopied ? 'Copied!' : 'Copy password'}
                            type="button"
                        >
                            {isCopied ? (
                                <Check className="w-6 h-6 text-green-400" />
                            ) : (
                                <Copy className="w-6 h-6 text-slate-300" />
                            )}
                        </button>
                    </div>
                </>
            )}

            {/* Empty State */}
            {!isLoading && !error && !password && (
                <div className="flex-grow px-4 text-slate-500 text-center">
                    Press &apos;Generate&apos; to create a password
                </div>
            )}
        </div>
    </div>
));

PasswordDisplay.displayName = 'PasswordDisplay';
