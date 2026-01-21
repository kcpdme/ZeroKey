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
    createdAt: any;
    updatedAt: any;
}

const COLLECTION_NAME = 'password_profiles';

export const ProfileService = {
    // Save or Update a profile
    saveProfile: async (profile: Omit<PasswordProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
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
            // Create new
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...profile,
                createdAt: timestamp,
                updatedAt: timestamp
            });
            return docRef.id;
        }
    },

    // Get all profiles for a user
    getUserProfiles: async (userId: string): Promise<PasswordProfile[]> => {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("userId", "==", userId)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as PasswordProfile));
    },

    // Delete a profile
    deleteProfile: async (id: string) => {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    }
};
