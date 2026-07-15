# Contributing to Orbit

Thanks for your interest in contributing to Orbit! This document covers everything you need to get a local development environment running and to submit changes back to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Commit Guidelines](#commit-guidelines)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Getting Help](#getting-help)

---

## Code of Conduct

Be respectful, constructive, and patient. We're a small team maintaining this in our spare time, and so are many of our contributors. Harassment, discrimination, or hostility of any kind will not be tolerated in issues, pull requests, or our Discord server.

---

## Ways to Contribute

You don't have to write code to help out:

- **Report bugs** via our [feedback portal](https://feedback.planetaryapp.us/bugs)
- **Suggest features** via the same [feedback portal](https://feedback.planetaryapp.us/bugs)
- **Improve documentation** — typos, unclear instructions, missing sections
- **Fix bugs or implement features** via pull request
- **Help other users** in our [Discord server](https://discord.com/invite/mWqdZmEkDc)
- **Review open pull requests** and leave feedback

---

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org) (LTS recommended)
- [npm](https://www.npmjs.com) or a compatible package manager (eg. pnpm)
- A Prisma-compatible database (PostgreSQL recommended) — [Supabase](https://supabase.com), [Railway](https://railway.app), or [Neon](https://neon.tech) all work well for local/dev use
- Git

### Setup Steps

1. **Fork** the repository, then clone your fork:

```bash
   git clone https://github.com/<your-username>/orbit.git
   cd orbit
```

2. **Install dependencies:**

```bash
   npm install
```

3. **Set up environment variables.** Create a `.env` file in the project root:

```env
   SESSION_SECRET=          # generate with: openssl rand -base64 32
   DATABASE_URL=            # your database connection string
   PUBLIC_URL=              # e.g. http://localhost:3000
```

4. **Push the database schema and generate the Prisma client:**

```bash
   npx prisma db push
   npx prisma generate
```

5. **Run the development server:**

```bash
   npm run dev
```

   Orbit should now be running at `http://localhost:3000`.

---

## Project Structure

Orbit is a TypeScript project built on:

- **Frontend:** Next.js, TailwindCSS
- **Backend:** Next.js API routes, Prisma ORM
- **Database:** Any Prisma-compatible database (PostgreSQL recommended)

Familiarize yourself with the existing folder structure before adding new files — try to follow the conventions already in place rather than introducing new patterns.

---

## Making Changes

1. Create a new branch off `main` with a descriptive name:

```bash
   git checkout -b fix/session-timezone-bug
   # or
   git checkout -b feat/bulk-member-export
```

2. Make your changes, following the existing code style (formatting, naming conventions, file organization).

3. Keep changes focused — one bug fix or feature per pull request makes review much faster.

4. Test your changes locally. If you've touched anything Prisma-related, make sure `npx prisma db push` runs cleanly and existing functionality still works.

5. Update documentation (README, code comments, or docs at [docs.planetaryapp.us](https://docs.planetaryapp.us)) if your change affects setup, configuration, or user-facing behavior.

---

## Commit Guidelines

- Write clear, descriptive commit messages in the imperative mood (e.g. `Fix quota calculation for weekly resets`, not `fixed bug`).
- Keep commits reasonably scoped — avoid bundling unrelated changes together.
- Reference related issues where relevant (e.g. `Closes #123`).

---

## Submitting a Pull Request

1. Push your branch to your fork and open a pull request against `main`.
2. Give your PR a clear title and description:
   - What does this change do?
   - Why is it needed?
   - Any screenshots for UI changes are appreciated.
3. Link any related issues or feedback-portal reports.
4. Be responsive to review feedback — we may ask for changes before merging.
5. Once approved, a maintainer will merge your PR.

Note: since Orbit's beta focus is on stability and matching Planetary Cloud's hosting environment, please flag in your PR description if a change has implications for serverless/Vercel deployments specifically.

---

## Reporting Bugs

Please use the [feedback portal](https://feedback.planetaryapp.us/bugs) rather than opening a GitHub issue directly. When reporting, include:

- Steps to reproduce
- Expected vs. actual behavior
- Whether you're using Planetary Cloud, Vercel, or self-hosting
- Relevant logs or screenshots

---

## Requesting Features

Feature requests also go through the [feedback portal](https://feedback.planetaryapp.us/bugs). This helps us track and prioritize requests in one place alongside bug reports.

---

## Getting Help

- **Documentation:** [docs.planetaryapp.us](https://docs.planetaryapp.us)
- **Discord:** [Join our server](https://discord.com/invite/mWqdZmEkDc) for questions, discussion, and contributor chat
- **Changelog:** [feedback.planetaryapp.us/changelog](https://feedback.planetaryapp.us/changelog)

Thanks again for helping improve Orbit — we appreciate it!