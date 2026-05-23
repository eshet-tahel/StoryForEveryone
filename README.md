# Story For Everyone

Interactive family storytelling game built with **Next.js 16**, **TypeScript**, and **Supabase**.

## Stack

- Next.js 16.2.6 (App Router, Turbopack)
- React 19
- TypeScript 5.7 (strict, `noUncheckedIndexedAccess`)
- Supabase (`@supabase/ssr` for SSR-safe auth)
- CSS Modules

## Getting started

```bash
pnpm install
cp .env.example .env.local      # then fill in your Supabase keys
pnpm dev
```

Open <http://localhost:3000>.

## Environment variables

See [.env.example](./.env.example). Public keys are prefixed with `NEXT_PUBLIC_`; the service role key is server-only and must never be imported into client code.

## Project layout

```
src/
  app/                    # Next.js App Router (RSC by default)
    layout.tsx
    page.tsx
    globals.css
  lib/
    supabase/
      client.ts           # Browser client (Client Components)
      server.ts           # Server client (RSC, Route Handlers, Server Actions)
      middleware.ts       # Session refresh helper
      types.ts            # Replace with `supabase gen types` output
    story/
      types.ts            # Domain model for interactive stories
  middleware.ts           # Edge entry — runs updateSession on every request
  env.ts                  # Validated env access
```

## Supabase setup

1. Create a project at <https://supabase.com/dashboard>.
2. Copy the project URL + publishable anon key into `.env.local`.
3. Generate typed schema:
   ```bash
   pnpm dlx supabase gen types typescript --project-id <ref> --schema public > src/lib/supabase/types.ts
   ```

## Scripts

- `pnpm dev` — dev server (Turbopack)
- `pnpm build` — production build
- `pnpm start` — serve production build
- `pnpm lint` — ESLint
- `pnpm typecheck` — `tsc --noEmit`
