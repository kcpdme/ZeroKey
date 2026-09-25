// types/index.ts
// Type Definitions for the Password Generator

// Re-export generator types
export type { GeneratorType } from '../lib/generators';

export interface GeneratePasswordParams {
    masterPassword: string;
    site: string;
    login: string;
    userSalt?: string;
    counter?: number;
    length?: number;
    useSymbols?: boolean;
    useNumbers?: boolean;
    useUppercase?: boolean;
    useLowercase?: boolean;
}

export interface OptionsState {
    counter: number;
    length: number;
    useSymbols: boolean;
    useNumbers: boolean;
    useUppercase: boolean;
    useLowercase: boolean;
}

export interface PasswordDisplayProps {
    password: string;
    isLoading: boolean;
    error: string | null;
    isVisible: boolean;
    onToggleVisibility: () => void;
    onCopy: () => void;
    isCopied: boolean;
}
