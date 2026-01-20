'use client';

import React, { memo } from 'react';
import { Plus, Minus } from 'lucide-react';
import { CounterInputProps } from '../types';

export const CounterInput = memo<CounterInputProps>(({
    label,
    value,
    onIncrement,
    onDecrement,
    min = 1
}) => (
    <div className="flex items-center justify-between">
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <div
            className="flex items-center space-x-2 rounded-lg p-1"
            style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)'
            }}
            role="group"
            aria-label={label}
        >
            <button
                onClick={onDecrement}
                className="p-2 rounded-md transition-colors disabled:opacity-50"
                style={{ color: 'var(--text-secondary)' }}
                disabled={value <= min}
                aria-label={`Decrease ${label}`}
                type="button"
            >
                <Minus className="w-4 h-4" />
            </button>
            <span
                className="px-3 font-mono text-lg w-12 text-center"
                style={{ color: 'var(--color-cyan-500)' }}
                aria-live="polite"
            >
                {value}
            </span>
            <button
                onClick={onIncrement}
                className="p-2 rounded-md transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                aria-label={`Increase ${label}`}
                type="button"
            >
                <Plus className="w-4 h-4" />
            </button>
        </div>
    </div>
));

CounterInput.displayName = 'CounterInput';
