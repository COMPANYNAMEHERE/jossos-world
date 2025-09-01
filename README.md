# Jossos World

A refreshed React project featuring a single interactive landing page inspired by Android's Material Design. The page introduces the project and provides a framework for future expansion.

## Development

Install dependencies and start the development server (avoids symlink issues):

```bash
# If your filesystem disallows symlinks, use --no-bin-links
npm install --no-bin-links
npm run dev
```

## Testing

```bash
npm test
```

## Building for production

```bash
npm run build
```

## Deploying to GitHub Pages

Replace `username` in `package.json`'s `homepage` field with your GitHub username, then run:

```bash
npm run deploy
```

This builds the app and publishes the `dist/` directory to the `gh-pages` branch for hosting on GitHub Pages.

## Project Structure

- `src/` contains the React components and theme.
- `index.html` is the Vite HTML entry.
- `public/` hosts static assets (if any).
- `AGENTS.md` describes conventions for contributors.

Feel free to extend this foundation with new pages and features.
