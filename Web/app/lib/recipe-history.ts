// Snapshots and rotation for vault recipes.
// Memorable rotation advances magicNumber because the memorable generator
// ignores counter. The generator functions themselves are not modified.

import { GeneratorType } from './generators/base';

export interface RecipeOptions {
    length?: number;
    counter?: number;
    useLowercase?: boolean;
    useUppercase?: boolean;
    useNumbers?: boolean;
    useSymbols?: boolean;
    userSalt?: string;
    shift?: number;
    magicNumber?: number;
}

export interface RecipeSnapshot {
    version: number;
    reason?: string;
    length?: number;
    shift?: number;
    magicNumber?: number;
    useLowercase?: boolean;
    useUppercase?: boolean;
    useNumbers?: boolean;
    useSymbols?: boolean;
    userSalt?: string;
}

function charset(value: boolean | undefined): boolean {
    return value !== false;
}

export function recipeOutputChanged(
    algorithm: GeneratorType,
    previous: RecipeOptions,
    next: RecipeOptions
): boolean {
    if ((previous.counter ?? 1) !== (next.counter ?? 1)) return true;

    if (algorithm === 'memorizable') {
        return (previous.shift ?? 1) !== (next.shift ?? 1)
            || (previous.magicNumber ?? 0) !== (next.magicNumber ?? 0);
    }

    return (previous.length ?? 16) !== (next.length ?? 16)
        || (previous.userSalt || '') !== (next.userSalt || '')
        || charset(previous.useLowercase) !== charset(next.useLowercase)
        || charset(previous.useUppercase) !== charset(next.useUppercase)
        || charset(previous.useNumbers) !== charset(next.useNumbers)
        || charset(previous.useSymbols) !== charset(next.useSymbols);
}

export function snapshotRecipe(
    options: RecipeOptions,
    reason: string
): RecipeSnapshot {
    const snapshot: RecipeSnapshot = {
        version: options.counter ?? 1,
        reason,
    };

    if (options.length !== undefined) snapshot.length = options.length;
    if (options.shift !== undefined) snapshot.shift = options.shift;
    if (options.magicNumber !== undefined) snapshot.magicNumber = options.magicNumber;
    if (options.useLowercase !== undefined) snapshot.useLowercase = options.useLowercase;
    if (options.useUppercase !== undefined) snapshot.useUppercase = options.useUppercase;
    if (options.useNumbers !== undefined) snapshot.useNumbers = options.useNumbers;
    if (options.useSymbols !== undefined) snapshot.useSymbols = options.useSymbols;
    if (options.userSalt !== undefined) snapshot.userSalt = options.userSalt;

    return snapshot;
}

/**
 * Options to store after an explicit rotate.
 * PBKDF2: counter + 1 (this is what the generator reads).
 * Memorable: counter + 1 for the version label, and magicNumber + 1 so the
 * existing formula actually yields a new password.
 */
export function nextRotatedOptions<T extends RecipeOptions>(
    algorithm: GeneratorType,
    options: T
): T {
    const counter = (options.counter ?? 1) + 1;
    if (algorithm === 'memorizable') {
        return {
            ...options,
            counter,
            magicNumber: (options.magicNumber ?? 0) + 1,
        };
    }
    return { ...options, counter };
}

/**
 * When a memorable save changes shift or magic but leaves counter alone,
 * advance the version label. Counter is not an input to that generator,
 * so this does not change the new password the user just chose.
 */
export function withMemorableVersionBump<T extends RecipeOptions>(
    previous: RecipeOptions,
    next: T
): T {
    const shiftChanged = (previous.shift ?? 1) !== (next.shift ?? 1);
    const magicChanged = (previous.magicNumber ?? 0) !== (next.magicNumber ?? 0);
    const counterChanged = (previous.counter ?? 1) !== (next.counter ?? 1);

    if ((shiftChanged || magicChanged) && !counterChanged) {
        return { ...next, counter: (previous.counter ?? 1) + 1 };
    }
    return next;
}

/** Apply a history row onto current options so an old password can be rebuilt. */
export function optionsForHistoryEntry<T extends RecipeOptions>(
    current: T,
    entry: RecipeSnapshot
): T {
    return {
        ...current,
        counter: entry.version,
        ...(entry.length !== undefined ? { length: entry.length } : {}),
        ...(entry.shift !== undefined ? { shift: entry.shift } : {}),
        ...(entry.magicNumber !== undefined ? { magicNumber: entry.magicNumber } : {}),
        ...(entry.useLowercase !== undefined ? { useLowercase: entry.useLowercase } : {}),
        ...(entry.useUppercase !== undefined ? { useUppercase: entry.useUppercase } : {}),
        ...(entry.useNumbers !== undefined ? { useNumbers: entry.useNumbers } : {}),
        ...(entry.useSymbols !== undefined ? { useSymbols: entry.useSymbols } : {}),
        ...(entry.userSalt !== undefined ? { userSalt: entry.userSalt } : {}),
    };
}
