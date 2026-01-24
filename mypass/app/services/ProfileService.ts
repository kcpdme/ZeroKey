// app/services/ProfileService.ts
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GeneratorType } from '../lib/generators';

export interface VersionHistoryEntry {
    version: number;           // The counter/version value
    changedAt: any;            // Timestamp when this version was created
    reason?: string;           // Why the password was changed
    expiresAt?: any;           // When this password should expire
    length?: number;           // Password length at this version (for secure)
    notes?: string;            // Any notes about this version
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
    saveProfile: async (profile: Omit<PasswordProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
        return withRetry(async () => {
            return withTimeout(async () => {
                // Check if duplicate exists (same user, site, login, algorithm)
                const q = query(
                    collection(db, COLLECTION_NAME),
                    where("userId", "==", profile.userId),
                    where("site", "==", profile.site),
                    where("login", "==", profile.login),
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

                    // Check if version (counter) changed - if so, add to history
                    const oldVersion = existingData.options?.counter || 1;
                    const newVersion = profile.options?.counter || 1;
                    let versionHistory = existingData.versionHistory || [];

                    if (newVersion !== oldVersion) {
                        // Add the OLD version to history before updating
                        versionHistory = [
                            ...versionHistory,
                            {
                                version: oldVersion,
                                changedAt: existingData.updatedAt || existingData.createdAt,
                                length: existingData.options?.length,
                                reason: 'Version rotated',
                            }
                        ];
                    }

                    await updateDoc(ref, removeUndefined({
                        options: profile.options,
                        tags: profile.tags,
                        versionHistory: versionHistory.length > 0 ? versionHistory : undefined,
                        passwordPolicy: profile.passwordPolicy,
                        updatedAt: timestamp
                    }));
                    return docId;
                } else {
                    // Create new profile - DON'T add initial version to history
                    // History should only contain PAST versions (rotated away from)
                    // The initial version is tracked by createdAt timestamp
                    const docRef = await addDoc(collection(db, COLLECTION_NAME), removeUndefined({
                        ...profile,
                        // versionHistory starts empty - populated only on rotation
                        createdAt: timestamp,
                        updatedAt: timestamp
                    }));
                    return docRef.id;
                }
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
                const docSnap = await getDocs(query(
                    collection(db, COLLECTION_NAME),
                    where("__name__", "==", id)
                ));

                if (docSnap.empty) {
                    throw new Error('Profile not found');
                }

                const existingData = docSnap.docs[0].data() as PasswordProfile;
                const timestamp = Timestamp.now();
                const oldVersion = existingData.options?.counter || 1;
                const newVersion = oldVersion + 1;

                // Add current version to history
                const historyEntry: VersionHistoryEntry = {
                    version: oldVersion,
                    changedAt: existingData.updatedAt || existingData.createdAt || timestamp,
                    length: existingData.options?.length || 16,
                    reason: reason,
                };

                const versionHistory = [...(existingData.versionHistory || []), historyEntry];

                // Build update object - only include fields that have values
                const updateData: Record<string, any> = {
                    'options.counter': newVersion,
                    versionHistory: versionHistory,
                    updatedAt: timestamp
                };

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

                return { newVersion };
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
                const docSnap = await getDocs(query(
                    collection(db, COLLECTION_NAME),
                    where("__name__", "==", id)
                ));

                if (docSnap.empty) {
                    return [];
                }

                const data = docSnap.docs[0].data() as PasswordProfile;
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
