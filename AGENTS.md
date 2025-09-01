# Contributor Guidelines

These conventions keep the project consistent, easy to navigate, and performant. When in doubt, favor clarity and simplicity.

## Code Style
- Indentation: two spaces; always end statements with semicolons.
- Language: modern JavaScript (ES2023) with React 18/19 features.
- Imports: use absolute-from-`src` or relative; avoid deep relative chains like `../../..`.
- Naming:
  - Components: PascalCase (`LandingPage.jsx`, `NavBar.jsx`).
  - Hooks: camelCase prefixed with `use` (`usePhysics.js`).
  - Utilities: camelCase (`formatDate.js`).
  - Files: match default export name where possible.
- No inline scripts or styles for app logic: keep JS/JSX in files under `src/`.

## Project Structure
- `src/`
  - `app/` (optional): app shell, routing, providers.
  - `pages/`: top-level route views.
  - `components/`: reusable UI components (dumb/presentational by default).
  - `hooks/`: custom hooks (no JSX in hooks).
  - `lib/`: utilities, helpers, pure functions.
  - `api/`: API clients, fetchers; isolate network logic.
  - `styles/` (optional): global CSS variables or MUI theme extensions.
  - `assets/`: local images, icons, media (prefer importing so Vite processes them).
  - `config.js`: runtime-tunable constants (debug toggles, polling rates, etc.).
  - `main.jsx` / `App.jsx`: app entry and route definitions.
- `public/`: static files served as-is (favicons, manifest). Keep minimal.
- Barrel files (`index.js`) are allowed for component folders; avoid creating cycles.

## React & Routing
- Use functional components with hooks. No class components.
- Co-locate small components with their parent when helpful; otherwise keep in `components/`.
- Routing via `react-router-dom` v6+: declare routes in `App.jsx` or an `app/routes.jsx`.
- Use lazy loading (`React.lazy`) for large route chunks.

## State Management
- Prefer local component state and custom hooks.
- Lift state only when necessary. Avoid global singletons.
- Derived state should be computed, not stored. Memoize with `useMemo`/`useCallback` when profiling shows benefit.

## Styling & Theming
- Use MUI components and the central dark theme (`src/theme.js`).
- Prefer MUI `sx` prop and theme tokens over ad-hoc CSS.
- Global CSS only for resets or truly global rules (e.g., `src/index.css`).

## Assets
- Import assets via modules (e.g., `import logo from './assets/logo.svg'`) so Vite optimizes them.
- Optimize large images; prefer SVG for icons. Lazy-load non-critical media.

## Testing
- Use Vitest + Testing Library. Co-locate tests: `Component.test.jsx` next to the file or under `__tests__/`.
- Test user-observable behavior (text, roles) over implementation details.
- Ensure `npm test` passes before commits.

## Performance
- Avoid unnecessary re-renders: stable keys, memoize heavy components, avoid recreating functions/objects in render without need.
- Throttle/debounce event handlers where appropriate.
- Split bundles on routes and large feature boundaries.

## Accessibility
- Use semantic elements via MUI and proper ARIA attributes.
- All interactive controls must be keyboard accessible and have visible focus.
- Provide accessible names for custom draggable elements (e.g., `aria-label`).

## Tooling
- Build with Vite. Do not reintroduce CRA or deprecated tooling.
- Lint with ESLint; follow errors/warnings. Do not disable rules globally without discussion.
- On filesystems that disallow symlinks, install with `--no-bin-links`. Our scripts avoid reliance on `.bin`.

## Dependencies
- Prefer small, well-maintained libraries. Avoid deprecated or unmaintained packages.
- Before adding a dependency, consider a standard API or a tiny utility first.
- Keep transitive sizes in mind; avoid heavy all-in-one kits if a focused lib exists.

## Git & PRs
- Branch naming: `feat/…`, `fix/…`, `chore/…`, `docs/…`.
- Commits: small, focused, imperative subject (e.g., "Add draggable word torque").
- PRs: include a summary, screenshots/GIFs for UI, and checklist: tests pass, no console errors, lint clean.

## Security & Privacy
- Never commit secrets. Use environment variables where necessary.
- Validate and sanitize inputs; avoid exposing internals in client errors.

## Review Ready Checklist
- Code follows structure above; JS lives in `src/` modules (no inline script tags).
- Naming consistent; files placed in appropriate folders.
- Dark theme respected; MUI used for UI primitives.
- Tests added/updated; `npm test` green.
- Lint passes; no new warnings.
- Updated README/AGENTS.md when conventions evolve.
