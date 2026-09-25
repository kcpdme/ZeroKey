// Edge normalizers. These must stay identical to the private normalizers
// inside the generators. Do not change generator files to "share" them —
// existing passwords depend on those functions staying put.

import { GeneratorType } from './generators/base';

/** Matches pbkdf2-generator normalizeSite: keeps path and query string. */
export function normalizePbkdf2Site(site: string): string {
    let normalized = site.toLowerCase().trim();
    normalized = normalized.replace(/^https?:\/\//, '');
    normalized = normalized.replace(/^www\./, '');
    normalized = normalized.replace(/\/+$/, '');
    return normalized;
}

/** Matches memorizable-generator normalizeSite: drops path and query. */
export function normalizeMemorizableSite(site: string): string {
    return site
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/.*$/, '')
        .replace(/\?.*$/, '');
}

/** Matches both generators' email normalization (lowercase + trim). */
export function normalizeLogin(login: string): string {
    return login.toLowerCase().trim();
}

export function normalizeSiteForAlgorithm(site: string, algorithm: GeneratorType): string {
    return algorithm === 'memorizable'
        ? normalizeMemorizableSite(site)
        : normalizePbkdf2Site(site);
}
