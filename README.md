# Jossos World

Check it out! It's Jossos world. Nostalgicoding a single myspace page. But not really.

It is still a massive Work In Progress and vibecoded AF, might never get done. Why are you spending your time reading this while you could've been looking around other cool projects on github, like Transcribe Monkey on my profile if you're bored!

<details>
<summary><strong>Setup & Commands</strong> (click to expand)</summary>

Prerequisites: Node 18+.

- Install (on filesystems that disallow symlinks, use the flag):

  ```bash
  npm install --no-bin-links
  ```

- Development server:

  ```bash
  npm run dev
  ```

- Tests:

  ```bash
  npm test
  ```

- Build:

  ```bash
  npm run build
  ```

- Deploy to GitHub Pages:
  1) Set `homepage` in `package.json` to `https://<username>.github.io/jossos-world`.
  2) Build and deploy:

  ```bash
  npm run deploy
  ```

  This publishes the `dist/` folder to the `gh-pages` branch.

</details>

## Project Structure

- `src/pages/` — route-level views (e.g., `LandingPage.jsx`).
- `src/components/` — reusable UI building blocks.
- `src/hooks/` — custom React hooks.
- `src/lib/` — small utilities and pure helpers.
- `src/api/` — API clients/fetchers.
- `src/styles/` — theme and styling helpers (e.g., `theme.js`).
- `src/assets/` — images and media.
- `src/config.js` — tweakable runtime config (debug key, polling rate, etc.).
- `index.html`, `src/main.jsx`, `src/App.jsx` — app entry and routing.
- `AGENTS.md` — contribution and code-structure guidelines.

Built with React + Vite + MUI, kept intentionally lightweight and modern.
