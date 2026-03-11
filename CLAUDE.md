# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Terseware Platform is an Angular 21 monorepo managed by Nx 22. It contains a main SSR application and publishable component libraries built around a signal-first, protocol-driven architecture.

## Commands

```bash
# Development
pnpm nx serve terseware          # Dev server (port 4200)
pnpm nx serve terseware --configuration production

# Build
pnpm nx run-many -t build --no-tui        # Build all projects
pnpm nx build terseware --no-tui          # Build single project

# Test (Vitest)
pnpm nx run-many -t test --no-tui         # Run all tests
pnpm nx test proto --no-tui               # Run tests for a single project
pnpm exec vitest run --config ./packages/proto/vite.config.mts  ./packages/proto/src/lib/resolvable.spec.ts  # Single test file

# Lint & Format
pnpm fix # lint and format all files (Only use this)
```

## Project Structure & Dependency Graph

```
apps/terseware          → Main Angular SSR app (tag: terseware)
apps/terseware-e2e      → Playwright E2E tests
packages/utils          → Type guards, validators (tag: utils) — no dependencies
packages/proto          → Protocol behaviors & directives (tag: proto) — depends on utils
packages/proto/{anchor,button,focus,hover,interact,press,scrolling,tooltip,forms,menu}
packages/ui             → Themed UI components (tag: ui) — depends on utils, proto
packages/ui/{button,icon,theme,tooltip,utils}
```

**Dependency enforcement** (eslint `@nx/enforce-module-boundaries`): `utils → proto → ui → terseware`. Libraries can only import from layers below them. Always use `@terseware/*` path aliases, never direct `packages/` paths.

## Architecture

### Behavior Pattern (`@Behavior()`)

Core to the library architecture. Classes decorated with `@Behavior()` are resolved dynamically from the DOM hierarchy via `ElementRef`, stored in a `WeakMap`. This replaces traditional Angular DI for protocol behaviors. Resolution modes: `inherit` (walks up DOM) and `host` (current element only).

### Protocol Directives

Behavioral primitives (Interact, Focus, Button, Press, Hover) are Angular directives paired with `@Behavior()` classes. They manage DOM state (ARIA, tabindex, focus) through signals. Directives bridge template inputs to class signals via `signalBind()`.

### Signal-First State

All reactive state uses Angular signals (`signal()`, `computed()`, `linkedSignal()`), not RxJS Observables. Side effects use `effect()` or `isomorphicEffect()` for SSR compatibility.

### UI Components with CVA

UI components use `class-variance-authority` (cva) for variant management with Tailwind CSS. The `cn()` utility (from `@terseware/ui/utils`) merges Tailwind classes safely using `clsx` + `tailwind-merge`.

## Code Style Rules

- **Types over interfaces**: `consistent-type-definitions: ['error', 'type']`
- **Separate type imports**: `import type { Foo } from '...'` on its own line
- **No `any`**: `no-explicit-any: error` (relaxed in `.spec.ts` files)
- **No `public` keyword**: `explicit-member-accessibility: 'no-public'`
- **No non-null assertions**: `no-non-null-assertion: error` (relaxed in specs)
- **Strict TypeScript**: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `strict` all enabled
- **Standalone components only**: No NgModules

## Tech Stack

- **Angular 21** (standalone, signals, SSR with Express)
- **Nx 22** (monorepo, task orchestration, Nx Cloud CI)
- **Vite + Analog** (build tooling, vitest-angular integration)
- **Vitest** (unit tests with @testing-library/angular)
- **Playwright** (E2E)
- **Tailwind CSS 4** + CVA + tailwind-merge
- **ng-packagr** (library publishing)
- **pnpm** (package manager)

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## Nx Guidelines

- Always run tasks through `nx` instead of underlying tooling directly
- Use the `nx_workspace` MCP tool to understand workspace architecture
- Use `nx_project_details` to analyze individual project structure
- Use `nx_docs` for configuration questions — don't assume Nx config knowledge
- Check `node_modules/@nx/<plugin>/PLUGIN.md` for plugin best practices (not all plugins have this)

<!-- nx configuration end-->
