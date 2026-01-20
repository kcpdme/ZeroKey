'use client';

import React, { memo, ChangeEvent } from 'react';
import { Hash, MoveHorizontal } from 'lucide-react';

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
    showAsFields?: boolean; // When true, show as primary form fields
}

/**
 * Compact version for advanced options panel
 */
const CompactOptions = memo<MemorizableOptionsProps>(({ options, onChange }) => (
    <div className="space-y-4">
        {/* Formula Preview */}
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <div className="text-xs text-slate-500 mb-1">Formula</div>
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
                River2 from letter #{options.shift} of website (then +1)
            </div>
        </div>
    </div>
));

CompactOptions.displayName = 'CompactOptions';

/**
 * Primary input fields version (shown alongside email/site)
 * Simple text inputs - no spinners
 */
const FieldInputs = memo<Omit<MemorizableOptionsProps, 'showAsFields'>>(({ options, onChange }) => (
    <div className="space-y-4">
        {/* Shift Position - simple text input */}
        <div className="relative flex items-center">
            <div className="absolute left-0 pl-4 text-slate-400">
                <MoveHorizontal className="w-5 h-5" />
            </div>
            <input
                type="text"
                inputMode="numeric"
                placeholder="Shift Position (e.g., 3)"
                value={options.shift}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1) {
                        onChange('shift', val);
                    } else if (e.target.value === '' || e.target.value === '0') {
                        onChange('shift', 1);
                    }
                }}
                className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors"
                aria-label="Shift position - which letter of website to use"
            />
        </div>

        {/* Magic Number - simple text input */}
        <div className="relative flex items-center">
            <div className="absolute left-0 pl-4 text-slate-400">
                <Hash className="w-5 h-5" />
            </div>
            <input
                type="text"
                inputMode="numeric"
                placeholder="Magic Number (e.g., 23)"
                value={options.magicNumber}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 0) {
                        onChange('magicNumber', val);
                    } else if (e.target.value === '') {
                        onChange('magicNumber', 0);
                    }
                }}
                className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors"
                aria-label="Magic number - your secret number added to formula"
            />
        </div>
    </div>
));

FieldInputs.displayName = 'FieldInputs';

export const MemorizableOptions = memo<MemorizableOptionsProps>(({
    options,
    onChange,
    showAsFields = false
}) => {
    if (showAsFields) {
        return <FieldInputs options={options} onChange={onChange} />;
    }
    return <CompactOptions options={options} onChange={onChange} />;
});

MemorizableOptions.displayName = 'MemorizableOptions';
