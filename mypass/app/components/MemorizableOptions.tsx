'use client';

import React, { memo, ChangeEvent } from 'react';
import { Hash, Calculator } from 'lucide-react';
import { CounterInput } from './CounterInput';

export interface MemorizableOptionsState {
    shift: number;
    magicNumber: number;
}

interface MemorizableOptionsProps {
    options: MemorizableOptionsState;
    onChange: <K extends keyof MemorizableOptionsState>(
        key: K,
        value: MemorizableOptionsState[K]
    ) => void;
}

export const MemorizableOptions = memo<MemorizableOptionsProps>(({
    options,
    onChange
}) => {
    return (
        <div className="space-y-4">
            {/* Shift Position */}
            <CounterInput
                label="Letter Position (Shift)"
                value={options.shift}
                onIncrement={() => onChange('shift', Math.min(options.shift + 1, 20))}
                onDecrement={() => onChange('shift', Math.max(options.shift - 1, 1))}
                min={1}
            />

            {/* Magic Number */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                    <Calculator className="w-4 h-4" aria-hidden="true" />
                    <span>Magic Number</span>
                </div>
                <div className="flex items-center">
                    <input
                        type="number"
                        min="0"
                        max="999"
                        value={options.magicNumber}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 0 && val <= 999) {
                                onChange('magicNumber', val);
                            }
                        }}
                        className="w-20 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-center font-mono text-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                        aria-label="Magic number for password generation"
                    />
                </div>
            </div>

            {/* Formula Preview */}
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="text-xs text-slate-500 mb-1">Formula Preview</div>
                <div className="font-mono text-sm text-slate-300">
                    <span className="text-cyan-400">River1</span>
                    <span className="text-slate-500"> + </span>
                    <span className="text-cyan-400">River2</span>
                    <span className="text-slate-500"> + @ + (</span>
                    <span className="text-amber-400">M1</span>
                    <span className="text-slate-500"> × </span>
                    <span className="text-amber-400">M2</span>
                    <span className="text-slate-500"> + </span>
                    <span className="text-green-400">{options.magicNumber}</span>
                    <span className="text-slate-500">) + </span>
                    <span className="text-pink-400">checksum</span>
                </div>
                <div className="text-xs text-slate-500 mt-2">
                    Using letter #{options.shift} of website (then +1)
                </div>
            </div>
        </div>
    );
});

MemorizableOptions.displayName = 'MemorizableOptions';
