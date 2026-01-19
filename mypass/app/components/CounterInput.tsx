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
        <span className="text-slate-300">{label}</span>
        <div
            className="flex items-center space-x-2 bg-slate-800 border border-slate-700 rounded-lg p-1"
            role="group"
            aria-label={label}
        >
            <button
                onClick={onDecrement}
                className="p-2 rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50"
                disabled={value <= min}
                aria-label={`Decrease ${label}`}
                type="button"
            >
                <Minus className="w-4 h-4" />
            </button>
            <span
                className="px-3 font-mono text-lg w-12 text-center"
                aria-live="polite"
            >
                {value}
            </span>
            <button
                onClick={onIncrement}
                className="p-2 rounded-md hover:bg-slate-700 transition-colors"
                aria-label={`Increase ${label}`}
                type="button"
            >
                <Plus className="w-4 h-4" />
            </button>
        </div>
    </div>
));

CounterInput.displayName = 'CounterInput';
