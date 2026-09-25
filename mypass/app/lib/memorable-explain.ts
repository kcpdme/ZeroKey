// Read-only explanation of the current memorable formula.
// The password string always comes from generateMemorizablePassword.

import { generateMemorizablePassword } from './generators/memorizable-generator';
import { RIVER_DATA, RiverEntry } from './generators/river-data';
import { normalizeLogin, normalizeMemorizableSite } from './normalize-input';

export interface MemorableWarning {
    id: 'shift-past-end' | 'zero-major' | 'non-letter-login' | 'non-letter-site' | 'negative-magic';
    message: string;
}

export interface MemorableExplanation {
    password: string;
    normalizedSite: string;
    username: string;
    usernameLetter: string;
    siteLetter: string;
    incrementedLetter: string;
    river1: string;
    river2: string;
    major1: number;
    major2: number;
    shift: number;
    magicNumber: number;
    product: number;
    checksum: number;
    story: string;
    warnings: MemorableWarning[];
}

export interface MemorableCollision {
    site: string;
    login: string;
}

function usernameOf(login: string): string {
    const normalized = normalizeLogin(login);
    const atIndex = normalized.indexOf('@');
    return atIndex > 0 ? normalized.substring(0, atIndex) : normalized;
}

function incrementLetter(letter: string): string {
    const code = letter.toLowerCase().charCodeAt(0);
    if (code === 122) return 'a';
    if (code >= 97 && code < 122) {
        return String.fromCharCode(code + 1);
    }
    return letter;
}

function digitSum(num: number): number {
    num = Math.abs(Math.floor(num));
    while (num >= 10) {
        num = String(num)
            .split('')
            .reduce((sum, digit) => sum + parseInt(digit, 10), 0);
    }
    return num;
}

function riverFor(letter: string): RiverEntry {
    const data = RIVER_DATA[letter.toLowerCase()];
    if (data) return data;
    return RIVER_DATA['a'] || { river: 'Unknown', major: 0 };
}

function isLetter(value: string): boolean {
    return /^[a-z]$/.test(value);
}

export function explainMemorizablePassword(
    login: string,
    site: string,
    shift: number,
    magicNumber: number
): MemorableExplanation | null {
    const username = usernameOf(login);
    const normalizedSite = normalizeMemorizableSite(site);
    if (!username || !normalizedSite) return null;

    const safeShift = Number.isFinite(shift) ? shift : 1;
    const safeMagic = Number.isFinite(magicNumber) ? magicNumber : 0;

    const usernameLetter = username[0];
    const river1Data = riverFor(usernameLetter);

    const siteIndex = safeShift - 1;
    const shiftPastEnd = siteIndex < 0 || siteIndex >= normalizedSite.length;
    const siteLetter = !shiftPastEnd ? normalizedSite[siteIndex] : (normalizedSite[0] || 'a');
    const incrementedLetter = incrementLetter(siteLetter);
    const river2Data = riverFor(incrementedLetter);

    const product = river1Data.major * river2Data.major + safeMagic;
    const checksum = digitSum(product);

    const password = generateMemorizablePassword(
        { login, site },
        { shift: safeShift, magicNumber: safeMagic }
    );

    const warnings: MemorableWarning[] = [];

    if (shiftPastEnd) {
        warnings.push({
            id: 'shift-past-end',
            message: `Shift ${safeShift} is past ${normalizedSite} (${normalizedSite.length} characters). The formula falls back to the first letter, the same result as shift 1.`,
        });
    }

    if (!isLetter(usernameLetter)) {
        warnings.push({
            id: 'non-letter-login',
            message: `The first character of this login is “${usernameLetter}”, so the formula uses ${river1Data.river}.`,
        });
    }

    if (!isLetter(siteLetter) || !isLetter(incrementedLetter)) {
        warnings.push({
            id: 'non-letter-site',
            message: `The site letter “${siteLetter}” is not a–z, so the second river falls back to ${river2Data.river}.`,
        });
    }

    if (river1Data.major === 0 || river2Data.major === 0) {
        const which = [
            river1Data.major === 0 ? river1Data.river : null,
            river2Data.major === 0 ? river2Data.river : null,
        ].filter(Boolean).join(' and ');
        warnings.push({
            id: 'zero-major',
            message: `${which} has major 0, so the number is only your magic number. A different first letter or shift picks a river with a non-zero major.`,
        });
    }

    if (safeMagic < 0) {
        warnings.push({
            id: 'negative-magic',
            message: 'A negative magic number puts a minus sign in the password.',
        });
    }

    const story = `${river1Data.river} (${usernameLetter}) meets ${river2Data.river} (${siteLetter}+1). ${river1Data.major}×${river2Data.major}+${safeMagic}.`;

    return {
        password,
        normalizedSite,
        username,
        usernameLetter,
        siteLetter,
        incrementedLetter,
        river1: river1Data.river,
        river2: river2Data.river,
        major1: river1Data.major,
        major2: river2Data.major,
        shift: safeShift,
        magicNumber: safeMagic,
        product,
        checksum,
        story,
        warnings,
    };
}

export interface MemorableProfileRef {
    id?: string;
    site: string;
    login: string;
    algorithm: string;
    options?: {
        shift?: number;
        magicNumber?: number;
    };
}

export function findMemorableCollisions(
    current: {
        id?: string;
        site: string;
        login: string;
        shift: number;
        magicNumber: number;
    },
    profiles: MemorableProfileRef[]
): MemorableCollision[] {
    const mine = generateMemorizablePassword(
        { login: current.login, site: current.site },
        { shift: current.shift, magicNumber: current.magicNumber }
    );
    if (!mine) return [];

    const currentSite = normalizeMemorizableSite(current.site);
    const currentLogin = normalizeLogin(current.login);
    const seen = new Set<string>();
    const hits: MemorableCollision[] = [];

    for (const profile of profiles) {
        if (profile.algorithm !== 'memorizable') continue;
        if (current.id && profile.id === current.id) continue;

        const otherSite = normalizeMemorizableSite(profile.site);
        const otherLogin = normalizeLogin(profile.login);
        if (otherSite === currentSite && otherLogin === currentLogin) continue;

        const other = generateMemorizablePassword(
            { login: profile.login, site: profile.site },
            {
                shift: profile.options?.shift ?? 1,
                magicNumber: profile.options?.magicNumber ?? 0,
            }
        );
        if (!other || other !== mine) continue;

        const key = `${otherSite}|${otherLogin}`;
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push({ site: profile.site, login: profile.login });
    }

    return hits;
}
