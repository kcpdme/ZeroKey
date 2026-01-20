// lib/generators/memorizable-generator.ts
// Memorizable Password Generator using Indian Rivers and Major System

import { RIVER_DATA, RiverEntry } from './river-data';

export interface MemorizableParams {
    login: string;  // Email address
    site: string;   // Website
}

export interface MemorizableOptions {
    shift: number;       // Which letter of site to use (1-indexed), default: 3
    magicNumber: number; // Added to the product, default: 23
}

export const DEFAULT_MEMORIZABLE_OPTIONS: MemorizableOptions = {
    shift: 3,
    magicNumber: 23,
};

/**
 * Extract username from email (part before @)
 */
function getEmailUsername(email: string): string {
    const atIndex = email.indexOf('@');
    const username = atIndex > 0 ? email.substring(0, atIndex) : email;
    return username.toLowerCase().trim();
}

/**
 * Normalize site URL (remove protocol, www, paths)
 */
function normalizeSite(site: string): string {
    return site
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/.*$/, '')
        .replace(/\?.*$/, '');
}

/**
 * Increment a letter by 1 (a→b, z→a)
 */
function incrementLetter(letter: string): string {
    const code = letter.toLowerCase().charCodeAt(0);
    // z (122) wraps to a (97)
    if (code === 122) return 'a';
    // Only process a-z
    if (code >= 97 && code < 122) {
        return String.fromCharCode(code + 1);
    }
    // Non-letter, return as-is
    return letter;
}

/**
 * Calculate digit sum recursively until single digit (0-9)
 */
function digitSum(num: number): number {
    num = Math.abs(Math.floor(num));
    while (num >= 10) {
        num = String(num)
            .split('')
            .reduce((sum, digit) => sum + parseInt(digit, 10), 0);
    }
    return num;
}

/**
 * Get the Nth character from a string (1-indexed, with fallback to first)
 */
function getNthChar(str: string, n: number): string {
    const index = n - 1; // Convert to 0-indexed
    if (index >= 0 && index < str.length) {
        return str[index];
    }
    return str[0] || 'a'; // Fallback to first char or 'a'
}

/**
 * Get river data with fallback for missing letters
 */
function getRiverDataSafe(letter: string): RiverEntry {
    const data = RIVER_DATA[letter.toLowerCase()];
    if (data) return data;

    // Fallback to 'a' if letter not found (shouldn't happen with a-z)
    return RIVER_DATA['a'] || { river: 'Unknown', major: 0 };
}

/**
 * Generate a memorizable password using Indian Rivers and Major System.
 * 
 * Algorithm:
 * 1. River1 = First letter of email username → River name
 * 2. River2 = (Nth letter of site + 1) → River name
 * 3. Number = Major(River1) × Major(River2) + magicNumber
 * 4. Checksum = digit sum until single digit
 * 5. Password = River1 + River2 + "@" + Number + Checksum
 * 
 * @param params - email and site
 * @param options - shift position and magic number
 * @returns Generated password string
 */
export function generateMemorizablePassword(
    params: MemorizableParams,
    options: MemorizableOptions = DEFAULT_MEMORIZABLE_OPTIONS
): string {
    const { login, site } = params;
    const { shift, magicNumber } = options;

    // Validate inputs
    if (!login || !site) {
        return '';
    }

    // Get username from email
    const username = getEmailUsername(login);
    if (!username) {
        return '';
    }

    // Normalize site
    const normalizedSite = normalizeSite(site);
    if (!normalizedSite) {
        return '';
    }

    // Step 1: First letter of username → River1
    const letter1 = username[0];
    const river1 = getRiverDataSafe(letter1);

    // Step 2: Nth letter of site, increment, → River2
    const siteLetter = getNthChar(normalizedSite, shift);
    const letter2 = incrementLetter(siteLetter);
    const river2 = getRiverDataSafe(letter2);

    // Step 3: Calculate number
    const product = river1.major * river2.major + magicNumber;

    // Step 4: Calculate checksum
    const checksum = digitSum(product);

    // Step 5: Combine
    return `${river1.river}${river2.river}@${product}${checksum}`;
}
