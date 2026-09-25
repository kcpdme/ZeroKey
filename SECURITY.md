# Security policy

## Reporting

Please report a vulnerability through [GitHub private security advisories](https://github.com/kcpdme/ZeroKey/security/advisories/new) for this repository. Do not open a public issue for a security report.

## What ZeroKey stores

ZeroKey does not store generated passwords or the master key.

Firebase Auth identifies the account. Firestore stores recipes: site, login, algorithm, options (length, character sets, salt, counter, memorable shift, magic number), tags, notes, and version history. A JSON backup contains those recipes and never the master key.

The secure generator derives a password in the browser with PBKDF2. The memorable generator is a mnemonic formula. It is reproducible from the login, the site, the shift, and the magic number, and those options are saved with the recipe.

## What to deploy

Ship [Web/firestore.rules](Web/firestore.rules) with the app. An update must not be able to change a profile's `userId` to someone else.
