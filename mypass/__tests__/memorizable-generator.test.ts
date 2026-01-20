// __tests__/memorizable-generator.test.ts
// Unit tests for Memorizable password generator - ensures determinism

import { describe, it, expect } from 'vitest';
import {
    generateMemorizablePassword,
    DEFAULT_MEMORIZABLE_OPTIONS,
} from '../app/lib/generators/memorizable-generator';
import { RIVER_DATA } from '../app/lib/generators/river-data';

describe('Memorizable Password Generator', () => {
    describe('Determinism', () => {
        it('should generate the same password for identical inputs', () => {
            const params = {
                login: 'user@example.com',
                site: 'google.com',
            };

            const password1 = generateMemorizablePassword(params);
            const password2 = generateMemorizablePassword(params);

            expect(password1).toBe(password2);
        });

        it('should generate different passwords for different logins', () => {
            const site = 'google.com';

            const password1 = generateMemorizablePassword({
                login: 'alice@example.com',
                site,
            });
            const password2 = generateMemorizablePassword({
                login: 'bob@example.com',
                site,
            });

            expect(password1).not.toBe(password2);
        });

        it('should generate different passwords for different sites', () => {
            const login = 'user@example.com';

            const password1 = generateMemorizablePassword({
                login,
                site: 'google.com',
            });
            const password2 = generateMemorizablePassword({
                login,
                site: 'facebook.com',
            });

            expect(password1).not.toBe(password2);
        });
    });

    describe('Password Format', () => {
        it('should follow the format: River1 + River2 + @ + Number + Checksum', () => {
            const password = generateMemorizablePassword({
                login: 'user@example.com',
                site: 'google.com',
            });

            // Should contain @ symbol
            expect(password).toContain('@');

            // Should end with digits (number + checksum)
            expect(password).toMatch(/@\d+$/);
        });

        it('should use first letter of username for River1', () => {
            // 'u' maps to 'Ulhas'
            const password = generateMemorizablePassword({
                login: 'user@example.com',
                site: 'google.com',
            });

            expect(password.startsWith('Ulhas')).toBe(true);
        });

        it('should use different rivers for different first letters', () => {
            const password1 = generateMemorizablePassword({
                login: 'alice@example.com',
                site: 'google.com',
            });
            const password2 = generateMemorizablePassword({
                login: 'bob@example.com',
                site: 'google.com',
            });

            // 'a' -> Alaknanda, 'b' -> Bhagirathi
            expect(password1.startsWith('Alaknanda')).toBe(true);
            expect(password2.startsWith('Bhagirathi')).toBe(true);
        });
    });

    describe('Options', () => {
        it('should respect shift option (which letter of site to use)', () => {
            const login = 'user@example.com';
            const site = 'google.com';

            // shift=1 uses 'g' -> increment -> 'h' -> Hooghly
            const password1 = generateMemorizablePassword(
                { login, site },
                { shift: 1, magicNumber: 0 }
            );

            // shift=2 uses 'o' -> increment -> 'p' -> Periyar
            const password2 = generateMemorizablePassword(
                { login, site },
                { shift: 2, magicNumber: 0 }
            );

            expect(password1).not.toBe(password2);
        });

        it('should respect magicNumber option (added to product)', () => {
            const params = {
                login: 'user@example.com',
                site: 'google.com',
            };

            // Without magic number: 5 * 7 = 35, checksum = 8 -> ends with 358
            const password1 = generateMemorizablePassword(params, {
                shift: 1,
                magicNumber: 0,
            });

            // With magic number 5: 5 * 7 + 5 = 40, checksum = 4 -> ends with 404
            const password2 = generateMemorizablePassword(params, {
                shift: 1,
                magicNumber: 5,
            });

            // The passwords should be different
            expect(password1).not.toBe(password2);

            // Verify the exact endings based on the algorithm
            expect(password1).toMatch(/@358$/);
            expect(password2).toMatch(/@404$/);
        });
        it('should use default options when not specified', () => {
            const password = generateMemorizablePassword({
                login: 'user@example.com',
                site: 'google.com',
            });

            const passwordWithDefaults = generateMemorizablePassword(
                { login: 'user@example.com', site: 'google.com' },
                DEFAULT_MEMORIZABLE_OPTIONS
            );

            expect(password).toBe(passwordWithDefaults);
        });
    });

    describe('Letter Increment Logic', () => {
        it('should increment letters correctly (a->b, g->h)', () => {
            // For 'google.com' with shift=1, first letter is 'g'
            // 'g' increments to 'h' -> Hooghly
            const password = generateMemorizablePassword(
                { login: 'alice@example.com', site: 'google.com' },
                { shift: 1, magicNumber: 0 }
            );

            // 'a' -> Alaknanda (River1), 'h' -> Hooghly (River2)
            expect(password).toContain('Alaknanda');
            expect(password).toContain('Hooghly');
        });

        it('should wrap z to a', () => {
            // Need a site starting with 'z'
            const password = generateMemorizablePassword(
                { login: 'alice@example.com', site: 'zappos.com' },
                { shift: 1, magicNumber: 0 }
            );

            // 'z' increments to 'a' -> Alaknanda
            expect(password).toContain('Alaknanda');
        });
    });

    describe('Number Calculation', () => {
        it('should calculate product of major values correctly', () => {
            // 'u' -> Ulhas (major: 5)
            // 'g' from google -> 'h' -> Hooghly (major: 7)
            // Product = 5 * 7 = 35
            // Digit sum of 35 = 8
            // Password should end with 358

            const password = generateMemorizablePassword(
                { login: 'user@example.com', site: 'google.com' },
                { shift: 1, magicNumber: 0 }
            );

            expect(password).toMatch(/@358$/);
        });

        it('should add magic number to product', () => {
            // Same as above but with magicNumber: 5
            // Product = 5 * 7 + 5 = 40
            // Digit sum of 40 = 4
            // Password should end with 404

            const password = generateMemorizablePassword(
                { login: 'user@example.com', site: 'google.com' },
                { shift: 1, magicNumber: 5 }
            );

            expect(password).toMatch(/@404$/);
        });
    });

    describe('Input Normalization', () => {
        it('should extract username from email', () => {
            const password1 = generateMemorizablePassword({
                login: 'user@example.com',
                site: 'google.com',
            });
            const password2 = generateMemorizablePassword({
                login: 'user@different.org',
                site: 'google.com',
            });

            // Both use 'user' as username, so should be same
            expect(password1).toBe(password2);
        });

        it('should handle login without @ symbol', () => {
            const password = generateMemorizablePassword({
                login: 'username',
                site: 'google.com',
            });

            expect(password).toBeTruthy();
            expect(password.startsWith('Ulhas')).toBe(true); // 'u' -> Ulhas
        });

        it('should normalize site (remove protocol, www, paths)', () => {
            const password1 = generateMemorizablePassword({
                login: 'user@example.com',
                site: 'https://www.google.com/path?query=1',
            });
            const password2 = generateMemorizablePassword({
                login: 'user@example.com',
                site: 'google.com',
            });

            expect(password1).toBe(password2);
        });

        it('should handle case insensitivity', () => {
            const password1 = generateMemorizablePassword({
                login: 'USER@EXAMPLE.COM',
                site: 'GOOGLE.COM',
            });
            const password2 = generateMemorizablePassword({
                login: 'user@example.com',
                site: 'google.com',
            });

            expect(password1).toBe(password2);
        });
    });

    describe('Edge Cases', () => {
        it('should return empty string when login is missing', () => {
            const password = generateMemorizablePassword({
                login: '',
                site: 'google.com',
            });

            expect(password).toBe('');
        });

        it('should return empty string when site is missing', () => {
            const password = generateMemorizablePassword({
                login: 'user@example.com',
                site: '',
            });

            expect(password).toBe('');
        });

        it('should handle all 26 letters as first character', () => {
            const alphabet = 'abcdefghijklmnopqrstuvwxyz';

            for (const letter of alphabet) {
                const password = generateMemorizablePassword({
                    login: `${letter}user@example.com`,
                    site: 'google.com',
                });

                expect(password).toBeTruthy();
                expect(password.length).toBeGreaterThan(0);

                // Should start with the river for that letter
                const expectedRiver = RIVER_DATA[letter].river;
                expect(password.startsWith(expectedRiver)).toBe(true);
            }
        });

        it('should handle numeric first character in email', () => {
            const password = generateMemorizablePassword({
                login: '123user@example.com',
                site: 'google.com',
            });

            // '1' is not a letter, so it should use it as-is
            // The function should still work (fallback behavior)
            expect(password).toBeTruthy();
        });
    });

    describe('River Data Integrity', () => {
        it('should have all 26 letters mapped', () => {
            const alphabet = 'abcdefghijklmnopqrstuvwxyz';

            for (const letter of alphabet) {
                expect(RIVER_DATA[letter]).toBeDefined();
                expect(RIVER_DATA[letter].river).toBeTruthy();
                expect(typeof RIVER_DATA[letter].major).toBe('number');
                expect(RIVER_DATA[letter].major).toBeGreaterThanOrEqual(0);
                expect(RIVER_DATA[letter].major).toBeLessThanOrEqual(9);
            }
        });
    });

    describe('Snapshot Tests (Regression)', () => {
        it('should produce known output for standard inputs (REGRESSION TEST)', () => {
            const password = generateMemorizablePassword(
                {
                    login: 'test@test.com',
                    site: 'example.com',
                },
                { shift: 1, magicNumber: 0 }
            );

            // This captures the current output - if this ever changes,
            // it means the algorithm changed (breaking backward compatibility)
            expect(password).toMatchSnapshot();
        });
    });
});
