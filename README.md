# ZeroKey

ZeroKey is a stateless password generator. You enter a master key, a site, and a login. The password is derived in the browser and is not stored.

Firebase stores the recipe (site, login, algorithm, and options) so you can generate the same password again. It does not store the master key or the generated password.

The web app lives in [`Web/`](Web/). An Android client is planned and will live in [`Android/`](Android/). It is not started.

## Generators

- **Secure.** PBKDF2-SHA256. The master key never leaves the browser.
- **Memorable.** A mnemonic built from Indian river names, a shift, and a magic number. It is easier to say aloud and has little secrecy. Anyone who knows the email, the site, and those two options can rebuild it.

Do not change [`Web/app/lib/generators/pbkdf2-generator.ts`](Web/app/lib/generators/pbkdf2-generator.ts) or [`Web/app/lib/generators/memorizable-generator.ts`](Web/app/lib/generators/memorizable-generator.ts). People already use the passwords those functions produce.

## Run the web app

```bash
cd Web
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Fill `.env.local` from your own Firebase project before signing in. Variable names are listed in [Web/DEPLOYMENT.md](Web/DEPLOYMENT.md).

```bash
npm run test:run
npx tsc --noEmit
```

## Security model

- The master key stays in React state for the session. It is not written to Firebase or to a backup file.
- A vault backup is a JSON file of recipes. The download name is `zerokey-backup-YYYY-MM-DD.json`.
- Firestore rules must restrict every profile to its owner. The rules file is [Web/firestore.rules](Web/firestore.rules).
- Client Firebase config is public by design. The rules are the boundary.

Report vulnerabilities privately. See [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
