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
            className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all duration-200 ${checked ? 'bg-cyan-500 border-cyan-500' : 'bg-slate-700 border-slate-600'
                }`}
            role="checkbox"
            aria-checked={checked}
        >
            {checked && <Check className="w-4 h-4 text-slate-900" />}
        </div>
        <span className="text-slate-300">{label}</span>
    </label>
));

Checkbox.displayName = 'Checkbox';
