
# Bibi blaster — Brick Breaker (React + Canvas, TypeScript + Vite)

A compact Brick Breaker implementation using React for menus/HUD and a canvas-based game engine (requestAnimationFrame + fixed-step physics).

## Quick start

1. Install dependencies

```powershell
cd C:\Testdriven
npm install
```

2. Start dev server

```powershell
npm run dev
```

3. Open in browser

http://localhost:5173

## Scripts

- `npm run dev` — start Vite dev server
- `npm run build` — create production build (output: `dist/`)
- `npm run preview` — preview production build locally
- `npm run deploy` — build and publish `dist/` to `gh-pages` (uses `gh-pages` package)

## Title

The app title is now "Bibi blaster" (shown in the app and browser tab).

## Controls

- Blue paddle: A (left) / D (right)
- Pink paddle: ← (left) / → (right)
- Serve (launch ball):
  - Solo / Co-op: Up Arrow (or W)
  - Versus: Blue player use `W` to serve Blue ball, Pink player use `ArrowUp` to serve Pink ball
- Pause: Esc

Notes: Movement keys are continuous (hold A/D or ←/→). Serving must be done while ball is in served state (on paddle).

## How to Play (short)

Goal: Destroy all bricks to clear a level. Avoid losing all balls.

- Solo
  - 1 paddle, 1 ball to start, 3 lives.
  - Lose a life only when your last ball falls below the bottom.
  - Clear all bricks to advance to next level (difficulty increases).
- Duo Versus
  - Two paddles at bottom (Blue & Pink), each has its own ball pool and 3 lives.
  - Blue ball only collides with Blue paddle; Pink ball only with Pink paddle.
  - Bricks are shared. First player to reach 0 lives loses.
  - New levels do not reset lives.
- Duo Co-op Survival
  - Two paddles, shared team lives (3).
  - Survival time counts from run start to game over.
  - When team loses all lives, game ends and survival time shows.
  - Best survival time is stored in localStorage (key: `bb_best_time`).

## Powerups (MVP)

- Timed (duration; refreshed not stacked):
  - EXPAND — paddle width ×1.5 (12s) — positive
  - SHRINK — paddle width ×0.7 (12s) — negative
  - SLOW — ball speed ×0.8 (10s) — positive
  - FAST — ball speed ×1.25 (10s) — negative
- Instant:
  - MULTIBALL — spawn +2 balls immediately
  - EXTRA_LIFE — +1 life (Versus capped at 3)

- Versus-specific: SABOTAGE (appears only in Versus) — when picked, applies a negative effect to the opponent.
- Powerup colors:
  - Good powerups: green
  - Bad powerups: red
  - Versus sabotage: blue

Pickup rule: If a falling capsule collides with both paddles in the same frame, it is given to the paddle whose center is closest in X to the capsule.

## Difficulty scaling

- Ball speed: speed(level) = min(650, 320 * 1.05^(level-1))
- Brick HP:
  - Level 1–2: max HP = 1
  - Level 3–4: max HP = 2
  - Level 5+:   max HP = 3
- Brick rows and density increase per level; the level generator ensures a minimum number of bricks.

## Co-op time display

- If survival time < 60s → shown as `XX sec`
- If >= 60s → shown as `M min and S sec` (e.g. `1 min and 8 sec`)

This format is used both in the HUD and on the game-over screen.

## HUD / overlays

- Solo HUD: Lives, Level
- Versus HUD: Blue lives, Pink lives, Level
- Co-op HUD: Team lives, Level, Survival time, Best time
- End screens show appropriate message + buttons:
  - Solo: "Game Over" + Restart / Return to Menu
  - Versus: "Blue won" / "Pink won" + Restart / Return to Menu
  - Co-op: survival time + Restart / Return to Menu

## GitHub Pages deploy

There are two options.

### Option A — GitHub Actions (recommended)
1. Push the repository to GitHub (`main`).
2. In repo **Settings → Pages**, set source to **GitHub Actions** (the provided workflow builds and deploys `dist/`).
3. Push to `main` or run the workflow manually in Actions.

Notes:
- `vite.config.ts` uses `base: './'` so assets load relatively (avoids white screen / 404s).
- If the published page is blank, check browser console for 404 or JS errors.

### Option B — Branch deploy (manual)
This uses the `gh-pages` npm package and `npm run deploy`.

1. Install dependencies (if not already):
```powershell
npm install
```

2. Build and publish:
```powershell
npm run deploy
```

This will create/update the `gh-pages` branch with the contents of `dist/`.

3. In GitHub → **Settings → Pages**
- Source: **Deploy from a branch**
- Branch: `gh-pages`
- Folder: `/ (root)`

Wait a moment and then open the Pages URL shown in the settings.

## Troubleshooting

- 404 / missing JS/CSS: usually due to wrong `base` in Vite or Pages pointing to the wrong branch/folder. Ensure `vite.config.ts` has `base: './'` and Pages is pointed to `gh-pages` (if using branch deploy).
- Blank page: open DevTools → Console → look for 404 or module errors.
- Actions workflow failing: check Actions logs for errors in `npm install`, `vite build`, or deployment steps.

## File map

- `src/engine/GameEngine.ts` — engine, physics, level generation, powerups, life/pool logic
- `src/components/GameCanvas.tsx` — mounts canvas, maps keyboard, overlays
- `src/App.tsx` — menu, mode selection, How to Play
- `src/styles.css` — basic UI styles

## Contributing / Notes

This is a compact demo; feel free to:
- add audio, polish, particles
- improve collision accuracy
- add asset loading and sprites

