// lib/password-generator.ts
// Password Generation Logic - DO NOT MODIFY THIS FILE
// This is the core deterministic password generation algorithm

import { GeneratePasswordParams } from '../types';

/**
 * Normalizes a site URL.
 * @param {string} site The site URL to normalize.
 * @returns {string} The normalized site URL.
 */
const normalizeSite = (site: string): string => {
    let normalized = site.toLowerCase().trim();
    normalized = normalized.replace(/^https?:\/\//, '');
    normalized = normalized.replace(/^www\./, '');
    normalized = normalized.replace(/\/+$/, '');
    return normalized;
};

/**
 * Normalizes an email/login.
 * @param {string} email The email/login to normalize.
 * @returns {string} The normalized email/login.
 */
const normalizeEmail = (email: string): string => {
    return email.toLowerCase().trim();
};

/**
 * Converts an ArrayBuffer to a Base64URL string.
 * @param {ArrayBuffer} buffer The buffer to convert.
 * @returns {string} The Base64URL encoded string.
 */
const bufferToBase64Url = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    // btoa is safe to use in a 'use client' component.
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

/**
 * The core password generation function, translated from your Dart code.
 * It's deterministic based on the inputs.
 */
export const generatePassword = async ({
    masterPassword,
    site,
    login,
    userSalt = '',
    counter = 1,
    length = 16,
    useSymbols = true,
    useNumbers = true,
    useUppercase = true,
    useLowercase = true,
}: GeneratePasswordParams): Promise<string> => {
    if (!masterPassword || !site || !login) {
        return '';
    }

    try {
        // 1. Normalize inputs
        const normalizedSite = normalizeSite(site);
        const normalizedLogin = normalizeEmail(login);

        // 2. Salt construction
        const baseSource = (userSalt || '') + normalizedSite + normalizedLogin;
        const saltSource = `${baseSource}|${counter}|${baseSource}`;

        // 3. Use SHA-256 to get a consistent salt
        const encoder = new TextEncoder();
        const saltSourceBytes = encoder.encode(saltSource);
        const digestBuffer = await crypto.subtle.digest('SHA-256', saltSourceBytes);
        const salt = new Uint8Array(digestBuffer).slice(0, 16);

        // 4. Use PBKDF2 with SHA-256
        const masterPasswordKey = await crypto.subtle.importKey(
            'raw',
            encoder.encode(masterPassword),
            { name: 'PBKDF2' },
            false,
            ['deriveBits']
        );

        const keyBuffer = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256',
            },
            masterPasswordKey,
            256
        );

        // 5. Convert hash to Base64 string
        const base = bufferToBase64Url(keyBuffer);

        // 6. Build character sets
        const charSets: { [key: string]: string } = {
            lower: useLowercase ? 'abcdefghjkmnpqrstuvwxyz' : '',
            upper: useUppercase ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : '',
            numbers: useNumbers ? '23456789' : '',
            symbols: useSymbols ? '!@#%^&*()-_=+[]{};:,.<>?' : ''
        };

        const allChars = Object.values(charSets).join('');
        if (allChars.length === 0) {
            throw new Error('At least one character set must be selected.');
        }

        // 7. Deterministic password generation
        const passwordChars = new Array<string | null>(length).fill(null);
        let entropyIndex = 0;

        // 7a. Ensure at least one char from each selected set
        for (const key in charSets) {
            const charSet = charSets[key];
            if (charSet.length > 0) {
                let pos = base.charCodeAt(entropyIndex % base.length) % length;

                while (passwordChars[pos] !== null) {
                    entropyIndex++;
                    pos = base.charCodeAt(entropyIndex % base.length) % length;
                }
                entropyIndex++;

                const charIdx = base.charCodeAt(entropyIndex % base.length) % charSet.length;
                passwordChars[pos] = charSet[charIdx];
                entropyIndex++;
            }
        }

        // 7b. Fill remaining positions
        for (let i = 0; i < length; i++) {
            if (passwordChars[i] === null) {
                const charIdx = base.charCodeAt(entropyIndex % base.length) % allChars.length;
                passwordChars[i] = allChars[charIdx];
                entropyIndex++;
            }
        }

        return passwordChars.join('');

    } catch (error) {
        console.error('Password generation failed:', error);
        throw error; // Re-throw to let caller handle UI state
    }
};
