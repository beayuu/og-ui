# Coral Conservation Platform — replit.md

## Overview

This is a coral reef conservation web application that allows users to:
- **Adopt** virtual coral specimens (with stock tracking)
- **Donate** money to conservation efforts (with full form validation)
- **Volunteer** for ocean cleanup and related events (with category filtering, capacity bars, progress bars)
- Manage their account (view adoptions, donations, volunteer sign-ups with progress tracking)
- Admin panel with charts, table views for adoptions/donations/users, and full CRUD for corals/volunteer works

The app is a full-stack TypeScript project with a React frontend and an Express backend, sharing types via a `shared/` folder.

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend (React + Vite)
- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: `wouter` (lightweight client-side router)
- **State / Data fetching**: TanStack Query (React Query v5) — all API calls go through `apiRequest` in `client/src/lib/queryClient.ts`
- **UI Components**: shadcn/ui (New York style) built on Radix UI primitives, styled with Tailwind CSS
- **Forms**: React Hook Form + Zod resolvers (full validation on DonatePage)
- **Charts**: Recharts — bar charts, pie charts on AdminPage
- **Font**: Inter and Roboto loaded from Google Fonts

Key pages (all in `client/src/pages/`):
| Page | Path | Purpose |
|---|---|---|
| HomePage | `/` | Landing page with hero, action cards, donation callout |
| AdoptPage | `/adopt` | Browse and adopt coral listings |
| VolunteerPage | `/volunteer` | Category tabs, capacity bars, progress bars, expense breakdown |
| DonatePage | `/donate` | Fully validated donation form (react-hook-form + zod) |
| AuthPage | `/auth`, `/login`, `/signup` | Login / register (toggled by tab state) |
| AccountPage | `/account`, `/my-adoptions` | Adoptions, donations, volunteer sign-ups with progress bars |
| AdminPage | `/admin` | Overview charts, CRUD for corals/works, Adoptions/Donators/Users tables |

Auth state is managed through a `useAuth()` hook that queries `/api/auth/me`. The hook exposes `user`, `isAuthenticated`, `isAdmin`, and `isLoading`.

### Backend (Express)
- **Runtime**: Node.js with `tsx` for development, esbuild bundle for production
- **Framework**: Express 5
- **Auth**: Session-based authentication using `express-session`. Passwords are hashed with `scrypt` + random salt (timing-safe comparison). Sessions stored server-side (connect-pg-simple for Postgres session store in production).
- **Route structure**: All API routes registered in `server/routes.ts` via `registerRoutes()`. Auth middleware (`requireAuth`, `requireAdmin`) guards protected endpoints.
- **Validation**: Zod schemas (defined in `shared/schema.ts`, extended in route handlers) validate all incoming request bodies.
- **Static serving**: In production, Express serves the Vite build from `dist/public`. In development, Vite middleware is injected into Express for HMR.

### Shared Layer (`shared/schema.ts`)
- Drizzle ORM table definitions for PostgreSQL
- Zod insert/update schemas derived from Drizzle schemas via `drizzle-zod`
- TypeScript types exported for use on both client and server

Tables:
| Table | Purpose |
|---|---|
| `users` | User accounts (username, hashed password, isAdmin flag) |
| `corals` | Coral catalog (name, image, description, price, stock) |
| `adoptions` | Records of user coral adoptions |
| `donations` | Donation records (amount, donorName, donorEmail) linked to users |
| `volunteer_works` | Volunteer event listings (category, maxVolunteers, endDate, status) |
| `volunteer_signups` | User sign-ups for volunteer events |

### Volunteer Work Features
- **Statuses**: `open`, `closed`, `completed`, `ongoing`, `cancelled`
- **Categories**: `cleanup`, `replanting`, `survey`, `outreach`, `other`
- **Auto-complete**: Events whose end date has passed are automatically marked `completed`
- **Auto-close**: Events reaching `maxVolunteers` capacity are automatically marked `closed`
- **Auto-reopen**: Cancelling a signup when below capacity re-opens the event
- **Multi-day events**: Optional `endDate` field for events spanning multiple days

### Admin Endpoints
| Endpoint | Purpose |
|---|---|
| `GET /api/admin/adoptions` | All adoptions enriched with username |
| `GET /api/admin/donations` | All donations enriched with username |
| `GET /api/admin/users` | All users with adoption count, donation total, volunteer shifts |
| `GET /api/admin/volunteer-signups` | All signups enriched with username and work title |
| `POST/PATCH/DELETE /api/admin/corals/:id` | Coral CRUD |
| `POST/PATCH/DELETE /api/admin/volunteer-works/:id` | Volunteer work CRUD |

### Storage Interface (`server/storage.ts`)
- `IStorage` interface abstracts all database operations, allowing the backend to swap implementations (in-memory vs. Postgres) without changing route logic.
- `MemStorage` is the active implementation (in-memory, seeded with sample corals and volunteer works).
- All IDs are UUIDs generated server-side.

### Build
- Client: Vite builds to `dist/public/`
- Server: esbuild bundles `server/index.ts` to `dist/index.cjs`, with a curated allowlist of dependencies bundled in (to reduce cold-start syscalls)
- Script: `script/build.ts` orchestrates both builds

---

## External Dependencies

### Database
- **PostgreSQL** — required; `DATABASE_URL` environment variable must be set
- **Drizzle ORM** — schema definition and query builder; migrations live in `./migrations/`, pushed with `drizzle-kit push`
- **connect-pg-simple** — stores Express sessions in Postgres

### Environment Variables Required
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret for signing session cookies (falls back to insecure dev default if unset) |

### Key npm Packages
| Package | Role |
|---|---|
| `express` v5 | HTTP server |
| `express-session` | Session management |
| `drizzle-orm` / `drizzle-zod` | ORM + schema-derived Zod validators |
| `@tanstack/react-query` | Client-side data fetching and caching |
| `wouter` | Client-side routing |
| `radix-ui/*` + shadcn/ui | Accessible UI primitives |
| `react-hook-form` + `zod` | Form state and validation |
| `tailwindcss` | Utility CSS |
| `recharts` | Charts (admin overview, expense breakdown) |
| `vite` | Frontend dev server and bundler |
| `tsx` | TypeScript execution for dev server |
| `esbuild` | Server bundler for production |

### Replit-specific plugins (dev only)
- `@replit/vite-plugin-runtime-error-modal` — overlays runtime errors in the browser
- `@replit/vite-plugin-cartographer` — Replit code navigation
- `@replit/vite-plugin-dev-banner` — Replit dev banner

These are conditionally loaded only when `REPL_ID` is set in a non-production environment.
