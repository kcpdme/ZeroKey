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
    // Save or Update a profile with timeout and retry
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
                    // Update existing
                    const docId = querySnapshot.docs[0].id;
                    const ref = doc(db, COLLECTION_NAME, docId);
                    await updateDoc(ref, {
                        options: profile.options,
                        updatedAt: timestamp
                    });
                    return docId;
                } else {
                    // Create new - remove undefined fields as Firestore rejects them
                    const docRef = await addDoc(collection(db, COLLECTION_NAME), removeUndefined({
                        ...profile,
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
    }
};
