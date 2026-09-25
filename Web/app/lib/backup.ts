// JSON backup shape. Master passwords are never included.
// Timestamps are ISO strings so the file stays plain JSON.

import { GeneratorType } from './generators/base';

export interface BackupRecipeOptions {
    length?: number;
    counter?: number;
    useLowercase?: boolean;
    useUppercase?: boolean;
    useNumbers?: boolean;
    useSymbols?: boolean;
    userSalt?: string;
    shift?: number;
    magicNumber?: number;
}

export interface BackupHistoryEntry {
    version: number;
    changedAt?: string;
    reason?: string;
    expiresAt?: string;
    length?: number;
    notes?: string;
    shift?: number;
    magicNumber?: number;
    useLowercase?: boolean;
    useUppercase?: boolean;
    useNumbers?: boolean;
    useSymbols?: boolean;
    userSalt?: string;
}

export interface BackupPasswordPolicy {
    expiryDays?: number;
    lastRotatedAt?: string;
    nextExpiryAt?: string;
    autoRemind?: boolean;
    reminderDays?: number;
}

export interface BackupProfile {
    site: string;
    login: string;
    algorithm: GeneratorType;
    options: BackupRecipeOptions;
    favorite?: boolean;
    tags?: string[];
    notes?: string;
    customFields?: Array<{ key: string; value: string; encrypted?: boolean }>;
    versionHistory?: BackupHistoryEntry[];
    passwordPolicy?: BackupPasswordPolicy;
}

export interface BackupFile {
    version: '1.1';
    exportedAt: string;
    profiles: BackupProfile[];
}

export interface BackupSourceProfile {
    id?: string;
    site: string;
    login: string;
    algorithm: GeneratorType;
    options: BackupRecipeOptions;
    favorite?: boolean;
    tags?: string[];
    notes?: string;
    customFields?: Array<{ key: string; value: string; encrypted?: boolean }>;
    versionHistory?: Array<BackupHistoryEntry & { changedAt?: unknown; expiresAt?: unknown }>;
    passwordPolicy?: {
        expiryDays?: number;
        lastRotatedAt?: unknown;
        nextExpiryAt?: unknown;
        autoRemind?: boolean;
        reminderDays?: number;
    };
}

const ALGORITHMS: GeneratorType[] = ['pbkdf2', 'memorizable'];

export function timestampToIso(value: unknown): string | undefined {
    if (!value) return undefined;
    try {
        if (typeof value === 'string') {
            const parsed = new Date(value);
            return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
        }
        if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
            const date = (value as { toDate: () => Date }).toDate();
            return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
        }
        if (typeof value === 'object' && value !== null && 'seconds' in value && typeof (value as { seconds: unknown }).seconds === 'number') {
            const seconds = (value as { seconds: number }).seconds;
            const date = new Date(seconds * 1000);
            return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
        }
    } catch {
        return undefined;
    }
    return undefined;
}

function cleanHistory(entries: BackupSourceProfile['versionHistory']): BackupHistoryEntry[] | undefined {
    if (!entries?.length) return undefined;
    return entries.map((entry) => {
        const cleaned: BackupHistoryEntry = { version: entry.version };
        const changedAt = timestampToIso(entry.changedAt);
        const expiresAt = timestampToIso(entry.expiresAt);
        if (changedAt) cleaned.changedAt = changedAt;
        if (expiresAt) cleaned.expiresAt = expiresAt;
        if (entry.reason) cleaned.reason = entry.reason;
        if (entry.notes) cleaned.notes = entry.notes;
        if (entry.length !== undefined) cleaned.length = entry.length;
        if (entry.shift !== undefined) cleaned.shift = entry.shift;
        if (entry.magicNumber !== undefined) cleaned.magicNumber = entry.magicNumber;
        if (entry.useLowercase !== undefined) cleaned.useLowercase = entry.useLowercase;
        if (entry.useUppercase !== undefined) cleaned.useUppercase = entry.useUppercase;
        if (entry.useNumbers !== undefined) cleaned.useNumbers = entry.useNumbers;
        if (entry.useSymbols !== undefined) cleaned.useSymbols = entry.useSymbols;
        if (entry.userSalt !== undefined) cleaned.userSalt = entry.userSalt;
        return cleaned;
    });
}

export function buildBackup(profiles: BackupSourceProfile[], exportedAt: string = new Date().toISOString()): BackupFile {
    return {
        version: '1.1',
        exportedAt,
        profiles: profiles
            .filter((profile) => !profile.id?.startsWith('seed-'))
            .map((profile) => {
                const policy = profile.passwordPolicy;
                const lastRotatedAt = timestampToIso(policy?.lastRotatedAt);
                const nextExpiryAt = timestampToIso(policy?.nextExpiryAt);
                const passwordPolicy: BackupPasswordPolicy | undefined = policy
                    ? {
                        ...(policy.expiryDays !== undefined ? { expiryDays: policy.expiryDays } : {}),
                        ...(policy.autoRemind !== undefined ? { autoRemind: policy.autoRemind } : {}),
                        ...(policy.reminderDays !== undefined ? { reminderDays: policy.reminderDays } : {}),
                        ...(lastRotatedAt ? { lastRotatedAt } : {}),
                        ...(nextExpiryAt ? { nextExpiryAt } : {}),
                    }
                    : undefined;

                return {
                    site: profile.site,
                    login: profile.login,
                    algorithm: profile.algorithm,
                    options: profile.options,
                    favorite: profile.favorite || false,
                    tags: profile.tags || [],
                    notes: profile.notes || '',
                    customFields: profile.customFields || [],
                    versionHistory: cleanHistory(profile.versionHistory) || [],
                    ...(passwordPolicy && Object.keys(passwordPolicy).length > 0 ? { passwordPolicy } : {}),
                };
            }),
    };
}

function isOptions(value: unknown): value is BackupRecipeOptions {
    return typeof value === 'object' && value !== null;
}

function isValidProfile(value: unknown): value is BackupProfile {
    if (typeof value !== 'object' || value === null) return false;
    const profile = value as BackupProfile;
    if (typeof profile.site !== 'string' || !profile.site.trim()) return false;
    if (typeof profile.login !== 'string' || !profile.login.trim()) return false;
    if (!ALGORITHMS.includes(profile.algorithm)) return false;
    if (!isOptions(profile.options)) return false;

    if (profile.algorithm === 'pbkdf2') {
        const { length, counter } = profile.options;
        if (length !== undefined && typeof length !== 'number') return false;
        if (counter !== undefined && typeof counter !== 'number') return false;
    } else {
        const { shift, magicNumber } = profile.options;
        if (shift !== undefined && typeof shift !== 'number') return false;
        if (magicNumber !== undefined && typeof magicNumber !== 'number') return false;
    }

    return true;
}

export function parseBackup(data: unknown): { profiles: BackupProfile[]; invalid: number } {
    if (typeof data !== 'object' || data === null || !('profiles' in data) || !Array.isArray((data as { profiles: unknown }).profiles)) {
        throw new Error('Invalid backup file format');
    }

    const rawProfiles = (data as { profiles: unknown[] }).profiles;
    const profiles: BackupProfile[] = [];
    let invalid = 0;

    for (const entry of rawProfiles) {
        if (isValidProfile(entry)) {
            profiles.push(entry);
        } else {
            invalid += 1;
        }
    }

    return { profiles, invalid };
}
