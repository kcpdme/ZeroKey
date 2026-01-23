// app/lib/tags.ts
// Predefined tags with colors

export interface Tag {
    id: string;
    name: string;
    color: string;
    icon?: string;
}

// Predefined system tags - comprehensive categories for password organization
export const PREDEFINED_TAGS: Tag[] = [
    { id: 'work', name: 'Work', color: '#3b82f6' },           // Blue
    { id: 'personal', name: 'Personal', color: '#22c55e' },   // Green
    { id: 'finance', name: 'Finance', color: '#eab308' },     // Yellow (Banking, Investments)
    { id: 'social', name: 'Social', color: '#ec4899' },       // Pink (Social Media)
    { id: 'shopping', name: 'Shopping', color: '#f97316' },   // Orange (E-commerce)
    { id: 'entertainment', name: 'Entertainment', color: '#8b5cf6' }, // Purple (Streaming, Music)
    { id: 'gaming', name: 'Gaming', color: '#ef4444' },       // Red
    { id: 'travel', name: 'Travel', color: '#14b8a6' },       // Teal (Airlines, Hotels, Booking)
    { id: 'tech', name: 'Tech', color: '#6366f1' },           // Indigo (Developer, APIs, Cloud)
    { id: 'health', name: 'Health', color: '#10b981' },       // Emerald (Medical, Fitness)
    { id: 'education', name: 'Education', color: '#0ea5e9' }, // Sky (Schools, Courses, Learning)
    { id: 'crypto', name: 'Crypto', color: '#a855f7' },       // Violet (Exchanges, Wallets)
];

// Tag colors for custom tags
export const TAG_COLORS = [
    '#3b82f6', // Blue
    '#22c55e', // Green
    '#eab308', // Yellow
    '#ec4899', // Pink
    '#f97316', // Orange
    '#8b5cf6', // Purple
    '#ef4444', // Red
    '#14b8a6', // Teal
    '#6366f1', // Indigo
    '#84cc16', // Lime
];

/**
 * Get a tag by ID from predefined tags
 */
export function getTagById(tagId: string): Tag | undefined {
    return PREDEFINED_TAGS.find(t => t.id === tagId);
}

/**
 * Get tag color by ID
 */
export function getTagColor(tagId: string): string {
    const tag = getTagById(tagId);
    return tag?.color || '#6b7280'; // Gray fallback
}

/**
 * Get tag name by ID
 */
export function getTagName(tagId: string): string {
    const tag = getTagById(tagId);
    return tag?.name || tagId;
}
