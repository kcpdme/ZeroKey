'use client';

import React, { memo, forwardRef } from 'react';
import { FormInputProps } from '../types';

export const FormInput = memo(forwardRef<HTMLInputElement, FormInputProps>(
    ({ icon, label, ...props }, ref) => (
        <div className="relative flex items-center">
            <div
                className="absolute left-0 pl-4"
                style={{ color: 'var(--text-muted)' }}
            >
                {icon}
            </div>
            <input
                ref={ref}
                {...props}
                aria-label={label}
                className="w-full pl-12 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none transition-all duration-200"
                style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--input-shadow, none)'
                }}
            />
        </div>
    )
));

FormInput.displayName = 'FormInput';

