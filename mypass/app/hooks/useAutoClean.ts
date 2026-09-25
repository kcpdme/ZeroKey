'use client';

import { useEffect, useCallback, useRef } from 'react';

interface UseAutoCleanOptions {
    /** Inactivity timeout in milliseconds (default: 5 minutes) */
    inactivityTimeout?: number;
    /** Clipboard clear timeout in milliseconds (default: 30 seconds) */
    clipboardTimeout?: number;
    /** Whether to clear on window blur (default: false) */
    clearOnBlur?: boolean;
}

interface UseAutoCleanReturn {
    /** Call this when sensitive data changes to reset the inactivity timer */
    resetInactivityTimer: () => void;
    /** Call this after copying to clipboard to schedule clearing */
    scheduleClearClipboard: () => void;
}

/**
 * Hook to automatically clear sensitive data after inactivity or window blur.
 * Helps protect against leaving sensitive data in memory.
 */
export function useAutoClean(
    onClear: () => void,
    options: UseAutoCleanOptions = {}
): UseAutoCleanReturn {
    const {
        inactivityTimeout = 5 * 60 * 1000, // 5 minutes default
        clipboardTimeout = 30 * 1000, // 30 seconds default
        clearOnBlur = false,
    } = options;

    const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clipboardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clear all timers on unmount
    useEffect(() => {
        return () => {
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
            if (clipboardTimerRef.current) {
                clearTimeout(clipboardTimerRef.current);
            }
        };
    }, []);

    // Reset inactivity timer
    const resetInactivityTimer = useCallback(() => {
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }
        inactivityTimerRef.current = setTimeout(() => {
            onClear();
        }, inactivityTimeout);
    }, [onClear, inactivityTimeout]);

    // Schedule clipboard clearing
    const scheduleClearClipboard = useCallback(() => {
        if (clipboardTimeout <= 0) return;
        if (clipboardTimerRef.current) {
            clearTimeout(clipboardTimerRef.current);
        }
        clipboardTimerRef.current = setTimeout(async () => {
            try {
                await navigator.clipboard.writeText('');
            } catch {
                // Clipboard access may fail in some contexts, silently ignore
            }
        }, clipboardTimeout);
    }, [clipboardTimeout]);

    // Handle window blur
    useEffect(() => {
        if (!clearOnBlur) return;

        const handleBlur = () => {
            onClear();
        };

        window.addEventListener('blur', handleBlur);
        return () => window.removeEventListener('blur', handleBlur);
    }, [clearOnBlur, onClear]);

    // Set up activity listeners to reset timer
    useEffect(() => {
        const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];

        const handleActivity = () => {
            resetInactivityTimer();
        };

        events.forEach(event => {
            document.addEventListener(event, handleActivity, { passive: true });
        });

        // Start initial inactivity timer
        resetInactivityTimer();

        return () => {
            events.forEach(event => {
                document.removeEventListener(event, handleActivity);
            });
        };
    }, [resetInactivityTimer]);

    return {
        resetInactivityTimer,
        scheduleClearClipboard,
    };
}
