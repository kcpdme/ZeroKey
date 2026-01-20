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
            className="flex gap-2 p-1 bg-slate-800/50 rounded-xl mb-6"
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
                        className={`
              flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg
              font-medium transition-all duration-200
              ${isActive
                                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }
            `}
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
