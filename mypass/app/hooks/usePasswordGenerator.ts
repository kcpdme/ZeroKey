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
import { normalizeLogin, normalizeSiteForAlgorithm } from '../lib/normalize-input';
import { assertPbkdf2Generatable } from '../lib/pbkdf2-preflight';
import { UserSettings } from '../services/SettingsService';

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
    handleGenerate: () => Promise<string>;
    handleCopy: () => Promise<void>;
    resetFields: () => void;
    applyDefaults: (settings: UserSettings) => void;

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

    const applyDefaults = useCallback((settings: UserSettings) => {
        setAlgorithm(settings.preferences.defaultAlgorithm);
        setUserSalt(settings.pbkdf2.defaultSalt || '');
        setOptions({
            counter: settings.pbkdf2.defaultCounter,
            length: settings.pbkdf2.defaultLength,
            useSymbols: settings.pbkdf2.useSymbols,
            useNumbers: settings.pbkdf2.useNumbers,
            useUppercase: settings.pbkdf2.useUppercase,
            useLowercase: settings.pbkdf2.useLowercase,
        });
        setMemorizableOptions({
            shift: settings.memorizable.defaultShift,
            magicNumber: settings.memorizable.defaultMagicNumber,
        });
    }, []);

    // Generate password based on selected algorithm.
    // Site and login are normalized with the same rules the generator uses,
    // then written back so a later save stores that exact string.
    const handleGenerate = useCallback(async (): Promise<string> => {
        setIsLoading(true);
        setGeneratedPassword('');
        setError(null);

        try {
            const normalizedSite = normalizeSiteForAlgorithm(site, algorithm);
            const normalizedLogin = normalizeLogin(login);
            if (normalizedSite !== site) setSite(normalizedSite);
            if (normalizedLogin !== login) setLogin(normalizedLogin);

            let password: string;

            if (algorithm === 'pbkdf2') {
                if (!masterPassword || !normalizedSite || !normalizedLogin) {
                    setGeneratedPassword('');
                    setIsLoading(false);
                    return '';
                }

                const pbkdf2Options = {
                    ...options,
                    counter: Number(options.counter) || 1,
                };
                assertPbkdf2Generatable(pbkdf2Options);

                password = await generatePBKDF2Password({
                    masterPassword,
                    site: normalizedSite,
                    login: normalizedLogin,
                    userSalt,
                    ...pbkdf2Options,
                });
            } else {
                if (!normalizedSite || !normalizedLogin) {
                    setGeneratedPassword('');
                    setIsLoading(false);
                    return '';
                }

                password = generateMemorizablePassword(
                    { login: normalizedLogin, site: normalizedSite },
                    {
                        shift: Number(memorizableOptions.shift) || 1,
                        magicNumber: Number(memorizableOptions.magicNumber) || 0,
                    }
                );
            }

            setGeneratedPassword(password);
            setIsPasswordVisible(false);
            return password;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate password');
            setGeneratedPassword('');
            return '';
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
        applyDefaults,

        // UI state
        showAdvanced,
        setShowAdvanced,

        // Validation
        canGenerate,
    };
}
