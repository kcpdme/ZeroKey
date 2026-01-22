// app/lib/duplicateDetection.ts
// Utility for detecting duplicate or similar password profiles

import { PasswordProfile } from '../services/ProfileService';

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    isSimilar: boolean;
    matchingProfile?: PasswordProfile;
    reason?: string;
}

/**
 * Normalize a URL/site for comparison
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
 * Calculate similarity between two strings (Levenshtein distance based)
 */
function calculateSimilarity(str1: string, str2: string): number {
    const a = str1.toLowerCase();
    const b = str2.toLowerCase();

    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    // Simple containment check
    if (a.includes(b) || b.includes(a)) {
        return 0.8;
    }

    // Levenshtein distance
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    const distance = matrix[b.length][a.length];
    const maxLength = Math.max(a.length, b.length);
    return 1 - distance / maxLength;
}

/**
 * Check if a new profile would be a duplicate of an existing one
 */
export function checkForDuplicates(
    newSite: string,
    newLogin: string,
    newAlgorithm: 'pbkdf2' | 'memorizable',
    existingProfiles: PasswordProfile[],
    excludeProfileId?: string
): DuplicateCheckResult {
    const normalizedNewSite = normalizeSite(newSite);
    const normalizedNewLogin = newLogin.toLowerCase().trim();

    for (const profile of existingProfiles) {
        // Skip the profile we're editing
        if (excludeProfileId && profile.id === excludeProfileId) continue;

        const normalizedExistingSite = normalizeSite(profile.site);
        const normalizedExistingLogin = profile.login.toLowerCase().trim();

        // Exact duplicate: same site, login, and algorithm
        if (
            normalizedNewSite === normalizedExistingSite &&
            normalizedNewLogin === normalizedExistingLogin &&
            newAlgorithm === profile.algorithm
        ) {
            return {
                isDuplicate: true,
                isSimilar: false,
                matchingProfile: profile,
                reason: `Exact duplicate: same site, login, and algorithm type`,
            };
        }

        // Same site and login, different algorithm
        if (
            normalizedNewSite === normalizedExistingSite &&
            normalizedNewLogin === normalizedExistingLogin
        ) {
            return {
                isDuplicate: false,
                isSimilar: true,
                matchingProfile: profile,
                reason: `Same site and login with ${profile.algorithm === 'pbkdf2' ? 'Secure' : 'Memorable'} algorithm`,
            };
        }

        // Similar site check (typo detection)
        const siteSimilarity = calculateSimilarity(normalizedNewSite, normalizedExistingSite);
        if (siteSimilarity > 0.85 && normalizedNewLogin === normalizedExistingLogin) {
            return {
                isDuplicate: false,
                isSimilar: true,
                matchingProfile: profile,
                reason: `Similar site name detected: "${profile.site}"`,
            };
        }
    }

    return {
        isDuplicate: false,
        isSimilar: false,
    };
}

/**
 * Get all profiles that are similar to the given one
 */
export function findSimilarProfiles(
    site: string,
    profiles: PasswordProfile[]
): PasswordProfile[] {
    const normalizedSite = normalizeSite(site);

    return profiles.filter(profile => {
        const normalizedExistingSite = normalizeSite(profile.site);
        const similarity = calculateSimilarity(normalizedSite, normalizedExistingSite);
        return similarity > 0.7 && similarity < 1;
    });
}
