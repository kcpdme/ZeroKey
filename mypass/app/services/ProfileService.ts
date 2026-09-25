// app/services/ProfileService.ts
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    deleteDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GeneratorType } from '../lib/generators';
import { normalizeLogin, normalizeSiteForAlgorithm } from '../lib/normalize-input';
import {
    nextRotatedOptions,
    recipeOutputChanged,
    snapshotRecipe,
    withMemorableVersionBump,
    RecipeOptions,
} from '../lib/recipe-history';
import { BackupProfile } from '../lib/backup';

export interface VersionHistoryEntry {
    version: number;           // The counter/version value
    changedAt: any;            // Timestamp when this version was created
    reason?: string;           // Why the password was changed
    expiresAt?: any;           // When this password should expire
    length?: number;           // Password length at this version (for secure)
    notes?: string;            // Any notes about this version
    shift?: number;            // Memorable shift at this version
    magicNumber?: number;      // Memorable magic number at this version
    useLowercase?: boolean;
    useUppercase?: boolean;
    useNumbers?: boolean;
    useSymbols?: boolean;
    userSalt?: string;
}

export interface PasswordPolicy {
    expiryDays?: number;       // Auto-expire after X days (e.g., 30, 60, 90)
    lastRotatedAt?: any;       // When password was last changed
    nextExpiryAt?: any;        // Calculated expiry date for current version
    autoRemind?: boolean;      // Remind user before expiry
    reminderDays?: number;     // Days before expiry to remind (default 7)
}

export interface PasswordProfile {
    id?: string;
    userId: string;
    site: string;
    login: string;
    algorithm: GeneratorType;
    options: {
        // PBKDF2 options
        length: number;
        counter: number;
        useLowercase: boolean;
        useUppercase: boolean;
        useNumbers: boolean;
        useSymbols: boolean;
        userSalt: string;

        // Memorizable options
        shift: number;
        magicNumber: number;
    };
    tags?: string[];           // Category tags
    notes?: string;            // Optional notes
    customFields?: Array<{     // Custom metadata
        key: string;
        value: string;
        encrypted?: boolean;
    }>;
    favorite?: boolean;
    lastUsedAt?: any;
    createdAt: any;
    updatedAt: any;

    // Version History & Password Policy
    versionHistory?: VersionHistoryEntry[];
    passwordPolicy?: PasswordPolicy;
}

const COLLECTION_NAME = 'password_profiles';
const TIMEOUT_MS = 10000; // 10 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000; // Initial delay, doubles each retry

// Helper: Delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Remove undefined values from object (Firestore doesn't accept undefined)
function removeUndefined<T extends Record<string, any>>(obj: T): T {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, value]) => value !== undefined)
    ) as T;
}

function isoToTimestamp(value: unknown): Timestamp | undefined {
    if (!value || typeof value !== 'string') return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return Timestamp.fromDate(date);
}

function historyFromBackup(entries: BackupProfile['versionHistory']): VersionHistoryEntry[] | undefined {
    if (!entries?.length) return undefined;
    return entries.map((entry) => removeUndefined({
        version: entry.version,
        changedAt: isoToTimestamp(entry.changedAt),
        expiresAt: isoToTimestamp(entry.expiresAt),
        reason: entry.reason,
        notes: entry.notes,
        length: entry.length,
        shift: entry.shift,
        magicNumber: entry.magicNumber,
        useLowercase: entry.useLowercase,
        useUppercase: entry.useUppercase,
        useNumbers: entry.useNumbers,
        useSymbols: entry.useSymbols,
        userSalt: entry.userSalt,
    }));
}

function policyFromBackup(policy: BackupProfile['passwordPolicy']): PasswordPolicy | undefined {
    if (!policy) return undefined;
    return removeUndefined({
        expiryDays: policy.expiryDays,
        autoRemind: policy.autoRemind,
        reminderDays: policy.reminderDays,
        lastRotatedAt: isoToTimestamp(policy.lastRotatedAt),
        nextExpiryAt: isoToTimestamp(policy.nextExpiryAt),
    });
}

