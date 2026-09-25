# ZeroKey web app

This directory is the ZeroKey web client. The project overview, threat model, and license are in the [repository README](../README.md).

```bash
cp .env.example .env.local
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Next.js app |
| `npm run test:run` | Run unit tests once |
| `npm run lint` | Lint |
| `npm run build` | Production build |

Firebase setup is in [DEPLOYMENT.md](DEPLOYMENT.md).
