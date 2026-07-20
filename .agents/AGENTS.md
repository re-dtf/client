# Project Rules for Agents (reDTF)

These are the strict project-scoped rules for AI agents working on the **reDTF** codebase.

## 1. Architecture Rules
- **SPA & No SSR:** This is a 100% Client-Side SPA using `@sveltejs/adapter-static` with fallback routing. **NEVER** enable SSR or backend endpoints (`+page.server.ts`, `+server.ts`). All requests must happen from the browser for 100% transparency.
- **Multiple APIs (Facade Pattern):** All data fetching must go through `src/lib/api/index.svelte.ts` (API Facade). **NEVER** import or call a specific API provider directly in a UI component. Use `api.getPosts()` etc.
- **Multi-Theme & Lazy Loading:** The app supports entirely different UI structures via Themes (`classic`, `modern`, etc.). **NEVER** put heavy theme-specific logic or HTML structures directly in base routes. Always use `ThemeLoader.svelte` and place theme-specific components in `src/lib/themes/<theme_name>/`.
- **Shared Components:** If a component's logic is identical across themes (e.g. block rendering), place it in `src/lib/components/` and style it via CSS Custom Properties. Only duplicate into `src/lib/themes/` if the HTML structure significantly diverges.
- **Overlay Stack Navigation:** The app uses a "History-backed DOM Stack" for inner navigations (opening posts, settings, profiles) to preserve the main feed's scroll state. **NEVER** use standard `href` links that destroy the feed. Always use SvelteKit's `pushState` to append a new `OverlayState` to `$page.state.overlays`. The root `+layout.svelte` manages rendering and scroll restoration for these layers.

## 2. Technology Stack & Best Practices
- **Framework:** Svelte 5. Always use Runes (`$state`, `$derived`, `$props`, `$effect`). Do not use Svelte 4 syntax (e.g., `let foo; export { foo };` or `$:`).
- **Language:** TypeScript strictly. Ensure types from `src/lib/api/types.ts` are respected.
- **Styling:** Plain CSS within Svelte components by default. Do not add heavy CSS frameworks like Tailwind unless explicitly instructed by the user.

## 3. Bundle Size Constraints
- Be extremely mindful of bundle size. Use dynamic imports (`await import()`) for any heavy external dependencies or completely new layouts to ensure code splitting works correctly.
- **Strict Dependency Control:** DO NOT install heavy third-party libraries (e.g., lodash, moment.js) without explicit user permission to prevent bundle bloat.

## 4. Error Handling
- **API Error Encapsulation:** All network errors, timeouts, or bad responses must be caught and handled inside the API Providers (`src/lib/api/providers/`). Do not leak raw fetch errors to the UI components. The UI should only receive cleanly formatted data or standardized error states.

## 5. DTF API Specifics
- **CORS and Auth:** When making requests to DTF API, use the standard `JWTAuthorization` (Bearer token) header. Do not use the legacy `x-authenticate` header. Both `JWTAuthorization` and `X-Device-Token` are allowed by the backend's CORS policies, but `JWTAuthorization` is the modern standard used by DTF.
