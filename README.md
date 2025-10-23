# KPA-Election - STV Voting System 🗳️

A full-stack **Single Transferable Vote (STV)** election management system built with Turborepo.

## 🚀 Deploy to Vercel (Single Project)

Deploy the **entire system as ONE Vercel project** with all apps on the same URL:

📘 **[Vercel Single Project Deployment Guide](./VERCEL_SINGLE_PROJECT.md)** ⭐

```
https://yourproject.vercel.app/         → Voter Interface
https://yourproject.vercel.app/admin    → Admin Dashboard
https://yourproject.vercel.app/api/*    → Backend API
```

**Quick Deploy:**
```bash
git push origin main
# Then import to Vercel dashboard
```

---

## 💻 Local Development

```sh
# Install dependencies
npm install

# Set up API environment
cd apps/api
npm run setup-env
npm run db:push
npm run create-admin

# Start all apps (from root)
cd ../..
npm run dev
```

**Local URLs:**
- API: http://localhost:5001
- Voter: http://localhost:3000
- Admin: http://localhost:3001

## What's inside?

This Turborepo includes the following packages and apps:

### Apps and Packages

- `api`: an [Express](https://expressjs.com/) server
- `storefront`: a [Next.js](https://nextjs.org/) app
- `admin`: a [Vite](https://vitejs.dev/) single page app
- `blog`: a [Remix](https://remix.run/) blog
- `@repo/eslint-config`: ESLint configurations used throughout the monorepo
- `@repo/jest-presets`: Jest configurations
- `@repo/logger`: isomorphic logger (a small wrapper around console.log)
- `@repo/ui`: a dummy React UI library (which contains `<CounterButton>` and `<Link>` components)
- `@repo/typescript-config`: tsconfig.json's used throughout the monorepo

Each package and app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Jest](https://jestjs.io) test runner for all things JavaScript
- [Prettier](https://prettier.io) for code formatting
