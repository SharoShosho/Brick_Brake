Brick Breaker - React + Canvas (TypeScript + Vite)

Quick start

1. Install dependencies:

```powershell
cd C:\Testdriven
npm install
```

2. Start dev server:

```powershell
npm run dev
```

3. Open http://localhost:5173 in the browser.

Controls
- Blue paddle: A (left) / D (right)
- Pink paddle: ← / →
- Esc: pause

Notes
- Canvas rendering and game loop use requestAnimationFrame and fixed-step physics.
- Mode selection and HUD is handled in React; the engine uses imperative state and publishes HUD snapshots.
- Saved best time for co-op is stored in localStorage key `bb_best_time`.

Files to explore
- src/engine/GameEngine.ts - core engine, modes, collisions, powerups, level generator
- src/components/GameCanvas.tsx - mounts canvas and maps keyboard input
- src/App.tsx - simple menu and container

This is a compact example focusing on the requested mechanics. You can extend it with assets, audio, polish, tests and more advanced collision/physics as needed.

## GitHub Pages deploy

You can deploy in two ways:

### Option A: GitHub Actions (recommended)

### Checklist
1. Push the project to GitHub.
2. Go to **Settings → Pages** and set the source to **GitHub Actions**.
3. Push to `main`, or run the workflow manually from the Actions tab.

### Notes
- The build uses a relative Vite base path (`./`), which avoids the common white-screen problem on GitHub Pages.
- If you still see a blank page, open the browser console and check for a 404 or runtime error.

### Option B: branch deploy
If you want to deploy from a branch instead, use:

```powershell
npm install
npm run deploy
```

Then configure **Settings → Pages** to use the `gh-pages` branch as the source.

