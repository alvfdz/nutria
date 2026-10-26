# Vision Document: Nutria 🦦 Open-Source Nutrition Helper

## Section 1 - The Core Proposition

### The Problem

Managing a diet effectively requires foresight, but users currently face a frustrating binary: hire an expensive nutritionist and surrender personal agency, or use commercial tracking apps that are heavily paywalled and fundamentally reactive. Existing software focuses on logging past meals rather than proactively scheduling and designing future nutrition.

### The Solution

An open-source, dual-purpose nutrition platform that seamlessly integrates a macro/calorie tracker with a forward-looking meal scheduler. It empowers users to take full ownership of their dietary goals by planning days or weeks in advance, shifting the focus from simply recording what was eaten to actively designing what to eat.

### The Target Audience

Anyone actively managing their diet—whether for health reasons, weight loss, maintenance, or fitness—who wants granular, uncompromising control over their daily meal planning without subscription fees or forced dietary templates.

---

## Section 2 - Scope & Constraints

### The Core Workflow (Flexible Template Planning)

1. **The Budget:** Users define daily macro/calorie targets and can optionally divide these into "Meal Slots" (e.g., Breakfast: 500 kcal, Lunch: 650 kcal, Dinner: 800 kcal).
2. **The Library:** Users build a personal database of "Meal Templates" (recipes or combinations of foods).
3. **The Planner:** When filling out a day, the user looks at a slot (e.g., Lunch), sees their remaining calorie/macro budget for that slot, and filters their Library to find templates that fit perfectly.

### In-Scope for MVP (Minimum Viable Product)

- **External Food Library Search:** Integration with a free, external database (like Open Food Facts or USDA FoodData Central) via text search so users don't have to manually enter macros for common foods.
- **Ingredient Management:** Ability to save external items to a personal list or create custom raw ingredients manually.
- **Meal Template Builder:** Creating custom meals from ingredients and saving them to the library.
- **Daily Planner & Tracker:** A calendar view to assign Meal Templates to specific days/slots.
- **Macro/Calorie Math:** Real-time calculation of remaining daily and per-meal targets against the user's budget.
- **Open Source & Self-Hostable:** Built in a way that allows users to deploy it themselves if they choose.

### Out-of-Scope for MVP (To Keep Us Focused)

- **Barcode Scanning:** Even with the external database, barcode scanning adds mobile-specific UI/camera complexity. Text search is enough for V1.
- **External API Syncing:** No syncing with Apple Health, Google Fit, or Garmin yet.
- **Social/Community Features:** No sharing templates with other users (single-tenant focus for now).
- **Automated Grocery Lists:** Distracts from the core tracking/planning loop.

---

## Section 3 - High-Level System Architecture

### 1. The Client Application (Frontend)

- **Stack:** Next.js (TypeScript) + Tailwind CSS + shadcn/ui.
- **Architecture:** Next.js App Router for server-side rendering and interactive client components (drag-and-drop meal planner, real-time budget calculations).
- **UI/UX Strategy:** shadcn/ui accessible, pre-built components (calendars, command palettes, modal dialogs).

### 2. The Application Server (Backend API)

- **Stack:** Next.js (TypeScript) — a single framework serves both the frontend and the backend. Next.js Route Handlers and Server Actions replace the traditional standalone API server.
- **Core Domains:**
  - _Configuration Service:_ Manages macro targets and meal slot budgets (Route Handlers + Server Actions).
  - _Template Engine:_ CRUD operations for meal combinations (Route Handlers + Server Actions).
  - _Planning Service:_ Maps templates to dates (Route Handlers + Server Actions).
  - _External Search Proxy:_ Server-side Route Handlers handle outbound requests to external food databases (e.g., Open Food Facts) so API keys stay out of the client, standardize JSON payloads, and serve them to the frontend.

### 3. Data Persistence Layer

- **Primary Database:** PostgreSQL (relational DB for Users, Plans, Slots, Templates, Ingredients).
- **ORM:** Prisma (TypeScript) — native to the Next.js stack.
- **Proxy Caching:** Redis for caching external food search queries to minimize API latency and rate limits.

### 4. Deployment & Infrastructure (Self-Hostable)

- **Containerization:** Rootless **Podman**. Services are defined in a `compose.yaml` (Docker Compose–compatible) run with `podman compose`, plus a database-only `compose.dev.yaml` for development, with a `podman-compose` fallback for machines without the Podman Compose provider.
- **Runtime:** OCI-compatible images, no Docker daemon or root privileges required.
- **Services:** Single Next.js app (frontend + backend), PostgreSQL database, Redis cache.

---

## Section 4 - Success Metrics & MVP Checklist

### Core Success Metric

A user can plan an entire day of eating—matching their target calories and macronutrients—in under 3 minutes, with complete visibility over their remaining macro budget before a single meal is eaten.

### The MVP Checklist ("Definition of Done")

1. **Target Setup:** Ability to set and update total daily goals for Calories, Protein, Carbohydrates, and Fats.
2. **Ingredient Management:** Ability to define raw ingredients (name, calories, protein, carbs, fats per 100g) either manually or via external proxy search.
3. **Meal Template Creation:** Ability to group ingredients into a named "Meal Template" (e.g., "Oatmeal & Protein Bowl") with defined quantities.
4. **Day Planning:** A calendar/daily view where users can assign Meal Templates to a day and see real-time feedback comparing total planned macros against the set daily targets.
