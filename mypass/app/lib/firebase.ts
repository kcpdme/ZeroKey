// app/lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'mock-key-for-build',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'mock.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mock-project',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'mock.appspot.com',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

// Debug: Log config in development (remove in production)
if (typeof window !== 'undefined') {
    console.log('Firebase Config Loaded:', {
        apiKey: firebaseConfig.apiKey ? '✓ Set' : '✗ Missing',
        authDomain: firebaseConfig.authDomain ? '✓ Set' : '✗ Missing',
        projectId: firebaseConfig.projectId ? '✓ Set' : '✗ Missing',
    });
}

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
// If using a named database 'default', specify it explicitly
// If you used the default database (default), change 'default' to '(default)'
export const db = getFirestore(app, 'default');

