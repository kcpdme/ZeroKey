'use client';

import React, { memo, forwardRef } from 'react';
import { FormInputProps } from '../types';

export const FormInput = memo(forwardRef<HTMLInputElement, FormInputProps>(
    ({ icon, label, ...props }, ref) => (
        <div className="relative flex items-center">
            <div className="absolute left-0 pl-4 text-slate-400">{icon}</div>
            <input
                ref={ref}
                {...props}
                aria-label={label}
                className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors"
            />
        </div>
    )
));

FormInput.displayName = 'FormInput';
