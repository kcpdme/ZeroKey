import { webcrypto } from 'node:crypto';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from '../app/page';
import type { PasswordProfile } from '../app/services/ProfileService';
import { SettingsService } from '../app/services/SettingsService';
import vectors from './fixtures/determinism-vectors.json';

const profiles = vi.hoisted(() => ({
    findAccountProfiles: vi.fn(),
    createProfile: vi.fn(),
    prepareVersion: vi.fn(),
    confirmVersion: vi.fn(),
    getUserProfiles: vi.fn(),
    getCurrentProfile: vi.fn(),
    updateLastUsed: vi.fn(),
}));

vi.mock('../app/services/ProfileService', () => ({ ProfileService: profiles }));
vi.mock('../app/context/AuthContext', () => {
    const signedIn = { user: { uid: 'test-user' }, loading: false, clearError: () => {} };
    return { useAuth: () => signedIn };
});
vi.mock('../app/lib/firebase', () => ({ auth: {}, db: {} }));

const { site, login, masterPassword } = vectors.pbkdf2.inputs[0].params;
const [v1, , v2] = vectors.pbkdf2.expected[0];
const current: PasswordProfile = {
    id: 'profile-1',
    userId: 'test-user',
    site,
    login,
    algorithm: 'pbkdf2',
    options: {
        length: 16, counter: 1, userSalt: '',
        useLowercase: true, useUppercase: true, useNumbers: true, useSymbols: true,
        shift: 1, magicNumber: 0,
    },
    createdAt: null,
    updatedAt: null,
};

function submitHomepageRecipe() {
    fireEvent.change(screen.getByPlaceholderText('github.com'), { target: { value: site } });
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: login } });
    fireEvent.change(screen.getByPlaceholderText('Secret password'), { target: { value: masterPassword } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate password' }));
}

async function expectDashboardPassword(expected: string) {
    fireEvent.click(await screen.findByRole('button', { name: /example\.com.*fixture@example\.com/ }));
    const modal = within(await screen.findByRole('dialog', { name: 'Generate Password' }));
    fireEvent.change(modal.getByPlaceholderText('Enter your master password'), { target: { value: masterPassword } });
    fireEvent.click(modal.getByRole('button', { name: 'Generate Password' }));
    fireEvent.click(await modal.findByRole('button', { name: 'Show password' }));
    expect(modal.getByText(expected).tagName).toBe('CODE');
    expect(modal.queryByRole('button', { name: 'Make current' })).toBeNull();
    fireEvent.click(modal.getByRole('button', { name: 'Done' }));
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('crypto', webcrypto);
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.spyOn(SettingsService, 'getSettings').mockResolvedValue(SettingsService.getDefaultSettings());
    profiles.updateLastUsed.mockResolvedValue(undefined);
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('signed-in homepage recipe autosave', () => {
    it('creates the first recipe and displays its original password', async () => {
        profiles.findAccountProfiles.mockResolvedValue([]);
        profiles.createProfile.mockResolvedValue({ status: 'created', profile: current });
        render(<HomePage />);
        submitHomepageRecipe();

        await screen.findByText('Recipe saved to vault.');
        expect(profiles.createProfile).toHaveBeenCalledExactlyOnceWith({
            userId: current.userId,
            site,
            login,
            algorithm: 'pbkdf2',
            options: {
                length: 16, counter: 1, userSalt: '',
                useLowercase: true, useUppercase: true, useNumbers: true, useSymbols: true,
            },
            tags: [],
        });
        fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
        expect(screen.getByLabelText('Password visible').textContent).toBe(v1);
    });

    it('offers the saved account if another tab creates it first', async () => {
        profiles.findAccountProfiles.mockResolvedValue([]);
        profiles.createProfile.mockResolvedValue({ status: 'exists', profiles: [current] });
        render(<HomePage />);
        submitHomepageRecipe();

        await screen.findByRole('button', { name: 'Create new version' });
        expect(screen.queryByRole('region', { name: 'Generated password' })).toBeNull();
        expect(profiles.prepareVersion).not.toHaveBeenCalled();
        expect(profiles.confirmVersion).not.toHaveBeenCalled();
    });

    it('keeps the form retryable when the vault cannot be checked', async () => {
        profiles.findAccountProfiles.mockRejectedValue(new Error('Offline'));
        render(<HomePage />);
        submitHomepageRecipe();

        expect((await screen.findByRole('alert')).textContent).toMatch(/Could not check or save/);
        expect(profiles.createProfile).not.toHaveBeenCalled();
        expect(screen.queryByRole('region', { name: 'Generated password' })).toBeNull();
        expect((screen.getByRole('button', { name: 'Generate password' }) as HTMLButtonElement).disabled).toBe(false);
    });

    it('keeps the dashboard on the current recipe until a saved draft is confirmed', async () => {
        let saved = current;
        profiles.findAccountProfiles.mockImplementation(async () => [saved]);
        profiles.getUserProfiles.mockImplementation(async () => [saved]);
        profiles.getCurrentProfile.mockImplementation(async () => saved);
        profiles.prepareVersion.mockImplementation(async () => {
            saved = { ...saved, pendingVersion: { id: 'draft-2', options: { ...saved.options, counter: 2 }, reason: 'Password changed' } };
            return saved;
        });
        profiles.confirmVersion.mockImplementation(async () => {
            saved = { ...saved, options: saved.pendingVersion!.options, pendingVersion: undefined };
            return saved;
        });

        render(<HomePage />);
        submitHomepageRecipe();
        fireEvent.click(await screen.findByRole('button', { name: 'Create new version' }));
        const draft = within(await screen.findByRole('dialog', { name: 'Draft password · v2' }));
        expect(profiles.createProfile).not.toHaveBeenCalled();
        expect(profiles.confirmVersion).not.toHaveBeenCalled();
        fireEvent.click(draft.getByRole('button', { name: 'Close' }));

        fireEvent.click(screen.getByTitle('My Vault'));
        await expectDashboardPassword(v1);

        fireEvent.click(screen.getByTitle('Version History'));
        fireEvent.click(await screen.findByRole('button', { name: 'Generate draft password' }));
        const resumed = within(await screen.findByRole('dialog', { name: 'Draft password · v2' }));
        fireEvent.change(resumed.getByPlaceholderText('Enter your master password'), { target: { value: masterPassword } });
        fireEvent.click(resumed.getByRole('button', { name: 'Generate Password' }));
        fireEvent.click(await resumed.findByRole('button', { name: 'Show password' }));
        expect(resumed.getByText(v2).tagName).toBe('CODE');
        expect(profiles.confirmVersion).not.toHaveBeenCalled();

        fireEvent.click(resumed.getByRole('button', { name: 'Make current' }));
        await screen.findByRole('button', { name: /example\.com.*fixture@example\.com/ });
        expect(profiles.confirmVersion).toHaveBeenCalledExactlyOnceWith('profile-1', 'draft-2');
        await expectDashboardPassword(v2);
    });
});
