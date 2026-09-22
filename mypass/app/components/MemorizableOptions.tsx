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
const CompactOptions = memo<MemorizableOptionsProps>(({ options }) => (
    <div className="space-y-4">
        {/* Formula Preview */}
        <div
            className="p-3.5 rounded-xl border transition-colors"
            style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
            }}
        >
            <div className="text-sm font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Formula
            </div>
            <div className="font-mono text-base" style={{ color: 'var(--text-primary)' }}>
                <span style={{ color: 'var(--color-cyan-500)' }}>River1</span>
                <span style={{ color: 'var(--text-secondary)' }}> + </span>
                <span style={{ color: 'var(--color-cyan-500)' }}>River2</span>
                <span style={{ color: 'var(--text-secondary)' }}> + @ + (</span>
                <span className="text-amber-500 font-semibold">M1</span>
                <span style={{ color: 'var(--text-secondary)' }}> × </span>
                <span className="text-amber-500 font-semibold">M2</span>
                <span style={{ color: 'var(--text-secondary)' }}> + </span>
                <span style={{ color: 'var(--color-cyan-500)' }}>{options.magicNumber || 0}</span>
                <span style={{ color: 'var(--text-secondary)' }}>) + </span>
                <span className="text-pink-500 font-semibold">checksum</span>
            </div>
            <div className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                River2 from letter #{options.shift || 1} of website (then +1)
            </div>
        </div>
    </div>
));

CompactOptions.displayName = 'CompactOptions';

/**
 * Primary input fields version (shown alongside email/site)
 */
const FieldInputs = memo<Omit<MemorizableOptionsProps, 'showAsFields'>>(({ options, onChange }) => (
    <div className="grid gap-4 sm:grid-cols-2">
        {/* Shift Position */}
        <div className="w-full">
            <label
                className="mb-1.5 block text-sm font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-secondary)' }}
            >
                Shift Position
            </label>
            <div
                className="zk-field flex items-center gap-2.5 rounded-xl border px-3.5 transition-colors"
                style={{
                    background: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                }}
            >
                <MoveHorizontal className="h-4 w-4 shrink-0" style={{ color: 'var(--text-secondary)' }} />
                <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Shift position (e.g., 3)"
                    value={options.shift === ('' as any) ? '' : options.shift}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const raw = e.target.value;
                        if (raw === '') {
                            onChange('shift', '' as any);
                        } else {
                            const val = parseInt(raw, 10);
                            if (!isNaN(val)) {
                                onChange('shift', val);
                            }
                        }
                    }}
                    onBlur={() => {
                        if (options.shift === ('' as any) || isNaN(Number(options.shift)) || Number(options.shift) < 1) {
                            onChange('shift', 1);
                        }
                    }}
                    className="zk-input h-11 w-full bg-transparent text-base font-normal tracking-normal focus:outline-none"
                    style={{ color: 'var(--text-primary)' }}
                    aria-label="Shift position - which letter of website to use"
                />
            </div>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Letter position of website.
            </p>
        </div>

        {/* Magic Number */}
        <div className="w-full">
            <label
                className="mb-1.5 block text-sm font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-secondary)' }}
            >
                Magic Number
            </label>
            <div
                className="zk-field flex items-center gap-2.5 rounded-xl border px-3.5 transition-colors"
                style={{
                    background: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                }}
            >
                <Hash className="h-4 w-4 shrink-0" style={{ color: 'var(--text-secondary)' }} />
                <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Magic number (e.g., 23)"
                    value={options.magicNumber === ('' as any) ? '' : options.magicNumber}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const raw = e.target.value;
                        if (raw === '') {
                            onChange('magicNumber', '' as any);
                        } else {
                            const val = parseInt(raw, 10);
                            if (!isNaN(val)) {
                                onChange('magicNumber', val);
                            }
                        }
                    }}
                    onBlur={() => {
                        if (options.magicNumber === ('' as any) || isNaN(Number(options.magicNumber))) {
                            onChange('magicNumber', 0);
                        }
                    }}
                    className="zk-input h-11 w-full bg-transparent text-base font-normal tracking-normal focus:outline-none"
                    style={{ color: 'var(--text-primary)' }}
                    aria-label="Magic number - your secret number added to formula"
                />
            </div>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Secret number added to formula.
            </p>
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
