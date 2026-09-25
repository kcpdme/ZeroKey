// Rejects option combinations that would hang the PBKDF2 mapper.
// The generator loop itself is unchanged. Successful passwords are unchanged.
// Defaults match generatePBKDF2Password: omitted flags mean "on".

export interface Pbkdf2CharsetOptions {
    length?: number;
    useLowercase?: boolean;
    useUppercase?: boolean;
    useNumbers?: boolean;
    useSymbols?: boolean;
}

export function countEnabledCharSets(options: Pbkdf2CharsetOptions): number {
    const enabled = [
        options.useLowercase !== false,
        options.useUppercase !== false,
        options.useNumbers !== false,
        options.useSymbols !== false,
    ];
    return enabled.filter(Boolean).length;
}

export function assertPbkdf2Generatable(options: Pbkdf2CharsetOptions): void {
    const sets = countEnabledCharSets(options);
    if (sets === 0) {
        throw new Error('At least one character set must be selected.');
    }

    const length = options.length ?? 16;
    if (length < sets) {
        throw new Error(
            `Password length (${length}) is shorter than the ${sets} selected character sets. Increase the length before generating.`
        );
    }
}
