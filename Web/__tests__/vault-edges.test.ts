import { describe, expect, it } from 'vitest';
import { generateMemorizablePassword } from '../app/lib/generators/memorizable-generator';
import { generatePBKDF2Password } from '../app/lib/generators/pbkdf2-generator';
import { normalizeLogin, normalizeSiteForAlgorithm } from '../app/lib/normalize-input';
import { assertPbkdf2Generatable } from '../app/lib/pbkdf2-preflight';
import {
    nextRotatedOptions,
    optionsForHistoryEntry,
    recipeOutputChanged,
    snapshotRecipe,
    withMemorableVersionBump,
} from '../app/lib/recipe-history';
import {
    explainMemorizablePassword,
    findMemorableCollisions,
} from '../app/lib/memorable-explain';
import { buildBackup, parseBackup } from '../app/lib/backup';

const pbkdf2Base = {
    masterPassword: 'TestMaster123!',
    login: 'User@Example.com',
    userSalt: '',
    counter: 1,
    length: 16,
    useSymbols: true,
    useNumbers: true,
    useUppercase: true,
    useLowercase: true,
};

describe('edge normalizers match the generators', () => {
    it('keeps a PBKDF2 query string and still matches the generator', async () => {
        const raw = 'https://www.Google.com/search?q=1';
        const normalized = normalizeSiteForAlgorithm(raw, 'pbkdf2');
        expect(normalized).toBe('google.com/search?q=1');

        const fromRaw = await generatePBKDF2Password({ ...pbkdf2Base, site: raw });
        const fromNormalized = await generatePBKDF2Password({
            ...pbkdf2Base,
            site: normalized,
            login: normalizeLogin(pbkdf2Base.login),
        });
        const withoutQuery = await generatePBKDF2Password({
            ...pbkdf2Base,
            site: 'google.com/search',
        });

        expect(fromRaw).toBe(fromNormalized);
        expect(fromRaw).not.toBe(withoutQuery);
    });

    it('strips memorable paths the same way the generator does', () => {
        const raw = 'https://www.Google.com/login?q=1';
        const normalized = normalizeSiteForAlgorithm(raw, 'memorizable');
        expect(normalized).toBe('google.com');

        const fromRaw = generateMemorizablePassword(
            { login: 'User@Example.com', site: raw },
            { shift: 1, magicNumber: 0 }
        );
        const fromNormalized = generateMemorizablePassword(
            { login: normalizeLogin('User@Example.com'), site: normalized },
            { shift: 1, magicNumber: 0 }
        );
        expect(fromRaw).toBe(fromNormalized);
        expect(fromRaw).toBe('UlhasHooghly@358');
    });
});

describe('PBKDF2 preflight', () => {
    it('allows a normal length', () => {
        expect(() => assertPbkdf2Generatable({ length: 16, useSymbols: true, useNumbers: true, useUppercase: true, useLowercase: true })).not.toThrow();
    });

    it('rejects a length shorter than the enabled sets', () => {
        expect(() => assertPbkdf2Generatable({
            length: 2,
            useSymbols: true,
            useNumbers: true,
            useUppercase: true,
            useLowercase: true,
        })).toThrow(/shorter than/);
    });

    it('rejects an empty character set', () => {
        expect(() => assertPbkdf2Generatable({
            length: 16,
            useSymbols: false,
            useNumbers: false,
            useUppercase: false,
            useLowercase: false,
        })).toThrow(/At least one character set/);
    });
});

describe('recipe history', () => {
    it('rotates memorable passwords by advancing the magic number', () => {
        const next = nextRotatedOptions('memorizable', { counter: 2, shift: 3, magicNumber: 7 });
        expect(next).toEqual({ counter: 3, shift: 3, magicNumber: 8 });
    });

    it('rotates secure passwords by advancing only the counter', () => {
        const next = nextRotatedOptions('pbkdf2', { counter: 2, length: 16, magicNumber: 7 });
        expect(next.counter).toBe(3);
        expect(next.magicNumber).toBe(7);
    });

    it('snapshots shift and magic so an old memorable password can be rebuilt', () => {
        const snap = snapshotRecipe({ counter: 4, shift: 2, magicNumber: 9, length: 16 }, 'Security breach');
        const restored = optionsForHistoryEntry(
            { counter: 5, shift: 2, magicNumber: 10, length: 20, useSymbols: true },
            snap
        );
        expect(restored.magicNumber).toBe(9);
        expect(restored.shift).toBe(2);
        expect(restored.counter).toBe(4);

        const current = generateMemorizablePassword(
            { login: 'user@example.com', site: 'google.com' },
            { shift: restored.shift!, magicNumber: restored.magicNumber! }
        );
        const original = generateMemorizablePassword(
            { login: 'user@example.com', site: 'google.com' },
            { shift: 2, magicNumber: 9 }
        );
        expect(current).toBe(original);
    });

    it('bumps the memorable version label when shift changes but counter does not', () => {
        const next = withMemorableVersionBump(
            { counter: 1, shift: 1, magicNumber: 0 },
            { counter: 1, shift: 4, magicNumber: 0 }
        );
        expect(next.counter).toBe(2);
        expect(next.shift).toBe(4);
        expect(recipeOutputChanged('memorizable', { counter: 1, shift: 1, magicNumber: 0 }, next)).toBe(true);
    });

    it('does not treat a tag-only save as a password change', () => {
        const options = { counter: 1, length: 16, userSalt: '', useSymbols: true, useLowercase: true, useUppercase: true, useNumbers: true };
        expect(recipeOutputChanged('pbkdf2', options, { ...options })).toBe(false);
    });
});

