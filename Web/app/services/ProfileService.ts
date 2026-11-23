// app/services/ProfileService.ts
import {
    collection,
    query,
    where,
    getDocs,
    getDocsFromServer,
    getDoc,
    getDocFromServer,
    doc,
    updateDoc,
    deleteDoc,
    deleteField,
    runTransaction,
    serverTimestamp,
    type DocumentReference,
    type Transaction,
    Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GeneratorType } from '../lib/generators';
import { normalizeLogin, normalizeSiteForAlgorithm, siteForSavedRecipe } from '../lib/normalize-input';
import {
    nextRotatedOptions,
    recipeOutputChanged,
    snapshotRecipe,
    type RecipeOptions,
} from '../lib/recipe-history';
import { BackupProfile } from '../lib/backup';

export interface VersionHistoryEntry {
    version: number;           // The counter/version value
    site?: string;
    login?: string;
    completeRecipe?: boolean;
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
    pendingVersion?: PendingVersion;
    lastConfirmedDraftId?: string;
    passwordPolicy?: PasswordPolicy;
}

interface PendingVersion {
    id: string;
    options: PasswordProfile['options'];
    reason: string;
    expiryDays?: number;
}

type NewProfile = Pick<PasswordProfile, 'userId' | 'site' | 'login' | 'algorithm' | 'tags'> & {
    options: RecipeOptions;
};

type CreateProfileResult =
    | { status: 'created'; profile: PasswordProfile }
    | { status: 'exists'; profiles: PasswordProfile[] };

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
        site: typeof entry.site === 'string' ? entry.site : undefined,
        login: typeof entry.login === 'string' ? entry.login : undefined,
        completeRecipe: entry.completeRecipe === true ? true : undefined,
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

async function findAccountProfiles(userId: string, site: string, login: string): Promise<PasswordProfile[]> {
    const accountQuery = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId),
        where('login', '==', normalizeLogin(login)),
    );
    const snapshots = await getDocsFromServer(accountQuery);
    return snapshots.docs
        .map(snapshot => ({ ...snapshot.data(), id: snapshot.id }) as PasswordProfile)
        .filter(profile => {
            const normalized = normalizeSiteForAlgorithm(site, profile.algorithm);
            return profile.site === normalized || normalizeSiteForAlgorithm(profile.site, profile.algorithm) === normalized;
        });
}

function withProfileCreationLock<T>(
    userId: string,
    operation: (transaction: Transaction, guard: DocumentReference) => Promise<T>,
): Promise<T> {
    const guard = doc(db, 'user_settings', userId);
    return runTransaction(db, async transaction => {
        // Web transactions can only read documents by ID. Read the per-user guard
        // before the server-side account query so competing creations retry.
        await transaction.get(guard);
        return operation(transaction, guard);
    });
}

async function readProfile(transaction: Transaction, ref: DocumentReference): Promise<PasswordProfile> {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('This vault recipe no longer exists.');
    return { ...snapshot.data(), id: ref.id } as PasswordProfile;
}

