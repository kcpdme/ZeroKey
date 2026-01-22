// app/components/dashboard/TagSelector.tsx
'use client';

import React, { useState } from 'react';
import { Tag, X, Plus, Check } from 'lucide-react';
import { PREDEFINED_TAGS, Tag as TagType, getTagColor } from '../../lib/tags';

interface TagSelectorProps {
    selectedTags: string[];
    onChange: (tags: string[]) => void;
    showLabel?: boolean;
    maxTags?: number;
}

export function TagSelector({
    selectedTags,
    onChange,
    showLabel = true,
    maxTags = 3,
}: TagSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    const toggleTag = (tagId: string) => {
        if (selectedTags.includes(tagId)) {
            onChange(selectedTags.filter(t => t !== tagId));
        } else if (selectedTags.length < maxTags) {
            onChange([...selectedTags, tagId]);
        }
    };

    return (
        <div className="relative">
            {showLabel && (
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Tags (optional)
                </label>
            )}

            {/* Selected Tags Display */}
            <div className="flex flex-wrap gap-2 mb-2">
                {selectedTags.map(tagId => {
                    const tag = PREDEFINED_TAGS.find(t => t.id === tagId);
                    if (!tag) return null;
                    return (
                        <span
                            key={tagId}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                            style={{
                                background: `${tag.color}20`,
                                color: tag.color,
                            }}
                        >
                            {tag.name}
                            <button
                                onClick={() => toggleTag(tagId)}
                                className="p-0.5 rounded hover:bg-white/20"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    );
                })}
            </div>

            {/* Tag Picker Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
                style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                }}
            >
                <Tag className="w-4 h-4" />
                <span>Add Tags</span>
                {selectedTags.length > 0 && (
                    <span
                        className="px-1.5 py-0.5 rounded-full text-xs"
                        style={{ background: 'var(--color-cyan-500)', color: 'white' }}
                    >
                        {selectedTags.length}/{maxTags}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div
                        className="absolute left-0 top-full mt-2 py-2 rounded-xl shadow-lg z-20 min-w-[200px]"
                        style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                        }}
                    >
                        <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            Categories
                        </div>
                        {PREDEFINED_TAGS.map(tag => {
                            const isSelected = selectedTags.includes(tag.id);
                            const isDisabled = !isSelected && selectedTags.length >= maxTags;

                            return (
                                <button
                                    key={tag.id}
                                    onClick={() => !isDisabled && toggleTag(tag.id)}
                                    disabled={isDisabled}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5'
                                        }`}
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="w-3 h-3 rounded-full"
                                            style={{ background: tag.color }}
                                        />
                                        <span>{tag.name}</span>
                                    </div>
                                    {isSelected && (
                                        <Check className="w-4 h-4" style={{ color: 'var(--color-cyan-500)' }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

// Tag Chips Display (for profile rows)
interface TagChipsProps {
    tags: string[];
    size?: 'sm' | 'md';
    maxVisible?: number;
}

export function TagChips({ tags, size = 'sm', maxVisible = 2 }: TagChipsProps) {
    if (!tags || tags.length === 0) return null;

    const visibleTags = tags.slice(0, maxVisible);
    const remainingCount = tags.length - maxVisible;

    return (
        <div className="flex items-center gap-1 flex-wrap">
            {visibleTags.map(tagId => {
                const tag = PREDEFINED_TAGS.find(t => t.id === tagId);
                if (!tag) return null;

                return (
                    <span
                        key={tagId}
                        className={`inline-flex items-center rounded-full font-medium ${size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
                            }`}
                        style={{
                            background: `${tag.color}20`,
                            color: tag.color,
                        }}
                    >
                        {tag.name}
                    </span>
                );
            })}
            {remainingCount > 0 && (
                <span
                    className={`inline-flex items-center rounded-full font-medium ${size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
                        }`}
                    style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-muted)',
                    }}
                >
                    +{remainingCount}
                </span>
            )}
        </div>
    );
}

// Tag Filter for sidebar
interface TagFilterProps {
    selectedTag: string | null;
    onSelect: (tag: string | null) => void;
    tags: string[];
}

export function TagFilter({ selectedTag, onSelect, tags }: TagFilterProps) {
    // Count occurrences of each tag
    const tagCounts = tags.reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const usedTags = PREDEFINED_TAGS.filter(tag => tagCounts[tag.id]);

    if (usedTags.length === 0) return null;

    return (
        <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wider px-3 mb-2"
                style={{ color: 'var(--text-muted)' }}
            >
                Categories
            </div>
            {usedTags.map(tag => {
                const isActive = selectedTag === tag.id;

                return (
                    <button
                        key={tag.id}
                        onClick={() => onSelect(isActive ? null : tag.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${isActive ? 'scale-[1.02]' : 'hover:bg-white/5'
                            }`}
                        style={{
                            background: isActive ? `${tag.color}20` : 'transparent',
                            color: isActive ? tag.color : 'var(--text-secondary)',
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ background: tag.color }}
                            />
                            <span>{tag.name}</span>
                        </div>
                        <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                                background: isActive ? `${tag.color}30` : 'var(--bg-tertiary)',
                                color: isActive ? tag.color : 'var(--text-muted)',
                            }}
                        >
                            {tagCounts[tag.id]}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