describe('memorable explanation', () => {
    it('describes the known google.com example without changing the password', () => {
        const explanation = explainMemorizablePassword('user@example.com', 'google.com', 1, 0);
        expect(explanation).not.toBeNull();
        expect(explanation!.story).toBe('Ulhas (u) meets Hooghly (g+1). 5×7+0.');
        expect(explanation!.password).toBe(generateMemorizablePassword(
            { login: 'user@example.com', site: 'google.com' },
            { shift: 1, magicNumber: 0 }
        ));
        expect(explanation!.password).toBe('UlhasHooghly@358');
        expect(explanation!.warnings).toHaveLength(0);
    });

    it('warns when shift runs past the site name', () => {
        const explanation = explainMemorizablePassword('user@example.com', 'google.com', 20, 0);
        expect(explanation!.warnings.some((warning) => warning.id === 'shift-past-end')).toBe(true);
        expect(explanation!.password).toBe(generateMemorizablePassword(
            { login: 'user@example.com', site: 'google.com' },
            { shift: 20, magicNumber: 0 }
        ));
    });

    it('warns when a river major is zero', () => {
        const explanation = explainMemorizablePassword('sam@example.com', 'google.com', 1, 0);
        expect(explanation!.river1).toBe('Sindhu');
        expect(explanation!.warnings.some((warning) => warning.id === 'zero-major')).toBe(true);
    });

    it('finds collisions that share the first login letter and site letter', () => {
        const hits = findMemorableCollisions(
            { site: 'google.com', login: 'user@gmail.com', shift: 1, magicNumber: 0 },
            [
                {
                    id: 'other',
                    site: 'gmail.com',
                    login: 'user@yahoo.com',
                    algorithm: 'memorizable',
                    options: { shift: 1, magicNumber: 0 },
                },
                {
                    id: 'secure',
                    site: 'github.com',
                    login: 'user@gmail.com',
                    algorithm: 'pbkdf2',
                    options: {},
                },
            ]
        );
        expect(hits).toEqual([{ site: 'gmail.com', login: 'user@yahoo.com' }]);
    });
});

describe('backup round trip', () => {
    it('keeps tags, notes, history, and policy', () => {
        const backup = buildBackup([
            {
                id: 'real-1',
                site: 'github.com',
                login: 'a@b.c',
                algorithm: 'memorizable',
                options: { shift: 3, magicNumber: 7, counter: 2 },
                favorite: true,
                tags: ['work'],
                notes: 'office',
                versionHistory: [{
                    version: 1,
                    shift: 3,
                    magicNumber: 6,
                    reason: 'Regular rotation',
                    changedAt: '2024-01-02T00:00:00.000Z',
                }],
                passwordPolicy: {
                    expiryDays: 90,
                    nextExpiryAt: '2024-04-01T00:00:00.000Z',
                },
            },
            {
                id: 'seed-1',
                site: 'should-skip.example',
                login: 'skip@example.com',
                algorithm: 'pbkdf2',
                options: { length: 16 },
            },
        ], '2024-01-01T00:00:00.000Z');

        expect(backup.version).toBe('1.1');
        expect(backup.profiles).toHaveLength(1);
        expect(backup.profiles[0].tags).toEqual(['work']);
        expect(backup.profiles[0].notes).toBe('office');
        expect(backup.profiles[0].versionHistory?.[0].magicNumber).toBe(6);
        expect(backup.profiles[0].passwordPolicy?.expiryDays).toBe(90);

        const parsed = parseBackup(JSON.parse(JSON.stringify(backup)));
        expect(parsed.invalid).toBe(0);
        expect(parsed.profiles[0].favorite).toBe(true);
        expect(parsed.profiles[0].versionHistory?.[0].shift).toBe(3);
    });

    it('rejects a profile with an unknown algorithm and still accepts older files', () => {
        const parsed = parseBackup({
            version: '1.0',
            profiles: [
                { site: 'ok.com', login: 'a@b.c', algorithm: 'pbkdf2', options: { length: 16, counter: 1 }, favorite: true },
                { site: 'bad.com', login: 'a@b.c', algorithm: 'sha1', options: {} },
                { site: '', login: 'a@b.c', algorithm: 'pbkdf2', options: {} },
            ],
        });
        expect(parsed.profiles).toHaveLength(1);
        expect(parsed.invalid).toBe(2);
        expect(parsed.profiles[0].favorite).toBe(true);
    });
});