export const ProfileService = {
    findAccountProfiles: (userId: string, site: string, login: string): Promise<PasswordProfile[]> =>
        withTimeout(() => findAccountProfiles(userId, site, login), TIMEOUT_MS),

    createProfile: (profile: NewProfile): Promise<CreateProfileResult> =>
        withProfileCreationLock(profile.userId, async (transaction, guard) => {
            const profiles = await findAccountProfiles(profile.userId, profile.site, profile.login);
            if (profiles.length > 0) return { status: 'exists', profiles };

            const timestamp = Timestamp.now();
            const saved = removeUndefined({
                userId: profile.userId,
                site: siteForSavedRecipe(profile.site, profile.algorithm),
                login: normalizeLogin(profile.login),
                algorithm: profile.algorithm,
                options: removeUndefined(profile.options),
                tags: profile.tags,
                createdAt: timestamp,
                updatedAt: timestamp,
            });
            const ref = doc(collection(db, COLLECTION_NAME));
            transaction.set(ref, saved);
            transaction.set(guard, { lastProfileCreatedAt: serverTimestamp() }, { merge: true });
            return { status: 'created', profile: { ...saved, id: ref.id } as PasswordProfile };
        }),

    // Import is an explicit restore. Keep its existing per-algorithm matching.
    importProfile: (userId: string, profile: BackupProfile): Promise<string> =>
        withProfileCreationLock(userId, async (transaction, guard) => {
            const matches = await findAccountProfiles(userId, profile.site, profile.login);
            const existing = matches.find(match => match.algorithm === profile.algorithm);
            const timestamp = Timestamp.now();
            const payload = removeUndefined({
                userId,
                site: siteForSavedRecipe(profile.site, profile.algorithm),
                login: normalizeLogin(profile.login),
                algorithm: profile.algorithm,
                options: profile.options,
                favorite: profile.favorite || false,
                tags: profile.tags || [],
                notes: profile.notes || '',
                customFields: profile.customFields || [],
                versionHistory: historyFromBackup(profile.versionHistory) || [],
                passwordPolicy: policyFromBackup(profile.passwordPolicy),
                updatedAt: timestamp,
            });

            if (existing?.id) {
                const ref = doc(db, COLLECTION_NAME, existing.id);
                await readProfile(transaction, ref);
                transaction.update(ref, {
                    ...payload,
                    pendingVersion: deleteField(),
                    lastConfirmedDraftId: deleteField(),
                });
                return ref.id;
            }

            const ref = doc(collection(db, COLLECTION_NAME));
            transaction.set(ref, { ...payload, createdAt: timestamp });
            transaction.set(guard, { lastProfileCreatedAt: serverTimestamp() }, { merge: true });
            return ref.id;
        }),

    getCurrentProfile: (id: string): Promise<PasswordProfile> =>
        withTimeout(async () => {
            const snapshot = await getDocFromServer(doc(db, COLLECTION_NAME, id));
            if (!snapshot.exists()) throw new Error('This vault recipe no longer exists.');
            return { ...snapshot.data(), id: snapshot.id } as PasswordProfile;
        }, TIMEOUT_MS),

    saveTags: (id: string, tags: string[]): Promise<void> =>
        updateDoc(doc(db, COLLECTION_NAME, id), { tags, updatedAt: Timestamp.now() }),

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

    prepareVersion: (id: string, reason = 'Password changed', expiryDays?: number): Promise<PasswordProfile> => {
        const draftId = doc(collection(db, COLLECTION_NAME)).id;
        const ref = doc(db, COLLECTION_NAME, id);
        return runTransaction(db, async transaction => {
            const profile = await readProfile(transaction, ref);
            if (profile.pendingVersion) return profile;

            const options = nextRotatedOptions(profile.algorithm, profile.options, profile.versionHistory);
            if (!Number.isSafeInteger(options.counter)
                || (profile.algorithm === 'memorizable' && !Number.isSafeInteger(options.magicNumber))) {
                throw new Error('This recipe has reached its version limit.');
            }
            const pendingVersion = removeUndefined({ id: draftId, options, reason, expiryDays });
            transaction.update(ref, { pendingVersion });
            return { ...profile, pendingVersion };
        });
    },

    confirmVersion: (id: string, draftId: string): Promise<PasswordProfile> => {
        const ref = doc(db, COLLECTION_NAME, id);
        return runTransaction(db, async transaction => {
            const profile = await readProfile(transaction, ref);
            if (profile.lastConfirmedDraftId === draftId) return profile;

            const draft = profile.pendingVersion;
            if (draft?.id !== draftId) throw new Error('This draft has changed. Reopen the recipe to continue.');
            const expected = nextRotatedOptions(profile.algorithm, profile.options, profile.versionHistory);
            if (recipeOutputChanged(profile.algorithm, expected, draft.options)) {
                throw new Error('The current recipe has changed. Discard this draft and start again.');
            }

            const timestamp = Timestamp.now();
            const passwordPolicy: PasswordPolicy = { ...profile.passwordPolicy, lastRotatedAt: timestamp };
            const days = draft.expiryDays ?? passwordPolicy.expiryDays;
            if (days && days > 0) {
                const expiryDate = timestamp.toDate();
                expiryDate.setDate(expiryDate.getDate() + days);
                passwordPolicy.expiryDays = days;
                passwordPolicy.nextExpiryAt = Timestamp.fromDate(expiryDate);
            }

            const versionHistory = [...(profile.versionHistory ?? []), {
                ...snapshotRecipe(profile.options, draft.reason),
                changedAt: profile.passwordPolicy?.lastRotatedAt ?? profile.updatedAt ?? profile.createdAt ?? timestamp,
            }];
            const active = {
                options: draft.options,
                versionHistory,
                passwordPolicy,
                updatedAt: timestamp,
                lastConfirmedDraftId: draftId,
            };
            transaction.update(ref, { ...active, pendingVersion: deleteField() });
            return { ...profile, ...active, pendingVersion: undefined };
        });
    },

    discardVersion: (id: string, draftId: string): Promise<PasswordProfile> => {
        const ref = doc(db, COLLECTION_NAME, id);
        return runTransaction(db, async transaction => {
            const profile = await readProfile(transaction, ref);
            if (!profile.pendingVersion) return profile;
            if (profile.pendingVersion.id !== draftId) {
                throw new Error('This draft has changed. Reopen the recipe to continue.');
            }
            transaction.update(ref, { pendingVersion: deleteField() });
            return { ...profile, pendingVersion: undefined };
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
