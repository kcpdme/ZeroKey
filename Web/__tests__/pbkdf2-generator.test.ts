// __tests__/pbkdf2-generator.test.ts
// Unit tests for PBKDF2 password generator - ensures determinism

import { describe, it, expect } from 'vitest';
import { generatePBKDF2Password } from '../app/lib/generators/pbkdf2-generator';

describe('PBKDF2 Password Generator', () => {
    describe('Determinism', () => {
        it('should generate the same password for identical inputs', async () => {
            const params = {
                masterPassword: 'TestMaster123!',
                site: 'google.com',
                login: 'user@example.com',
                counter: 1,
                length: 16,
            };

            const password1 = await generatePBKDF2Password(params);
            const password2 = await generatePBKDF2Password(params);

            expect(password1).toBe(password2);
            expect(password1.length).toBe(16);
        });

        it('should generate different passwords for different master passwords', async () => {
            const baseParams = {
                site: 'google.com',
                login: 'user@example.com',
                counter: 1,
                length: 16,
            };

            const password1 = await generatePBKDF2Password({
                ...baseParams,
                masterPassword: 'Password1',
            });
            const password2 = await generatePBKDF2Password({
                ...baseParams,
                masterPassword: 'Password2',
            });

            expect(password1).not.toBe(password2);
        });

        it('should generate different passwords for different sites', async () => {
            const baseParams = {
                masterPassword: 'TestMaster123!',
                login: 'user@example.com',
                counter: 1,
                length: 16,
            };

            const password1 = await generatePBKDF2Password({
                ...baseParams,
                site: 'google.com',
            });
            const password2 = await generatePBKDF2Password({
                ...baseParams,
                site: 'facebook.com',
            });

            expect(password1).not.toBe(password2);
        });

        it('should generate different passwords for different counters', async () => {
            const baseParams = {
                masterPassword: 'TestMaster123!',
                site: 'google.com',
                login: 'user@example.com',
                length: 16,
            };

            const password1 = await generatePBKDF2Password({
                ...baseParams,
                counter: 1,
            });
            const password2 = await generatePBKDF2Password({
                ...baseParams,
                counter: 2,
            });

            expect(password1).not.toBe(password2);
        });
    });

    describe('Input Normalization', () => {
        it('should normalize site URLs (remove protocol, www, trailing slashes)', async () => {
            const baseParams = {
                masterPassword: 'TestMaster123!',
                login: 'user@example.com',
                counter: 1,
                length: 16,
            };

            const password1 = await generatePBKDF2Password({
                ...baseParams,
                site: 'https://www.google.com/',
            });
            const password2 = await generatePBKDF2Password({
                ...baseParams,
                site: 'google.com',
            });

            expect(password1).toBe(password2);
        });

        it('should normalize email case', async () => {
            const baseParams = {
                masterPassword: 'TestMaster123!',
                site: 'google.com',
                counter: 1,
                length: 16,
            };

            const password1 = await generatePBKDF2Password({
                ...baseParams,
                login: 'User@Example.COM',
            });
            const password2 = await generatePBKDF2Password({
                ...baseParams,
                login: 'user@example.com',
            });

            expect(password1).toBe(password2);
        });
    });

    describe('Character Set Options', () => {
        it('should respect length option', async () => {
            const password = await generatePBKDF2Password({
                masterPassword: 'TestMaster123!',
                site: 'google.com',
                login: 'user@example.com',
                length: 32,
            });

            expect(password.length).toBe(32);
        });

        it('should include lowercase letters when enabled', async () => {
            const password = await generatePBKDF2Password({
                masterPassword: 'TestMaster123!',
                site: 'google.com',
                login: 'user@example.com',
                length: 32,
                useLowercase: true,
                useUppercase: false,
                useNumbers: false,
                useSymbols: false,
            });

            expect(password).toMatch(/^[a-z]+$/);
        });

        it('should include uppercase letters when enabled', async () => {
            const password = await generatePBKDF2Password({
                masterPassword: 'TestMaster123!',
                site: 'google.com',
                login: 'user@example.com',
                length: 32,
                useLowercase: false,
                useUppercase: true,
                useNumbers: false,
                useSymbols: false,
            });

            expect(password).toMatch(/^[A-Z]+$/);
        });

        it('should include numbers when enabled', async () => {
            const password = await generatePBKDF2Password({
                masterPassword: 'TestMaster123!',
                site: 'google.com',
                login: 'user@example.com',
                length: 32,
                useLowercase: false,
                useUppercase: false,
                useNumbers: true,
                useSymbols: false,
            });

            expect(password).toMatch(/^[0-9]+$/);
        });

        it('should throw error when no character sets are selected', async () => {
            await expect(
                generatePBKDF2Password({
                    masterPassword: 'TestMaster123!',
                    site: 'google.com',
                    login: 'user@example.com',
                    useLowercase: false,
                    useUppercase: false,
                    useNumbers: false,
                    useSymbols: false,
                })
            ).rejects.toThrow('At least one character set must be selected');
        });
    });

    describe('User Salt', () => {
        it('should generate different passwords with different user salts', async () => {
            const baseParams = {
                masterPassword: 'TestMaster123!',
                site: 'google.com',
                login: 'user@example.com',
                counter: 1,
                length: 16,
            };

            const password1 = await generatePBKDF2Password({
                ...baseParams,
                userSalt: 'salt1',
            });
            const password2 = await generatePBKDF2Password({
                ...baseParams,
                userSalt: 'salt2',
            });

            expect(password1).not.toBe(password2);
        });

        it('should generate the same password when user salt is omitted vs empty string', async () => {
            const baseParams = {
                masterPassword: 'TestMaster123!',
                site: 'google.com',
                login: 'user@example.com',
                counter: 1,
                length: 16,
            };

            const password1 = await generatePBKDF2Password(baseParams);
            const password2 = await generatePBKDF2Password({
                ...baseParams,
                userSalt: '',
            });

            expect(password1).toBe(password2);
        });
    });

    describe('Edge Cases', () => {
        it('should return empty string when master password is missing', async () => {
            const password = await generatePBKDF2Password({
                masterPassword: '',
                site: 'google.com',
                login: 'user@example.com',
            });

            expect(password).toBe('');
        });

        it('should return empty string when site is missing', async () => {
            const password = await generatePBKDF2Password({
                masterPassword: 'TestMaster123!',
                site: '',
                login: 'user@example.com',
            });

            expect(password).toBe('');
        });

        it('should return empty string when login is missing', async () => {
            const password = await generatePBKDF2Password({
                masterPassword: 'TestMaster123!',
                site: 'google.com',
                login: '',
            });

            expect(password).toBe('');
        });

        it('should handle very long inputs', async () => {
            const longInput = 'a'.repeat(1000);
            const password = await generatePBKDF2Password({
                masterPassword: longInput,
                site: longInput,
                login: `${longInput}@example.com`,
                length: 16,
            });

            expect(password.length).toBe(16);
        });

        it('should handle special characters in inputs', async () => {
            const password = await generatePBKDF2Password({
                masterPassword: '🔐🔑💻',
                site: 'über-café.com',
                login: 'usér+täg@日本語.com',
                length: 16,
            });

            expect(password.length).toBe(16);
        });
    });

    describe('Snapshot Tests (Regression)', () => {
        // These tests capture known-good outputs to detect accidental changes
        it('should produce known output for standard inputs (REGRESSION TEST)', async () => {
            const password = await generatePBKDF2Password({
                masterPassword: 'MySecretMaster!',
                site: 'example.com',
                login: 'test@test.com',
                counter: 1,
                length: 16,
                useLowercase: true,
                useUppercase: true,
                useNumbers: true,
                useSymbols: true,
            });

            // This captures the current output - if this ever changes, 
            // it means the algorithm changed (breaking backward compatibility)
            expect(password).toMatchSnapshot();
        });
    });
});
