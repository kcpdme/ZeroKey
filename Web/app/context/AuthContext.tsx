// app/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    GoogleAuthProvider,
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    authError: string | null;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    authError: null,
    signInWithGoogle: async () => { },
    signInWithEmail: async () => { },
    signUpWithEmail: async () => { },
    signOut: async () => { },
    clearError: () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const clearError = () => setAuthError(null);

    const getErrorMessage = (errorCode: string): string => {
        switch (errorCode) {
            case 'auth/email-already-in-use':
                return 'This email is already registered. Try signing in.';
            case 'auth/invalid-email':
                return 'Invalid email address.';
            case 'auth/user-not-found':
                return 'No account found with this email.';
            case 'auth/wrong-password':
                return 'Incorrect password.';
            case 'auth/weak-password':
                return 'Password should be at least 6 characters.';
            case 'auth/too-many-requests':
                return 'Too many attempts. Please try again later.';
            case 'auth/invalid-credential':
                return 'Invalid email or password.';
            default:
                return 'An error occurred. Please try again.';
        }
    };

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        setAuthError(null);
        try {
            await signInWithPopup(auth, provider);
        } catch (error: any) {
            console.error("Error signing in with Google", error);
            setAuthError(getErrorMessage(error.code));
            throw error;
        }
    };

    const signInWithEmail = async (email: string, password: string) => {
        setAuthError(null);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            console.error("Error signing in with email", error);
            setAuthError(getErrorMessage(error.code));
            throw error;
        }
    };

    const signUpWithEmail = async (email: string, password: string) => {
        setAuthError(null);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            console.error("Error signing up", error);
            setAuthError(getErrorMessage(error.code));
            throw error;
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            authError,
            signInWithGoogle,
            signInWithEmail,
            signUpWithEmail,
            signOut,
            clearError
        }}>
            {children}
        </AuthContext.Provider>
    );
}
