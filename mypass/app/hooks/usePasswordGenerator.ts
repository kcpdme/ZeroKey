'use client';

import { useState, useCallback } from 'react';
import { generatePassword } from '../lib/password-generator';
import { OptionsState } from '../types';

interface UsePasswordGeneratorReturn {
    // Form state
    masterPassword: string;
    setMasterPassword: (value: string) => void;
    site: string;
    setSite: (value: string) => void;
    login: string;
    setLogin: (value: string) => void;
    userSalt: string;
    setUserSalt: (value: string) => void;
    options: OptionsState;
    handleOptionChange: <K extends keyof OptionsState>(key: K, value: OptionsState[K]) => void;

    // Generated password state
    generatedPassword: string;
    isLoading: boolean;
    error: string | null;
    isPasswordVisible: boolean;
    setIsPasswordVisible: (value: boolean) => void;

    // Copy state
    isCopied: boolean;

    // Actions
    handleGenerate: () => Promise<void>;
    handleCopy: () => Promise<void>;
    resetFields: () => void;

    // UI state
    showAdvanced: boolean;
    setShowAdvanced: (value: boolean) => void;

    // Validation
    canGenerate: boolean;
}

const DEFAULT_OPTIONS: OptionsState = {
    counter: 1,
    length: 16,
    useSymbols: true,
    useNumbers: true,
    useUppercase: true,
    useLowercase: true,
};

export function usePasswordGenerator(): UsePasswordGeneratorReturn {
    // Form inputs
    const [masterPassword, setMasterPassword] = useState<string>('');
    const [site, setSite] = useState<string>('');
    const [login, setLogin] = useState<string>('');
    const [userSalt, setUserSalt] = useState<string>('');
    const [options, setOptions] = useState<OptionsState>(DEFAULT_OPTIONS);

    // Password state
    const [generatedPassword, setGeneratedPassword] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
    const [isCopied, setIsCopied] = useState<boolean>(false);

    // UI state
    const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

    // Computed
    const canGenerate = Boolean(masterPassword && site && login && !isLoading);

    // Handle option changes
    const handleOptionChange = useCallback(<K extends keyof OptionsState>(
        key: K,
        value: OptionsState[K]
    ): void => {
        setOptions(prev => ({ ...prev, [key]: value }));
    }, []);

    // Generate password
    const handleGenerate = useCallback(async () => {
        if (!masterPassword || !site || !login) {
            setGeneratedPassword('');
            return;
        }

        setIsLoading(true);
        setGeneratedPassword('');
        setError(null);

        try {
            const password = await generatePassword({
                masterPassword,
                site,
                login,
                userSalt,
                ...options,
            });
            setGeneratedPassword(password);
            setIsPasswordVisible(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate password');
            setGeneratedPassword('');
        } finally {
            setIsLoading(false);
        }
    }, [masterPassword, site, login, userSalt, options]);

    // Copy to clipboard
    const handleCopy = useCallback(async (): Promise<void> => {
        if (!generatedPassword) return;

        try {
            await navigator.clipboard.writeText(generatedPassword);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch {
            // Fallback for older browsers or iframe environments
            const textArea = document.createElement('textarea');
            textArea.value = generatedPassword;
            textArea.style.position = 'fixed';
            textArea.style.top = '-9999px';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch (fallbackErr) {
                console.error('Unable to copy:', fallbackErr);
            }
            document.body.removeChild(textArea);
        }
    }, [generatedPassword]);

    // Reset all fields
    const resetFields = useCallback((): void => {
        setMasterPassword('');
        setSite('');
        setLogin('');
        setUserSalt('');
        setOptions(DEFAULT_OPTIONS);
        setGeneratedPassword('');
        setError(null);
        setShowAdvanced(false);
        setIsPasswordVisible(false);
        setIsCopied(false);
    }, []);

    return {
        // Form state
        masterPassword,
        setMasterPassword,
        site,
        setSite,
        login,
        setLogin,
        userSalt,
        setUserSalt,
        options,
        handleOptionChange,

        // Password state
        generatedPassword,
        isLoading,
        error,
        isPasswordVisible,
        setIsPasswordVisible,

        // Copy state
        isCopied,

        // Actions
        handleGenerate,
        handleCopy,
        resetFields,

        // UI state
        showAdvanced,
        setShowAdvanced,

        // Validation
        canGenerate,
    };
}
