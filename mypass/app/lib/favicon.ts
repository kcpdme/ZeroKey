// app/lib/favicon.ts
// Utility for fetching and caching site favicons

/**
 * Get favicon URL for a site using Google's favicon service
 * Falls back gracefully if the site doesn't have one
 */
export function getFaviconUrl(site: string, size: number = 32): string {
    if (!site) return '';

    // Normalize the site URL
    const normalizedSite = site
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/.*$/, '')
        .replace(/\?.*$/, '');

    if (!normalizedSite) return '';

    // Use Google's favicon service (reliable and fast)
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(normalizedSite)}&sz=${size}`;
}

/**
 * Alternative favicon sources if Google fails
 */
export function getAlternativeFaviconUrl(site: string): string {
    if (!site) return '';

    const normalizedSite = site
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/.*$/, '');

    // DuckDuckGo's favicon service
    return `https://icons.duckduckgo.com/ip3/${normalizedSite}.ico`;
}

/**
 * Check if a favicon URL is valid (not a placeholder)
 */
export async function isFaviconValid(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Get the best available favicon for a site
 * Tries Google first, then DuckDuckGo
 */
export function getBestFaviconUrl(site: string, size: number = 32): string {
    // Google's service is most reliable, use it as default
    return getFaviconUrl(site, size);
}
