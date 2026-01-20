'use client';

import React, { memo } from 'react';
import { Shield, Brain } from 'lucide-react';
import { GeneratorType, GENERATORS } from '../lib/generators';

interface AlgorithmSelectorProps {
    algorithm: GeneratorType;
    onChange: (algorithm: GeneratorType) => void;
}

export const AlgorithmSelector = memo<AlgorithmSelectorProps>(({
    algorithm,
    onChange
}) => {
    const algorithms: GeneratorType[] = ['pbkdf2', 'memorizable'];

    return (
        <div
            className="flex gap-2 p-1 rounded-xl mb-6"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            role="tablist"
            aria-label="Password generation method"
        >
            {algorithms.map((alg) => {
                const info = GENERATORS[alg];
                const isActive = algorithm === alg;
                const Icon = alg === 'pbkdf2' ? Shield : Brain;

                return (
                    <button
                        key={alg}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(alg)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200"
                        style={{
                            background: isActive ? 'var(--color-cyan-500)' : 'transparent',
                            color: isActive ? '#ffffff' : 'var(--text-secondary)',
                            boxShadow: isActive ? '0 4px 12px rgba(6, 182, 212, 0.3)' : 'none'
                        }}
                    >
                        <Icon className="w-5 h-5" aria-hidden="true" />
                        <span>{info.name}</span>
                    </button>
                );
            })}
        </div>
    );
});

AlgorithmSelector.displayName = 'AlgorithmSelector';

