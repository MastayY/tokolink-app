# Contributing to Tokolink

Thanks for your interest in contributing! Tokolink is built in the open and we welcome pull requests, bug reports, and ideas from the community.

> **License Note:** Tokolink is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE). By submitting a contribution (code, docs, translations, etc.) you agree that your contribution will be licensed under the AGPL-3.0 license. See [NOTICE.md](NOTICE.md) for licensing history.

---

## Table of Contents

- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Branch & Commit Conventions](#branch--commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## Ways to Contribute

| Type | Description |
|---|---|
| 🐛 Bug fix | Fix a confirmed issue or regression |
| ✨ Feature | Add a new capability discussed in an Issue/Discussion |
| 📝 Docs | Improve README, inline comments, or JSDoc |
| ♿ a11y | Improve accessibility (ARIA, focus states, contrast) |
| 🌐 i18n | Translation or locale improvements |
| 🧹 Refactor | Clean up code without changing behavior |
| 🧪 Tests | Add or improve test coverage |

---

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) v1.x or Node.js v18+
- PostgreSQL (local or via Supabase)
- API keys for required services (see `.env.example`)

### Steps

```bash
# 1. Fork the repo, then clone your fork
git clone https://github.com/<YOUR_USERNAME>/tokolink-app.git
cd tokolink-app

# 2. Install dependencies
bun install

# 3. Set up environment variables
cp .env.example .env
# Fill in your credentials

# 4. Push the database schema
bun run db:generate
bun run db:push

# 5. Start the dev server
bun run dev
```

The app will be available at `http://localhost:3000`.

---

## Branch & Commit Conventions

### Branch naming

```
feat/<short-description>       # new feature
fix/<short-description>        # bug fix
docs/<short-description>       # documentation only
refactor/<short-description>   # code cleanup
chore/<short-description>      # tooling, deps, config
```

### Commit messages — Conventional Commits

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(dashboard): add bulk product delete
fix(checkout): correct subtotal rounding on variant pricing
docs(readme): update local setup instructions
refactor(auth): extract token validation to shared util
chore: upgrade @tanstack/react-start to v1.2
```

Format: `<type>(<optional-scope>): <short description in lowercase>`

---

## Pull Request Process

1. **Open an Issue first** for non-trivial changes — this avoids wasted work if the direction doesn't align.
2. Keep PRs **focused** — one feature or fix per PR.
3. Fill in the PR template (it will appear automatically when you open a PR).
4. Make sure `bun run build` passes locally before submitting.
5. Add a short description of *what* and *why*, not just *what*.
6. PRs require at least one approval from a maintainer before merging.

---

## Code Style

- **Language:** TypeScript strict mode — no `any` unless absolutely unavoidable (and comment why).
- **Formatter:** Prettier (auto-formats on save if you use the project's `.prettierrc`).
- **Linter:** ESLint with the project config — run `bun run lint` to check.
- **Component convention:** Functional components only, no class components.
- **Server functions:** All server-side logic lives in `src/server/*.functions.ts` — keep routes thin.
- **Schemas:** All input validation uses Zod schemas from `src/lib/schemas.ts`.
- **Error handling:** Throw descriptive Error objects — avoid silent fallbacks.

---

## Reporting Bugs

Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) issue template. Please include:

- Steps to reproduce
- Expected vs. actual behavior
- Browser/OS/runtime version
- Relevant logs or screenshots

For **security vulnerabilities**, see [SECURITY.md](SECURITY.md) — do **not** open a public issue.

---

## Suggesting Features

Open a [GitHub Discussion](https://github.com/MastayY/tokolink-app/discussions) in the **Ideas** category. Describe:

- The problem you're solving
- Your proposed solution
- Any alternatives you considered

Feature requests that align with the project roadmap and non-commercial scope will be prioritized.

---

We appreciate every contribution, big or small. Thank you! 🙏
