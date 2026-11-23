import { webcrypto } from 'node:crypto';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GenerateModal } from '../app/components/dashboard/GenerateModal';
import HomePage from '../app/page';
import type { PasswordProfile } from '../app/services/ProfileService';
import vectors from './fixtures/determinism-vectors.json';

vi.mock('../app/context/AuthContext', () => {
    const guestAuth = { user: null, clearError: () => {} };
    return { useAuth: () => guestAuth };
});
vi.mock('../app/lib/firebase', () => ({ auth: {}, db: {} }));

const { site, login, masterPassword } = vectors.pbkdf2.inputs.find(
    ({ label }) => label === 'normalized-standard',
)!.params;

function expectedPassword(
    fixture: typeof vectors.pbkdf2 | typeof vectors.memorable,
    recipeLabel: string,
): string {
    const inputIndex = fixture.inputs.findIndex(({ label }) => label === 'normalized-standard');
    const recipeIndex = fixture.recipes.findIndex(({ label }) => label === recipeLabel);
    return fixture.expected[inputIndex][recipeIndex];
}

const securePassword = expectedPassword(vectors.pbkdf2, 'medium-rotated-charset-5');
const memorablePassword = expectedPassword(vectors.memorable, 'shift-3-magic-42');
const savedProfile: PasswordProfile = {
    id: 'determinism-fixture',
    userId: 'test-user',
    site,
    login,
    algorithm: 'pbkdf2',
    options: {
        counter: 10,
        length: 24,
        userSalt: '  salt with spaces  ',
        useLowercase: true,
        useUppercase: false,
        useNumbers: true,
        useSymbols: false,
        shift: 3,
        magicNumber: 42,
    },
    createdAt: null,
    updatedAt: null,
};

beforeEach(() => {
    vi.stubGlobal('crypto', webcrypto);
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

function fillHomepageAccount() {
    fireEvent.change(screen.getByPlaceholderText('github.com'), { target: { value: site } });
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: login } });
}

async function expectHomepagePassword(expected: string) {
    fireEvent.click(screen.getByRole('button', { name: 'Generate password' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password visible').textContent).toBe(expected);
}

describe('homepage password compatibility', () => {
    it('passes the PBKDF2 counter, salt, length, and character settings to the generator', async () => {
        render(<HomePage />);
        fillHomepageAccount();
        fireEvent.change(screen.getByPlaceholderText('Secret password'), { target: { value: masterPassword } });
        fireEvent.change(screen.getByPlaceholderText('optional'), { target: { value: savedProfile.options.userSalt } });
        fireEvent.click(screen.getByRole('button', { name: /fine-tune/i }));
        fireEvent.change(screen.getByRole('slider', { name: 'Length' }), { target: { value: '24' } });
        fireEvent.change(screen.getByLabelText('Rotation'), { target: { value: '10' } });
        fireEvent.click(screen.getByRole('button', { name: 'A-Z' }));
        fireEvent.click(screen.getByRole('button', { name: '!@#' }));

        await expectHomepagePassword(securePassword);
    });

    it('passes the Memorable shift and magic number to the generator', async () => {
        render(<HomePage />);
        fillHomepageAccount();
        fireEvent.click(screen.getByRole('radio', { name: /easy to say/i }));
        fireEvent.change(screen.getByRole('textbox', { name: /shift position/i }), { target: { value: '3' } });
        fireEvent.change(screen.getByRole('textbox', { name: /magic number/i }), { target: { value: '42' } });

        await expectHomepagePassword(memorablePassword);
    });
});

describe('dashboard password compatibility', () => {
    it.each([
        { algorithm: 'pbkdf2', expected: securePassword },
        { algorithm: 'memorizable', expected: memorablePassword },
    ] as const)('regenerates a saved $algorithm recipe', async ({ algorithm, expected }) => {
        const profile = { ...savedProfile, algorithm };
        render(<GenerateModal profile={profile} onClose={() => {}} />);
        if (algorithm === 'pbkdf2') {
            fireEvent.change(screen.getByPlaceholderText('Enter your master password'), { target: { value: masterPassword } });
        }
        fireEvent.click(screen.getByRole('button', { name: 'Generate Password' }));

        const password = await screen.findByText('•'.repeat(Math.min(expected.length, 20)), { selector: 'code' });
        const [visibilityButton] = within(password.parentElement!).getAllByRole('button');
        fireEvent.click(visibilityButton);
        expect(password.textContent).toBe(expected);
    });
});
