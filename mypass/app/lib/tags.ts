// app/lib/tags.ts
// Predefined tags with colors

export interface Tag {
    id: string;
    name: string;
    color: string;
    icon?: string;
}

// Predefined system tags
export const PREDEFINED_TAGS: Tag[] = [
    { id: 'work', name: 'Work', color: '#3b82f6' },      // Blue
    { id: 'personal', name: 'Personal', color: '#22c55e' }, // Green
    { id: 'finance', name: 'Finance', color: '#eab308' },   // Yellow
    { id: 'social', name: 'Social', color: '#ec4899' },     // Pink
    { id: 'shopping', name: 'Shopping', color: '#f97316' }, // Orange
    { id: 'entertainment', name: 'Entertainment', color: '#8b5cf6' }, // Purple
    { id: 'gaming', name: 'Gaming', color: '#ef4444' },     // Red
    { id: 'travel', name: 'Travel', color: '#14b8a6' },     // Teal
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
