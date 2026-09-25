# ZeroKey

ZeroKey is a stateless password generator. You enter a master key, a site, and a login. The password is derived in the browser and is not stored.

Firebase stores the recipe (site, login, algorithm, and options) so you can generate the same password again. It does not store the master key or the generated password.

The web app lives in [`Web/`](Web/). An Android client is planned and will live in [`Android/`](Android/). It is not started.

## Generators

- **Secure.** PBKDF2-SHA256. The master key never leaves the browser.
- **Memorable.** A mnemonic built from Indian river names, a shift, and a magic number. It is easier to say aloud and has little secrecy. Anyone who knows the email, the site, and those two options can rebuild it.

Do not change [`Web/app/lib/generators/pbkdf2-generator.ts`](Web/app/lib/generators/pbkdf2-generator.ts) or [`Web/app/lib/generators/memorizable-generator.ts`](Web/app/lib/generators/memorizable-generator.ts). People already use the passwords those functions produce.

## Get started

You can generate a password without an account. Sign-in, saved profiles, and backup need your own Firebase project. ZeroKey does not read a `google-services.json` or a service-account file. Configuration is environment variables only.

```bash
cd Web
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Firebase

1. Create a project in the [Firebase console](https://console.firebase.google.com/).
2. Add a **Web** app. Project settings → General → Your apps shows the config object.
3. Copy those values into `Web/.env.local`. Leave this file on your machine. It is gitignored.

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

4. Authentication → Sign-in method: enable **Email/Password** and **Google**. Firebase already authorizes `localhost`.
5. Firestore → Create database. The app uses the database id `default`.
6. Deploy [Web/firestore.rules](Web/firestore.rules) so one user cannot read another user's recipes:

```bash
cd Web
npx firebase-tools deploy --only firestore:rules
```

Restart `npm run dev` after you edit `.env.local`.

`NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is optional. It turns on App Check. The reCAPTCHA **secret** stays in the Firebase App Check console. It is not an env var in this app. Hosting steps are in [Web/DEPLOYMENT.md](Web/DEPLOYMENT.md). If you deploy on Vercel, set the project Root Directory to `Web`.

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
