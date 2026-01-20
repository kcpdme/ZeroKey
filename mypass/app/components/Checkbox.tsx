'use client';

import React, { memo } from 'react';
import { Check } from 'lucide-react';
import { CheckboxProps } from '../types';

export const Checkbox = memo<CheckboxProps>(({ id, label, checked, onChange }) => (
    <label htmlFor={id} className="flex items-center space-x-3 cursor-pointer select-none">
        <input
            type="checkbox"
            id={id}
            checked={checked}
            onChange={onChange}
            className="sr-only"
            aria-checked={checked}
        />
        <div
            className="w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all duration-200"
            style={{
                background: checked ? 'var(--color-cyan-500)' : 'var(--bg-tertiary)',
                borderColor: checked ? 'var(--color-cyan-500)' : 'var(--border-color)'
            }}
            role="checkbox"
            aria-checked={checked}
        >
            {checked && <Check className="w-4 h-4" style={{ color: '#ffffff' }} />}
        </div>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </label>
));

Checkbox.displayName = 'Checkbox';

