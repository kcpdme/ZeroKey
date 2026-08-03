'use client';

import { useState, useCallback } from 'react';
import {
    GeneratorType,
    generatePBKDF2Password,
    generateMemorizablePassword,
    DEFAULT_MEMORIZABLE_OPTIONS
} from '../lib/generators';
import { OptionsState } from '../types';
import { MemorizableOptionsState } from '../components/MemorizableOptions';

interface UsePasswordGeneratorReturn {
    // Algorithm selection
    algorithm: GeneratorType;
    setAlgorithm: (algorithm: GeneratorType) => void;

    // Form state
    masterPassword: string;
    setMasterPassword: (value: string) => void;
    site: string;
    setSite: (value: string) => void;
    login: string;
    setLogin: (value: string) => void;
    userSalt: string;
    setUserSalt: (value: string) => void;

    // PBKDF2 options
    options: OptionsState;
    setOptions: (options: OptionsState) => void;
    handleOptionChange: <K extends keyof OptionsState>(key: K, value: OptionsState[K]) => void;

    // Memorizable options
    memorizableOptions: MemorizableOptionsState;
    setMemorizableOptions: (options: MemorizableOptionsState) => void;
    handleMemorizableOptionChange: <K extends keyof MemorizableOptionsState>(
        key: K,
        value: MemorizableOptionsState[K]
    ) => void;

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

const DEFAULT_PBKDF2_OPTIONS: OptionsState = {
    counter: 1,
    length: 16,
    useSymbols: true,
    useNumbers: true,
    useUppercase: true,
    useLowercase: true,
};

export function usePasswordGenerator(): UsePasswordGeneratorReturn {
    // Algorithm selection
    const [algorithm, setAlgorithm] = useState<GeneratorType>('pbkdf2');

    // Form inputs
    const [masterPassword, setMasterPassword] = useState<string>('');
    const [site, setSite] = useState<string>('');
    const [login, setLogin] = useState<string>('');
    const [userSalt, setUserSalt] = useState<string>('');

    // PBKDF2 options
    const [options, setOptions] = useState<OptionsState>(DEFAULT_PBKDF2_OPTIONS);

    // Memorizable options
    const [memorizableOptions, setMemorizableOptions] = useState<MemorizableOptionsState>({
        shift: DEFAULT_MEMORIZABLE_OPTIONS.shift,
        magicNumber: DEFAULT_MEMORIZABLE_OPTIONS.magicNumber,
    });

    // Password state
    const [generatedPassword, setGeneratedPassword] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
    const [isCopied, setIsCopied] = useState<boolean>(false);

    // UI state
    const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

    // Computed - validation depends on algorithm
    const canGenerate = algorithm === 'pbkdf2'
        ? Boolean(masterPassword && site && login && !isLoading)
        : Boolean(site && login && !isLoading);

    // Handle PBKDF2 option changes
    const handleOptionChange = useCallback(<K extends keyof OptionsState>(
        key: K,
        value: OptionsState[K]
    ): void => {
        setOptions(prev => ({ ...prev, [key]: value }));
    }, []);

    // Handle memorizable option changes
    const handleMemorizableOptionChange = useCallback(<K extends keyof MemorizableOptionsState>(
        key: K,
        value: MemorizableOptionsState[K]
    ): void => {
        setMemorizableOptions(prev => ({ ...prev, [key]: value }));
    }, []);

    // Generate password based on selected algorithm
    const handleGenerate = useCallback(async () => {
        // Clear previous state
        setIsLoading(true);
        setGeneratedPassword('');
        setError(null);

        try {
            let password: string;

            if (algorithm === 'pbkdf2') {
                // PBKDF2 requires master password
                if (!masterPassword || !site || !login) {
                    setGeneratedPassword('');
                    setIsLoading(false);
                    return;
                }

                password = await generatePBKDF2Password({
                    masterPassword,
                    site,
                    login,
                    userSalt,
                    ...options,
                    counter: Number(options.counter) || 1,
                });
            } else {
                // Memorizable - no master password needed
                if (!site || !login) {
                    setGeneratedPassword('');
                    setIsLoading(false);
                    return;
                }

                password = generateMemorizablePassword(
                    { login, site },
                    {
                        shift: Number(memorizableOptions.shift) || 1,
                        magicNumber: Number(memorizableOptions.magicNumber) || 0,
                    }
                );
            }

            setGeneratedPassword(password);
            setIsPasswordVisible(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate password');
            setGeneratedPassword('');
        } finally {
            setIsLoading(false);
        }
    }, [algorithm, masterPassword, site, login, userSalt, options, memorizableOptions]);

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
        setOptions(DEFAULT_PBKDF2_OPTIONS);
        setMemorizableOptions({
            shift: DEFAULT_MEMORIZABLE_OPTIONS.shift,
            magicNumber: DEFAULT_MEMORIZABLE_OPTIONS.magicNumber,
        });
        setGeneratedPassword('');
        setError(null);
        setShowAdvanced(false);
        setIsPasswordVisible(false);
        setIsCopied(false);
    }, []);

    return {
        // Algorithm
        algorithm,
        setAlgorithm,

        // Form state
        masterPassword,
        setMasterPassword,
        site,
        setSite,
        login,
        setLogin,
        userSalt,
        setUserSalt,

        // PBKDF2 options
        options,
        setOptions,
        handleOptionChange,

        // Memorizable options
        memorizableOptions,
        setMemorizableOptions,
        handleMemorizableOptionChange,

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
