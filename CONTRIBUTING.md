# Contributing to ZeroKey

The web app is in `Web/`. The Android app is not started. See [Android/README.md](Android/README.md).

## Setup

```bash
cd Web
npm install
npm run test:run
```

Typecheck with `npx tsc --noEmit` from `Web/`.

## Password generators

Do not change these files:

- `Web/app/lib/generators/pbkdf2-generator.ts`
- `Web/app/lib/generators/memorizable-generator.ts`
- `Web/app/lib/generators/river-data.ts`

A change there produces a different password for every existing site. Fixes belong around the generators: saving, loading, and explaining a recipe. New memorable behavior needs a new algorithm id so current profiles keep working.

## Pull requests

Open a pull request against `main`. Describe what a user can do after the change. Do not commit `.env` files or Firebase secrets.