// Helper: Wrap operation with timeout
async function withTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error('Operation timed out. Please check your internet connection.'));
        }, timeoutMs);
    });

    try {
        const result = await Promise.race([operation(), timeoutPromise]);
        clearTimeout(timeoutId!);
        return result;
    } catch (error) {
        clearTimeout(timeoutId!);
        throw error;
    }
}

// Helper: Retry with exponential backoff
async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = MAX_RETRIES,
    initialDelay: number = RETRY_DELAY_MS
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;

            // Don't retry on timeout or if it's the last attempt
            if (attempt === maxRetries || lastError.message.includes('timed out')) {
                break;
            }

            // Exponential backoff: 1s, 2s, 4s...
            const delayTime = initialDelay * Math.pow(2, attempt);
            console.log(`Retry ${attempt + 1}/${maxRetries} after ${delayTime}ms...`);
            await delay(delayTime);
        }
    }

    throw lastError;
}

export const ProfileService = {
    // Save or Update a profile with timeout and retry (tracks version history automatically)
    saveProfile: async (profile: Omit<PasswordProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ id: string; updated: boolean; options: PasswordProfile['options'] }> => {
        return withRetry(async () => {
            return withTimeout(async () => {
                // Use the same normalizer as the generator that will rebuild this password.
                const normalizedSite = normalizeSiteForAlgorithm(profile.site, profile.algorithm);
                const normalizedLogin = normalizeLogin(profile.login);

                // Check if duplicate exists (same user, site, login, algorithm)
                const q = query(
                    collection(db, COLLECTION_NAME),
                    where("userId", "==", profile.userId),
                    where("site", "==", normalizedSite),
                    where("login", "==", normalizedLogin),
                    where("algorithm", "==", profile.algorithm)
                );

                const querySnapshot = await getDocs(q);
                const timestamp = Timestamp.now();

                if (!querySnapshot.empty) {
                    // Update existing profile
                    const existingDoc = querySnapshot.docs[0];
                    const existingData = existingDoc.data() as PasswordProfile;
                    const docId = existingDoc.id;
                    const ref = doc(db, COLLECTION_NAME, docId);

                    const previousOptions = (existingData.options || {}) as RecipeOptions;
                    let nextOptions = { ...profile.options } as PasswordProfile['options'];
                    if (profile.algorithm === 'memorizable') {
                        nextOptions = withMemorableVersionBump(previousOptions, nextOptions);
                    }

                    let versionHistory = existingData.versionHistory || [];
                    if (recipeOutputChanged(profile.algorithm, previousOptions, nextOptions)) {
                        const snap = snapshotRecipe(
                            previousOptions,
                            (previousOptions.counter ?? 1) !== (nextOptions.counter ?? 1)
                                && (previousOptions.shift ?? 1) === (nextOptions.shift ?? 1)
                                && (previousOptions.magicNumber ?? 0) === (nextOptions.magicNumber ?? 0)
                                ? 'Version rotated'
                                : 'Options updated'
                        );
                        versionHistory = [
                            ...versionHistory,
                            {
                                ...snap,
                                changedAt: existingData.updatedAt || existingData.createdAt || timestamp,
                            }
                        ];
                    }

                    await updateDoc(ref, removeUndefined({
                        options: nextOptions,
                        tags: profile.tags,
                        notes: profile.notes,
                        customFields: profile.customFields,
                        favorite: profile.favorite,
                        versionHistory: versionHistory.length > 0 ? versionHistory : undefined,
                        passwordPolicy: profile.passwordPolicy,
                        updatedAt: timestamp
                    }));
                    return { id: docId, updated: true, options: nextOptions };
                } else {
                    // Create new profile - DON'T add initial version to history
                    // History should only contain PAST versions (rotated away from)
                    // The initial version is tracked by createdAt timestamp
                    const docRef = await addDoc(collection(db, COLLECTION_NAME), removeUndefined({
                        ...profile,
                        site: normalizedSite,
                        login: normalizedLogin,
                        // versionHistory starts empty - populated only on rotation
                        createdAt: timestamp,
                        updatedAt: timestamp
                    }));
                    return { id: docRef.id, updated: false, options: profile.options };
                }
            }, TIMEOUT_MS);
        });
    },

    // Restore one profile from a backup. Replaces history instead of appending a new row.
    importProfile: async (userId: string, profile: BackupProfile): Promise<string> => {
        return withRetry(async () => {
            return withTimeout(async () => {
                const normalizedSite = normalizeSiteForAlgorithm(profile.site, profile.algorithm);
                const normalizedLogin = normalizeLogin(profile.login);
                const q = query(
                    collection(db, COLLECTION_NAME),
                    where("userId", "==", userId),
                    where("site", "==", normalizedSite),
                    where("login", "==", normalizedLogin),
                    where("algorithm", "==", profile.algorithm)
                );
                const querySnapshot = await getDocs(q);
                const timestamp = Timestamp.now();
                const versionHistory = historyFromBackup(profile.versionHistory);
                const passwordPolicy = policyFromBackup(profile.passwordPolicy);
                const payload = removeUndefined({
                    userId,
                    site: normalizedSite,
                    login: normalizedLogin,
                    algorithm: profile.algorithm,
                    options: profile.options,
                    favorite: profile.favorite || false,
                    tags: profile.tags || [],
                    notes: profile.notes || '',
                    customFields: profile.customFields || [],
                    versionHistory: versionHistory || [],
                    passwordPolicy,
                    updatedAt: timestamp,
                });

                if (!querySnapshot.empty) {
                    const ref = doc(db, COLLECTION_NAME, querySnapshot.docs[0].id);
                    await updateDoc(ref, payload);
                    return ref.id;
                }

                const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                    ...payload,
                    createdAt: timestamp,
                });
                return docRef.id;
            }, TIMEOUT_MS);
        });
    },

    // Get all profiles for a user with timeout
    getUserProfiles: async (userId: string): Promise<PasswordProfile[]> => {
        return withRetry(async () => {
            return withTimeout(async () => {
                const q = query(
                    collection(db, COLLECTION_NAME),
                    where("userId", "==", userId)
                );

                const querySnapshot = await getDocs(q);
                return querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as PasswordProfile));
            }, TIMEOUT_MS);
        });
    },

    // Delete a profile with timeout
    deleteProfile: async (id: string): Promise<void> => {
        return withRetry(async () => {
            return withTimeout(async () => {
                await deleteDoc(doc(db, COLLECTION_NAME, id));
            }, TIMEOUT_MS);
        });
    },

    // Toggle favorite status
    toggleFavorite: async (id: string, isFavorite: boolean): Promise<void> => {
        return withRetry(async () => {
            return withTimeout(async () => {
                const ref = doc(db, COLLECTION_NAME, id);
                await updateDoc(ref, {
                    favorite: isFavorite,
                    updatedAt: Timestamp.now()
                });
            }, TIMEOUT_MS);
        });
    },

    // Update last used timestamp
    updateLastUsed: async (id: string): Promise<void> => {
        return withRetry(async () => {
            return withTimeout(async () => {
                const ref = doc(db, COLLECTION_NAME, id);
                await updateDoc(ref, {
                    lastUsedAt: Timestamp.now()
                });
            }, TIMEOUT_MS);
        });
    },

    // Bulk delete profiles
    bulkDelete: async (ids: string[]): Promise<{ success: number; failed: number }> => {
        let success = 0;
        let failed = 0;

        for (const id of ids) {
            try {
                await deleteDoc(doc(db, COLLECTION_NAME, id));
                success++;
            } catch {
                failed++;
            }
        }

        return { success, failed };
    },

    // Rotate password to next version with reason tracking
    rotatePassword: async (
        id: string,
        reason: string = 'Password rotated',
        expiryDays?: number
    ): Promise<{ newVersion: number }> => {
        return withRetry(async () => {
            return withTimeout(async () => {
                const ref = doc(db, COLLECTION_NAME, id);
                const docSnap = await getDoc(ref);

                if (!docSnap.exists()) {
                    throw new Error('Profile not found');
                }

                const existingData = docSnap.data() as PasswordProfile;
                const timestamp = Timestamp.now();
                const previousOptions = (existingData.options || {}) as RecipeOptions;
                const rotated = nextRotatedOptions(existingData.algorithm, previousOptions);
                const snap = snapshotRecipe(previousOptions, reason);

                const historyEntry: VersionHistoryEntry = {
                    ...snap,
                    changedAt: existingData.updatedAt || existingData.createdAt || timestamp,
                };

                const versionHistory = [...(existingData.versionHistory || []), historyEntry];

                // Build update object - only include fields that have values
                const updateData: Record<string, any> = {
                    'options.counter': rotated.counter,
                    versionHistory: versionHistory,
                    updatedAt: timestamp
                };

                if (existingData.algorithm === 'memorizable') {
                    updateData['options.magicNumber'] = rotated.magicNumber;
                }

                // Build password policy object
                const newPolicy: Record<string, any> = {
                    ...(existingData.passwordPolicy || {}),
                    lastRotatedAt: timestamp,
                };

                // Only add expiry if set
                if (expiryDays && expiryDays > 0) {
                    const expiryDate = new Date();
                    expiryDate.setDate(expiryDate.getDate() + expiryDays);
                    newPolicy.nextExpiryAt = Timestamp.fromDate(expiryDate);
                    newPolicy.expiryDays = expiryDays;
                }

                updateData.passwordPolicy = newPolicy;

                await updateDoc(ref, updateData);

                return { newVersion: rotated.counter ?? 1 };
            }, TIMEOUT_MS);
        });
    },

    // Set password policy (expiry rules)
    setPasswordPolicy: async (id: string, policy: PasswordPolicy): Promise<void> => {
        return withRetry(async () => {
            return withTimeout(async () => {
                const ref = doc(db, COLLECTION_NAME, id);
                const timestamp = Timestamp.now();

                // Calculate next expiry if expiryDays is set
                let nextExpiryAt: Timestamp | undefined;
                if (policy.expiryDays) {
                    const expiryDate = new Date();
                    expiryDate.setDate(expiryDate.getDate() + policy.expiryDays);
                    nextExpiryAt = Timestamp.fromDate(expiryDate);
                }

                await updateDoc(ref, removeUndefined({
                    passwordPolicy: {
                        ...policy,
                        nextExpiryAt
                    },
                    updatedAt: timestamp
                }));
            }, TIMEOUT_MS);
        });
    },

    // Get version history for a profile
    getVersionHistory: async (id: string): Promise<VersionHistoryEntry[]> => {
        return withRetry(async () => {
            return withTimeout(async () => {
                const docSnap = await getDoc(doc(db, COLLECTION_NAME, id));

                if (!docSnap.exists()) {
                    return [];
                }

                const data = docSnap.data() as PasswordProfile;
                return data.versionHistory || [];
            }, TIMEOUT_MS);
        });
    },

    // Get profiles expiring soon
    getExpiringProfiles: async (userId: string, withinDays: number = 7): Promise<PasswordProfile[]> => {
        return withRetry(async () => {
            return withTimeout(async () => {
                const q = query(
                    collection(db, COLLECTION_NAME),
                    where("userId", "==", userId)
                );

                const querySnapshot = await getDocs(q);
                const now = new Date();
                const cutoffDate = new Date();
                cutoffDate.setDate(now.getDate() + withinDays);

                return querySnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as PasswordProfile))
                    .filter(profile => {
                        if (!profile.passwordPolicy?.nextExpiryAt) return false;
                        const expiryDate = profile.passwordPolicy.nextExpiryAt.toDate();
                        return expiryDate <= cutoffDate && expiryDate >= now;
                    });
            }, TIMEOUT_MS);
        });
    }
};
