// app/components/dashboard/TagSelector.tsx
'use client';

import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { PREDEFINED_TAGS, Tag as TagType } from '../../lib/tags';

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
    const [inputValue, setInputValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter available tags based on input and already selected
    const availableTags = PREDEFINED_TAGS.filter(tag =>
        !selectedTags.includes(tag.id) &&
        tag.name.toLowerCase().includes(inputValue.toLowerCase())
    );

    const canAddMore = selectedTags.length < maxTags;

    const addTag = (tagId: string) => {
        if (selectedTags.length < maxTags && !selectedTags.includes(tagId)) {
            onChange([...selectedTags, tagId]);
            setInputValue('');
        }
    };

    const removeTag = (tagId: string) => {
        onChange(selectedTags.filter(t => t !== tagId));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && inputValue === '' && selectedTags.length > 0) {
            removeTag(selectedTags[selectedTags.length - 1]);
        } else if (e.key === 'Enter' && availableTags.length > 0) {
            e.preventDefault();
            addTag(availableTags[0].id);
        }
    };

    return (
        <div>
            {showLabel && (
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Tags <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(optional)</span>
                </label>
            )}

            {/* Selected Tags */}
            {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedTags.map(tagId => {
                        const tag = PREDEFINED_TAGS.find(t => t.id === tagId);
                        if (!tag) return null;
                        return (
                            <span
                                key={tagId}
                                className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg text-xs font-medium"
                                style={{
                                    background: `${tag.color}15`,
                                    color: tag.color,
                                    border: `1px solid ${tag.color}30`,
                                }}
                            >
                                <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ background: tag.color }}
                                />
                                {tag.name}
                                <button
                                    type="button"
                                    onClick={() => removeTag(tagId)}
                                    className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        );
                    })}
                </div>
            )}

            {/* Input - minimal styling */}
            {canAddMore && (
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type to filter categories..."
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                    style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        border: 'none',
                    }}
                />
            )}

            {/* Inline Suggestions as clickable chips */}
            {canAddMore && (isFocused || inputValue) && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {availableTags.length > 0 ? (
                        availableTags.map(tag => (
                            <button
                                key={tag.id}
                                type="button"
                                onClick={() => addTag(tag.id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                                style={{
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-color)',
                                }}
                            >
                                <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ background: tag.color }}
                                />
                                {tag.name}
                            </button>
                        ))
                    ) : inputValue ? (
                        <span className="text-xs py-1" style={{ color: 'var(--text-muted)' }}>
                            No matching categories
                        </span>
                    ) : null}
                </div>
            )}

            {/* Max reached indicator */}
            {!canAddMore && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Maximum {maxTags} tags selected
                </p>
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
