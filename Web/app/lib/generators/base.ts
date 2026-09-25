// lib/generators/base.ts
// Base types and registry for password generators

export type GeneratorType = 'pbkdf2' | 'memorizable';

export interface GeneratorInfo {
    id: GeneratorType;
    name: string;
    description: string;
    icon: string;
}

export const GENERATORS: Record<GeneratorType, GeneratorInfo> = {
    pbkdf2: {
        id: 'pbkdf2',
        name: 'Secure',
        description: 'Cryptographically secure using PBKDF2',
        icon: '🔐',
    },
    memorizable: {
        id: 'memorizable',
        name: 'Memorizable',
        description: 'Human-memorizable using Indian rivers',
        icon: '🧠',
    },
};
