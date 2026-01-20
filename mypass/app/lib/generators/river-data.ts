// lib/generators/river-data.ts
// ============================================================
// RIVER MAPPING - EASY TO EDIT
// ============================================================
// Each letter A-Z maps to an Indian river with its Major System value.
// 
// MAJOR SYSTEM REFERENCE:
// 0 = S, Z    |  3 = M      |  6 = J, CH, SH  |  9 = P, B
// 1 = T, D    |  4 = R      |  7 = K, G, Q
// 2 = N       |  5 = L      |  8 = F, V
//
// NOTE: For vowel-starting rivers, use the Major value of the 
// NEXT CONSONANT in the river name.
// ============================================================

export interface RiverEntry {
    river: string;  // River name (will appear in password)
    major: number;  // Major System value (0-9)
}

/**
 * A-Z to River mapping with Major System values.
 * 
 * TO CUSTOMIZE: Simply change the river name or major value.
 * The key must remain a single lowercase letter a-z.
 */
export const RIVER_DATA: Record<string, RiverEntry> = {
    'a': { river: 'Alaknanda', major: 5 },   // L from aLaknanda
    'b': { river: 'Bhagirathi', major: 9 },  // B = 9
    'c': { river: 'Chambal', major: 6 },     // CH = 6
    'd': { river: 'Damodar', major: 1 },     // D = 1
    'e': { river: 'Erai', major: 4 },        // R from eRai
    'f': { river: 'Falgu', major: 8 },       // F = 8
    'g': { river: 'Godavari', major: 7 },    // G = 7
    'h': { river: 'Hooghly', major: 7 },     // G from hooGhly = 7
    'i': { river: 'Indus', major: 2 },       // N from iNdus
    'j': { river: 'Jhelum', major: 6 },      // J = 6
    'k': { river: 'Krishna', major: 7 },     // K = 7
    'l': { river: 'Luni', major: 5 },        // L = 5
    'm': { river: 'Mahananda', major: 3 },   // M = 3
    'n': { river: 'Narmada', major: 2 },     // N = 2
    'o': { river: 'Orsang', major: 4 },      // R from oRsang
    'p': { river: 'Periyar', major: 9 },     // P = 9
    'q': { river: 'Qaveri', major: 7 },      // Q (K sound) = 7
    'r': { river: 'Ravi', major: 4 },        // R = 4
    's': { river: 'Sindhu', major: 0 },      // S = 0
    't': { river: 'Tapti', major: 1 },       // T = 1
    'u': { river: 'Ulhas', major: 5 },       // L from uLhas
    'v': { river: 'Vaigai', major: 8 },      // V = 8
    'w': { river: 'Wainganga', major: 2 },   // N from waiNganga
    'x': { river: 'Xeixei', major: 7 },      // X (sounds like K) = 7
    'y': { river: 'Yamuna', major: 3 },      // M from yaMuna
    'z': { river: 'Zanskar', major: 0 },     // Z = 0
};

/**
 * Get river data for a letter. Returns undefined if letter not found.
 */
export function getRiverData(letter: string): RiverEntry | undefined {
    return RIVER_DATA[letter.toLowerCase()];
}

/**
 * Get all available letters (for validation)
 */
export function getAvailableLetters(): string[] {
    return Object.keys(RIVER_DATA);
}
