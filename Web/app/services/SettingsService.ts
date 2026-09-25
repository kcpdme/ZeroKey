// app/services/SettingsService.ts
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface UserSettings {
    // PBKDF2 Defaults
    pbkdf2: {
        defaultSalt: string;
        defaultLength: number;
        defaultCounter: number;
        useLowercase: boolean;
        useUppercase: boolean;
        useNumbers: boolean;
        useSymbols: boolean;
    };
    // Memorizable Defaults
    memorizable: {
        defaultShift: number;
        defaultMagicNumber: number;
    };
    // Preferences
    preferences: {
        defaultAlgorithm: 'pbkdf2' | 'memorizable';
        autoCopyOnGenerate: boolean;
        clearClipboardAfter: number; // seconds, 0 = never
    };
}

const DEFAULT_SETTINGS: UserSettings = {
    pbkdf2: {
        defaultSalt: '',
        defaultLength: 16,
        defaultCounter: 1,
        useLowercase: true,
        useUppercase: true,
        useNumbers: true,
        useSymbols: true,
    },
    memorizable: {
        defaultShift: 3,
        defaultMagicNumber: 7,
    },
    preferences: {
        defaultAlgorithm: 'pbkdf2',
        autoCopyOnGenerate: false,
        clearClipboardAfter: 30,
    },
};

const COLLECTION_NAME = 'user_settings';

export const SettingsService = {
    // Get user settings
    getSettings: async (userId: string): Promise<UserSettings> => {
        try {
            const docRef = doc(db, COLLECTION_NAME, userId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                // Deep merge with defaults to ensure all fields exist
                return {
                    pbkdf2: { ...DEFAULT_SETTINGS.pbkdf2, ...data.pbkdf2 },
                    memorizable: { ...DEFAULT_SETTINGS.memorizable, ...data.memorizable },
                    preferences: { ...DEFAULT_SETTINGS.preferences, ...data.preferences },
                };
            }
            return DEFAULT_SETTINGS;
        } catch (error) {
            console.error('Failed to load settings:', error);
            return DEFAULT_SETTINGS;
        }
    },

    // Save user settings
    saveSettings: async (userId: string, settings: Partial<UserSettings>): Promise<void> => {
        try {
            const docRef = doc(db, COLLECTION_NAME, userId);
            const currentSettings = await SettingsService.getSettings(userId);
            const mergedSettings = {
                ...currentSettings,
                ...settings,
                pbkdf2: { ...currentSettings.pbkdf2, ...settings.pbkdf2 },
                memorizable: { ...currentSettings.memorizable, ...settings.memorizable },
                preferences: { ...currentSettings.preferences, ...settings.preferences },
            };
            await setDoc(docRef, mergedSettings);
        } catch (error) {
            console.error('Failed to save settings:', error);
            throw error;
        }
    },

    // Get default settings (without fetching from DB)
    getDefaultSettings: (): UserSettings => DEFAULT_SETTINGS,
};
