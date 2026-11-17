<!-- prettier-ignore-start -->
<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
<!-- prettier-ignore-end -->

# Couch

Working copy of the Linear document "Development guide (for the coding agent)" (project Couch, team Martinbaciga). If this file and that document disagree, re-read the Linear guide and follow it.

The PRD is product background from 30 Oct 2026. Ignore it where it conflicts with the guide: milestone numbers, Calistoga, rent and buy always inside the home card, five watchlist filters, optional per-plan selection, and a database cache.

One branch per milestone, not per issue. Branch from current `main` when the milestone starts: `m2-data-layer`, `m3-core-lookup`, `m4-watchlist`, `m5-polish`. Push straight to that branch. A push does not need a pull request.

Still one issue at a time, and do not start an issue whose blockers are open. Set it to In Progress when you start and Done when its acceptance criteria are met and `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass on the milestone branch.

Open one pull request from the milestone branch into `main` only after every issue in the milestone is Done and Martin has confirmed the milestone. Do not merge before that confirmation.

MAR-9 is already on `main`. The `m2-data-layer` branch is for the remaining M2 issues.

Ask the owner only when something only they can do is missing. Otherwise choose the most reasonable option, note it on the issue, and continue.

## Stack

- Next.js App Router, React, TypeScript `strict`, Tailwind, pnpm, Vercel.
- next-intl for copy. English only in v1. Add it with the first issue that renders real UI (MAR-37), not before.
- TMDB API v3 is the only data source. Call it only from server code. The token is `TMDB_READ_ACCESS_TOKEN`. Never `NEXT_PUBLIC_`, never logged, never sent to the browser. Use `.env.local` locally.
- CSV is parsed in the browser. Settings, the saved watchlist, and recently viewed live in `localStorage` under `couch:*:v1`. No accounts, no database, no cookies in v1.
- Cache with HTTP headers and the Next.js data cache (MAR-14). No Supabase or Redis.
- Tests: Vitest for logic and routes. Playwright with axe is the final accessibility pass (MAR-25).
- No new dependency unless the issue names it. No animation library, no state library, no headless combobox.

| Folder                 | Rule                                                                   |
| ---------------------- | ---------------------------------------------------------------------- |
| `src/lib/tmdb`         | Server-only (`import "server-only"`). The only place that calls TMDB.  |
| `src/lib/availability` | Pure TypeScript. No React, no I/O, no browser APIs. Fully unit-tested. |
| `src/lib/storage`      | Typed `localStorage` helpers with safe fallbacks.                      |
| `src/app/api`          | Route handlers. Validate input. Use the error contract.                |
| `src/components/ui`    | Shared presentational components.                                      |
| `src/components/*`     | Feature components, built from `ui` components.                        |
| `src/data`             | Static data (service catalogue).                                       |
| `messages/`            | Locale files. `en.json` in v1.                                         |

`docs/spikes/` is reference from the validation spike. Do not import those scripts into the app. Do not commit `docs/spikes/watchlist.csv`.

## Decisions already made

- The user picks a home country and services, stored locally. Nothing is preselected (17 Nov): the country starts empty in Settings and in the setup dialog, because a browser language does not say where someone lives. The services list stays hidden until a country is chosen, then shows every service unticked with "Tick the services you subscribe to." No per-plan selection. The default list shows the 6 base services for that country. "Find another service" searches the full catalogue. Selected extra services are listed after the base ones; a deselected extra disappears on the next visit. A country change keeps services that exist in the new country and shows one muted "Removed …" line for the rest (MAR-40).
- Tier variants (for example "with Ads") are grouped under the parent service, with a dashed marker and a note. Reseller channels (Amazon, Apple, Roku) are separate services and labelled.
- Offer types: Stream, Free / ads, Rent, Buy. Rent and buy are never "available on your service".
- A country missing from the data means "no availability data found", never "unavailable".
- The title page is "In [home country]" (a standalone card) plus "In other countries" (by service by default, by country optional).
- "Other ways to watch" (rent and buy in the home country) shows only when that country has no streaming-type offer at all (12 Nov). When it streams there, on the user's service or not, the block is hidden.
- Country set but no services chosen: the home card lists every service that carries the title there, with a "Set your services" button. Other countries are listed by country. Status logic returns `no-services` (MAR-36, MAR-15).
- The imported watchlist is saved on this device only and refreshes in the background when older than about one week. No manual match correction in v1.
- No deep links to streaming services. No scraping. No Letterboxd login.
- Neutral wording. Never mention or promote VPNs. Never use "unlock", "bypass", "restricted", "geo-block", or "circumvent". Prefer "Also available in" and "Available in other countries". MAR-23 adds a test that scans `messages/en.json`.
- v1 import is Letterboxd-only. Other CSV lists are MAR-53. Do not build them.
- Watchlist filters are seven chips, including All and "On other services here" (12 Nov, MAR-21).

## TMDB

- Free for non-commercial use with attribution. On `/about`: the TMDB logo, smaller than ours, unmodified, and linked, plus "This product uses the TMDB API but is not endorsed or certified by TMDB." Credit JustWatch wherever availability is shown.
- No documented caching duration. Keep availability short-lived. Never store TMDB availability in the browser.
- Respect HTTP 429 and `Retry-After`. Concurrency: 8 in flight server-side.
- One request per title returns all countries: `/movie/{id}/watch/providers` and `/tv/{id}/watch/providers`. Normalise on the server. Raw responses are large and never go to the browser.
- Response shape: `{ id, results: { <ISO country>: { link, flatrate?, rent?, buy?, ads?, free? } } }`. A provider is `{ provider_id, provider_name, logo_path, display_priority }`.
- Keep country codes that are not in TMDB's region list (for example `GG`).
- One service can have several provider ids. MAR-13 builds that mapping.

## Watchlist import

- Header: `Date,Name,Year,Letterboxd URI`. UTF-8, quoted fields, a trailing blank line, films and series. The export exists on the Letterboxd website only. The UI says so.
- Match in this order: movie search with the year, then year ±1, then movie search without the year, then TV search, then unmatched. Compare titles after removing accents, punctuation, and a leading "The", against both the title and the original title.
- A cold 300-title run is about 25 to 30 seconds. Show progress, partial results, and cache.

## Components and tokens

Build a small design system. One change to a component or token updates every screen.

1. Repeated UI goes in `src/components/ui`, with variants through props. Start from the list in MAR-37. Add a new component the second time an element appears.
2. Do not style a native `button`, `a`, `input`, or `select` in a page or feature component when a shared component exists. If a variant is missing, add it to the shared component.
3. Colours, type, spacing, radii, shadows, and borders come from `src/styles/tokens.css`, exposed to Tailwind. No hex colours and no arbitrary values such as `bg-[#f6bb74]` or `p-[13px]` in components.
4. Feature components compose `ui` components. Pages may lay them out. `className` is for layout only.
5. States live in the component: hover, focus-visible, active, disabled, loading, selected (`aria-pressed`). Actions are `Button` (square). Navigation is `NavItem` (plain text or icon, no fill). Selections are pills. Icon-only controls are `NavItem` with an `aria-label` and a `Tooltip`.
6. The same thing uses the same component on every screen, including mobile and desktop. Use responsive classes, not duplicated markup.
7. Keep a living style page at `/dev/components` (not linked, hidden in production, excluded from the sitemap). Add each component to it.
8. Before pushing, search the change for raw `<button`, `style=`, hex colours, and arbitrary Tailwind values outside `src/components/ui` and `src/styles`.

## Copy

- All user-facing text lives in `messages/en.json`, including `aria-label`, `alt`, placeholders, errors, metadata, and titles. Use `useTranslations` / `getTranslations`. API errors return a `code`; the UI maps the code to a message.
- No string concatenation for sentences. Use ICU, including plurals.
- Format dates, relative times, numbers, and lists with `Intl` through next-intl. Country names come from `Intl.DisplayNames`. Do not translate TMDB titles or provider names.
- Tolerate longer text. Use logical CSS properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`).
- A test fails if a used key is missing from `en.json`, or if `en.json` has unused keys.
- No language switcher in v1.
- The MAR-9 placeholder title "Couch" is the one hardcoded string. Move it into `messages/en.json` when next-intl is added.
- Figma frame text wins over copy quoted in the guide or in this file.

## Code quality

- Do the simplest thing that meets the acceptance criteria. No speculative props, flags, or config.
- No abstraction until there are two real uses. No state-management library. Prefer the platform and Next.js.
- Strict TypeScript. No `any` and no unchecked casts.
- Comments explain why. No TODOs without an issue key.
- No dead code. When you change something, tidy what you touched and leave unrelated code alone.
- Test logic and contracts. Do not snapshot markup.
- Small commits. If an issue is larger than expected, say so and split it.

## Design

Figma file `14KgqGmz1aj1nADlnGJsOK`, App page, is the source of truth for layout, spacing, colours, and copy. Wireframes are frozen. Pull only the frames named in the current issue. Design tokens are Figma variables. The guide's provisional palette is obsolete. Fonts are Bricolage Grotesque and Figtree. Calistoga was dropped.

Frame ids and the screen-by-screen copy live in the Linear guide. Do not invent copy that already exists in Figma.

Motion tokens are defined in MAR-37. The motion spec is MAR-52, after the screens exist. Any motion shipped earlier must honour `prefers-reduced-motion`.

## Conventions

- Accessibility is part of done on every issue: semantic HTML, labels, keyboard use, visible focus, `aria-pressed` on toggles, `aria-expanded` on disclosures, no information by colour alone, 44px touch targets.
- Errors from `/api/*`: `{ error: { code, message } }` with `not_found`, `rate_limited`, `upstream_unavailable`, or `bad_request` (MAR-41).
- No analytics, trackers, or third-party scripts without the owner's approval. Do not log user data. Validate route inputs. Never commit secrets.
- Build mobile first (390px), then desktop (1280px). Also check 360px and 1440px.
- For UI issues, check the preview at 390px and 1280px, including keyboard focus, before calling the issue done.

## Definition of done

1. Every acceptance criterion is met, or a comment on the issue says which one is not and why.
2. `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.
3. New logic has unit tests. Routes have tests with mocked TMDB.
4. UI uses shared components and tokens only. New shared components are on `/dev/components`.
5. All text is in `messages/en.json` once that file exists. No unused keys.
6. Nothing unused and nothing speculative.
7. Mobile and desktop checked for UI issues.
8. Accessibility basics checked by keyboard.
9. No TMDB token or TMDB client code in the client bundle.
10. Decisions are noted on the issue. The milestone pull request summarises the issues it contains when it is opened.

## Build order

Follow Linear blockers. Waves:

1. M2: MAR-9 setup, MAR-10 TMDB client, MAR-13 service catalogue, MAR-12 availability model, then MAR-11 search, MAR-14 caching, MAR-36 status logic.
2. M3 shell: MAR-37 app shell and tokens, MAR-41 system states, MAR-16 settings.
3. M3 title page: MAR-49 details and links with MAR-15, then MAR-17 by-service, MAR-45 by-country, MAR-18 shareable URLs.
4. M3 entry: MAR-40 setup, MAR-39 search, MAR-38 landing.
5. M4: MAR-19 CSV, MAR-20 matching, then MAR-43 saved watchlist together with MAR-21 results, MAR-42 progress, MAR-22 unmatched, MAR-44 returning landing.
6. M5: MAR-23 About (can be earlier), MAR-24 freshness, MAR-25 performance and accessibility, MAR-51 brand assets, MAR-52 motion, MAR-26 launch. MAR-50 (404) can follow the shell.

## Out of scope for v1

Accounts and sync (MAR-35), availability alerts (MAR-34), manual match correction (MAR-47), other CSV sources (MAR-53), per-plan selection, deep links to streaming services, prices, scraping, VPN promotion, native apps, extra languages, and ratings (MAR-48).

## Owner-only

Stop and ask if one of these is missing when the issue needs it. Do not invent credentials, assets, or sample data.

- GitHub repo, Vercel project, and `TMDB_READ_ACCESS_TOKEN` in Vercel (done before MAR-9).
- TMDB logo file, if it cannot be downloaded (MAR-23).
- The two "Try" titles (MAR-38) and the `/about` contact line (MAR-23).
- The final domain (MAR-26).

Sample TMDB JSON and a Letterboxd export already exist under `docs/spikes/` for local use. Use them. Ask only if a later issue needs a case those files do not cover.
