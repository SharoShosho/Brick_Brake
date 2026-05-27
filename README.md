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

