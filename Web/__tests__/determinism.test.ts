// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { generateMemorizablePassword } from '../app/lib/generators/memorizable-generator';
import { generatePBKDF2Password } from '../app/lib/generators/pbkdf2-generator';
import vectors from './fixtures/determinism-vectors.json';

// These known answers were captured from the generators at vectors.sourceCommit.
// Keep them fixed: recapturing them after a change would hide compatibility breaks.
// Each expected row corresponds to one input, with one column per recipe.
const pbkdf2Cases = vectors.pbkdf2.inputs.flatMap(({ label, params }, inputIndex) =>
    vectors.pbkdf2.recipes.map((recipe, recipeIndex) => ({
        name: `${label} / ${recipe.label}`,
        params: { ...params, ...recipe.options },
        expected: vectors.pbkdf2.expected[inputIndex]?.[recipeIndex],
    })),
);

const memorableCases = vectors.memorable.inputs.flatMap(({ label, params }, inputIndex) =>
    vectors.memorable.recipes.map((recipe, recipeIndex) => ({
        name: `${label} / ${recipe.label}`,
        params,
        options: recipe.options,
        expected: vectors.memorable.expected[inputIndex]?.[recipeIndex],
    })),
);

describe('known-answer fixture coverage', () => {
    it.each([
        { name: 'PBKDF2', fixture: vectors.pbkdf2, cases: pbkdf2Cases },
        { name: 'Memorable', fixture: vectors.memorable, cases: memorableCases },
    ])('covers 2,500 named $name vectors with fixed outputs', ({ fixture, cases }) => {
        expect(cases).toHaveLength(2_500);
        expect(new Set(cases.map(({ name }) => name)).size).toBe(2_500);
        expect(fixture.expected).toHaveLength(fixture.inputs.length);
        for (const row of fixture.expected) {
            expect(row).toHaveLength(fixture.recipes.length);
            expect(row.every(password => password.length > 0)).toBe(true);
        }
    });
});

describe('PBKDF2 backwards compatibility', () => {
    it.concurrent.each(pbkdf2Cases)('$name', async ({ params, expected }) => {
        await expect(generatePBKDF2Password(params)).resolves.toBe(expected);
    });
});

describe('Memorable backwards compatibility', () => {
    it.each(memorableCases)('$name', ({ params, options, expected }) => {
        expect(generateMemorizablePassword(params, options)).toBe(expected);
    });
});
