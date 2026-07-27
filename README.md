# Nextlevel

Production-ready foundation for an internal communication PWA built with Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, and Supabase.

## Stack

- **Next.js 15** (App Router, Turbopack dev server)
- **React 19** + **TypeScript** (strict)
- **Tailwind CSS 3** with CSS variable theming
- **shadcn/ui** (New York style, neutral palette)
- **Supabase** (`@supabase/ssr` browser, server, middleware, admin clients)
- **ESLint** + **Prettier** (with Tailwind class sorting)

## Getting started

### Prerequisites

- Node.js 20+
- npm 10+ (or pnpm / yarn)
- A Supabase project (for auth and database in later phases)

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command                | Description                     |
| ---------------------- | ------------------------------- |
| `npm run dev`          | Start dev server with Turbopack |
| `npm run build`        | Production build                |
| `npm run start`        | Start production server         |
| `npm run lint`         | Run ESLint                      |
| `npm run lint:fix`     | Fix ESLint issues               |
| `npm run format`       | Format with Prettier            |
| `npm run format:check` | Check Prettier formatting       |
| `npm run typecheck`    | TypeScript check                |

## Project structure

```
src/
├── app/                    # Next.js routes (thin layer)
├── domain/                 # Pure business logic
├── features/               # Feature modules (auth, news, documents, admin)
├── infrastructure/         # Supabase, repositories, storage adapters
│   └── supabase/           # Browser, server, admin clients + session middleware
├── shared/                 # UI components, hooks, lib, types
└── middleware.ts           # Session refresh via Supabase SSR
```

## Supabase clients

| Client     | File                                    | Usage                                       |
| ---------- | --------------------------------------- | ------------------------------------------- |
| Browser    | `infrastructure/supabase/client.ts`     | Client Components                           |
| Server     | `infrastructure/supabase/server.ts`     | Server Components, Server Actions           |
| Admin      | `infrastructure/supabase/admin.ts`      | Server-only admin operations (service role) |
| Middleware | `infrastructure/supabase/middleware.ts` | Session refresh at the edge                 |

Regenerate database types after migrations:

```bash
npx supabase gen types typescript --project-id <project-id> > src/shared/types/database.types.ts
```

## Adding shadcn/ui components

```bash
npx shadcn@latest add <component>
```

Components are installed to `src/shared/components/ui/`.

## Deployment

Deploy to [Vercel](https://vercel.com). Set the same environment variables from `.env.local.example` in the Vercel project settings.

## What's next

- Database schema and RLS policies
- Authentication (login, roles)
- News, Documents, and Admin modules
