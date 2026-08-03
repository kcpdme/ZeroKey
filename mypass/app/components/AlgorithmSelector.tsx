'use client';

import React, { memo } from 'react';
import { ShieldCheck, Waves } from 'lucide-react';
import { GeneratorType, GENERATORS } from '../lib/generators';

interface AlgorithmSelectorProps {
    algorithm: GeneratorType;
    onChange: (algorithm: GeneratorType) => void;
}

const modes: Array<{
    id: GeneratorType;
    label: string;
    blurb: string;
    icon: React.ReactNode;
}> = [
    {
        id: 'pbkdf2',
        label: 'Maximum strength',
        blurb: 'Long random-looking string',
        icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
        id: 'memorizable',
        label: 'Easy to say',
        blurb: 'River words you can read aloud',
        icon: <Waves className="h-4 w-4" />,
    },
];

export const AlgorithmSelector = memo<AlgorithmSelectorProps>(({
    algorithm,
    onChange
}) => (
    <div
        role="radiogroup"
        aria-label="Password style"
        className="grid grid-cols-2 gap-2 rounded-2xl p-1.5"
        style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
        }}
    >
        {modes.map((mode) => {
            const active = algorithm === mode.id;
            return (
                <button
                    key={mode.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange(mode.id)}
                    className="relative rounded-xl px-3 py-2.5 text-left transition-all duration-200"
                    style={active ? {
                        background: 'rgba(16, 185, 129, 0.1)',
                        boxShadow: 'inset 0 0 0 1px rgba(16, 185, 129, 0.4)',
                    } : {}}
                >
                    <span className="flex items-center gap-2">
                        <span style={{ color: active ? 'var(--color-cyan-500)' : 'var(--text-muted)' }}>
                            {mode.icon}
                        </span>
                        <span>
                            <span
                                className="block text-sm font-medium"
                                style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}
                            >
                                {mode.label}
                            </span>
                            <span
                                className="hidden text-xs sm:block"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                {mode.blurb}
                            </span>
                        </span>
                    </span>
                </button>
            );
        })}
    </div>
));

AlgorithmSelector.displayName = 'AlgorithmSelector';
