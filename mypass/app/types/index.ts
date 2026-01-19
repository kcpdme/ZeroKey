// types/index.ts
// Type Definitions for the Password Generator

import { ReactNode, ChangeEvent } from 'react';

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

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon: ReactNode;
    label: string;
}

export interface CheckboxProps {
    id: string;
    label: string;
    checked: boolean;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export interface CounterInputProps {
    label: string;
    value: number;
    onIncrement: () => void;
    onDecrement: () => void;
    min?: number;
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
