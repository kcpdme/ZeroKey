import { generatePBKDF2Password, type PBKDF2Params } from '../../../../../Web/app/lib/generators/pbkdf2-generator';
import {
    DEFAULT_MEMORIZABLE_OPTIONS,
    generateMemorizablePassword,
    type MemorizableOptions,
} from '../../../../../Web/app/lib/generators/memorizable-generator';
import { normalizeLogin, normalizeSiteForAlgorithm, siteForSavedRecipe } from '../../../../../Web/app/lib/normalize-input';
import { assertPbkdf2Generatable } from '../../../../../Web/app/lib/pbkdf2-preflight';

type Recipe = { site: string; login: string } & (
    | { algorithm: 'pbkdf2'; masterPassword: string; options?: Omit<PBKDF2Params, 'masterPassword' | 'site' | 'login'> }
    | { algorithm: 'memorizable'; options?: MemorizableOptions }
);

interface EngineBridge {
    postMessage(message: string): void;
    onmessage: (event: MessageEvent<string>) => void;
}

const bridge = (window as Window & { ZeroKeyNative: EngineBridge }).ZeroKeyNative;

async function generate(recipe: Recipe): Promise<string> {
    const { algorithm } = recipe;
    const site = normalizeSiteForAlgorithm(recipe.site, algorithm);
    const login = normalizeLogin(recipe.login);
    if (!site || !login) throw new Error('Enter a site and login.');

    if (recipe.algorithm === 'pbkdf2') {
        if (!recipe.masterPassword) throw new Error('Enter your master key.');
        assertPbkdf2Generatable(recipe.options ?? {});
        return generatePBKDF2Password({ ...recipe.options, site, login, masterPassword: recipe.masterPassword });
    }

    return generateMemorizablePassword({ site, login }, recipe.options ?? DEFAULT_MEMORIZABLE_OPTIONS);
}

bridge.onmessage = async ({ data }) => {
    const { id, action, recipe } = JSON.parse(data) as { id: number; action: string; recipe: Recipe };
    try {
        if (action === 'account') {
            const { site, login } = recipe;
            bridge.postMessage(JSON.stringify({
                id,
                login: normalizeLogin(login),
                secureSite: normalizeSiteForAlgorithm(site, 'pbkdf2'),
                memorableSite: normalizeSiteForAlgorithm(site, 'memorizable'),
                savedSite: siteForSavedRecipe(site, recipe.algorithm),
            }));
        } else {
            bridge.postMessage(JSON.stringify({ id, password: await generate(recipe) }));
        }
    } catch (error) {
        bridge.postMessage(JSON.stringify({
            id, error: error instanceof Error ? error.message : 'Could not generate the password.',
        }));
    }
};

bridge.postMessage(JSON.stringify(crypto.subtle ? { ready: true } : { unavailable: true }));
