# Vision Document: Nutria 🦦 Open-Source Nutrition Helper

## Section 1 - The Core Proposition

### The Problem

Managing a diet effectively requires foresight, but users currently face a frustrating binary: hire an expensive nutritionist and surrender personal agency, or use commercial tracking apps that are heavily paywalled and fundamentally reactive. Existing software focuses on logging past meals rather than proactively scheduling and designing future nutrition.

### The Solution

An open-source, dual-purpose nutrition platform that seamlessly integrates a macro/calorie tracker with a forward-looking meal scheduler. It empowers users to take full ownership of their dietary goals by planning days or weeks in advance, shifting the focus from simply recording what was eaten to actively designing what to eat.

### The Target Audience

Anyone actively managing their diet—whether for health reasons, weight loss, maintenance, or fitness—who wants granular, uncompromising control over their daily meal planning without subscription fees or forced dietary templates.

### Core Success Metric

A user can plan an entire day of eating—matching their target calories and macronutrients—in under 3 minutes, with complete visibility over their remaining macro budget before a single meal is eaten.

---

## Section 2 - Scope & Constraints

### The Core Workflow (Flexible Template Planning)

1. **The Budget:** Users define a daily calorie target and its protein/carbs/fat split, and divide it into "Meal Slots" that each take a share of the day (e.g., Breakfast 25%, Lunch 35%, Dinner 40%).
2. **The Library:** Users build a personal database of ingredients and "Meal Templates" (combinations of ingredients with quantities).
3. **The Planner:** When filling out a day, the user looks at a slot (e.g., Lunch), sees their remaining calorie/macro budget for that slot, and picks templates from their Library that fit.
4. **The Day:** The home page shows today only. Users tick meals as they eat them, swap a meal if they ate something else, and see what's left of the budget. Only ticked meals count as eaten.

### Product Constraints

- **Single-Tenant:** One owner account per instance. Sign-up closes once the owner exists; data is still scoped per user so multi-user remains possible later.
- **Open Source & Self-Hostable:** Anyone can run their own instance with a single compose file.
- **Text Search Over External Data:** Common foods come from Open Food Facts via text search, so users rarely type macros by hand.

---

## Section 3 - High-Level System Architecture

### 1. The Client Application (Frontend)

- **Stack:** Next.js (TypeScript) + Tailwind CSS + shadcn/ui (on Base UI).
- **Architecture:** Next.js App Router with server-rendered pages and interactive client components (meal planner calendar, real-time budget calculations).
- **UI/UX Strategy:** shadcn/ui accessible, pre-built components (calendars, command palettes, modal dialogs).

### 2. The Application Server (Backend)

- **Stack:** Next.js (TypeScript) — a single framework serves both the frontend and the backend. Server Actions handle mutations; Route Handlers are used only where an HTTP endpoint is needed.
- **Authentication:** Better Auth (email + password), with the single-owner rule enforced in the setup flow, the sign-up endpoint, and a database trigger.
- **Core Domains:**
  - _Goals:_ Daily calorie target, macro split, and meal slot shares.
  - _Ingredients:_ Custom ingredients and items saved from external search.
  - _Meals:_ CRUD for meal templates built from ingredients.
  - _Calendar:_ Maps meal templates to dates and slots, and records which of today's meals have been eaten.
  - _External Search Proxy:_ A Route Handler proxies Open Food Facts: it requires a session, rate-limits per user, sends the identifying User-Agent, normalizes the payload, and caches results in a size-capped in-memory cache for a few minutes.

### 3. Data Persistence Layer

- **Primary Database:** PostgreSQL (Users, Goals, Meal Slots, Ingredients, Meals, Plans).
- **ORM:** Prisma (TypeScript), with migrations applied automatically when the app container starts.
- **Caching:** In-process, in-memory cache for external search results. No separate cache service; revisit only if the app ever runs as multiple instances.

### 4. Deployment & Infrastructure (Self-Hostable)

- **Containerization:** Engine-agnostic compose files that run unchanged under `docker compose` (the default the docs use) or `podman compose`, with `podman-compose` as a fallback.
  - `compose.yaml`: self-hosting stack (app + PostgreSQL).
  - `compose.dev.yaml`: PostgreSQL only, for `npm run dev` on the host.
- **Runtime:** OCI-compatible images, so rootless Podman works without a Docker daemon.
- **Services:** Single Next.js app (frontend + backend) and a PostgreSQL database.

### 5. Quality

- **Testing:** Vitest unit tests; `npm test` must pass before a change is done.
- **Formatting & Docs:** Prettier, and TSDoc on every exported symbol.
