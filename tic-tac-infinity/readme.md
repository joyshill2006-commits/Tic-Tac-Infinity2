# TIC-TAC-∞

`index.html` holds all the HTML/CSS/JS. Audio lives alongside it in `assets/audio/`:

- `click.mp3` — button clicks and mark placement
- `bg-music.mp3` — menu background music loop
- `win.mp3` — victory sound
- `gameover.mp3` — loss sound

No build step, no dependencies to install — just keep `index.html` and the `assets/` folder together.

## Run locally

Because the game loads audio files, Google Fonts, and the CrazyGames SDK, open it through a local server rather than double-clicking the file (this also matches how CrazyGames will serve it — and some browsers block audio file loads entirely over `file://`):

```
cd tic-tac-infinity
python3 -m http.server 8080
```

Then visit `http://localhost:8080/`. `localhost` is treated by the CrazyGames SDK as a local dev environment — ads are replaced with a text overlay and the SDK still initializes normally.

## Testing the AI

- **Easy** — mostly random, occasionally spots a win.
- **Medium** — always takes a winning move or blocks yours; otherwise prefers center → corners.
- **Hard** — minimax with alpha-beta pruning, simulated through the same `simulateMove()` function real moves use, so it fully understands the ∞ rule (oldest-mark removal, forced trades, etc).

Open devtools console — the AI logs nothing by default, but you can drop `console.log(game)` into `aiTurn()` if you want to trace its state.

## Testing the ∞ rule (critical regression case)

1. Start a game, place X at cells 0, 1, 4 (no win yet).
2. Place a 4th X anywhere that does **not** complete a line → cell 0 (the oldest) should fade out, and only after the new mark is confirmed to not have won.
3. Now set up X at 0, 1 and place a 3rd mark at 2 → X should win immediately, and cell 0 must **not** be removed, even though it's the 4th mark chronologically counting a prior removal cycle.

The order is enforced in one place — `placeMove()` (and mirrored in `simulateMove()` for AI search): place → check win → only remove oldest if no win. This is the one function to check first if the rule ever seems to misfire.

## CrazyGames SDK

The SDK is loaded via `<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js">` in `<head>`. All calls go through `CrazyGamesManager`, which:

- Calls `game.loadingStart()` / `game.loadingStop()` around `SDK.init()`.
- Calls `game.gameplayStart()` only when the `game-screen` becomes active, and `game.gameplayStop()` the moment the player leaves it (back button, forfeit, tab hidden) — never during menus.
- Calls `game.happytime()` on a win.
- Reads/writes settings through `SDK.data` (falls back to `localStorage` automatically if the module is absent or disabled).
- Requests a `midgame` ad through `SDK.ad.requestAd()` at natural breaks (returning to the menu / starting a rematch), throttled to roughly 1-in-3 so it never fires back-to-back or mid-match. Music is ducked while an ad plays and restored after.
- Everything is feature-detected and wrapped in `try/catch` — the game runs identically with the SDK absent (e.g. testing outside CrazyGames).

To test SDK behavior locally without deploying, use CrazyGames' own QA Tool (see their docs) which proxies your local build through crazygames.com.

## Real online multiplayer (`server/`)

A real, authoritative WebSocket server now lives in `server/`:

- `server/rules.js` — the exact same place → check-win → remove-oldest logic as the client, kept in one function (`placeMove`) so there's a single place to audit.
- `server/server.js` — matchmaking queue + per-match state + disconnect handling, built on plain `ws` (no framework).
- `assets/js/multiplayer.js` — the browser side: `MultiplayerAdapter` (interface), `MockMultiplayerAdapter` (local UI testing only, clearly labeled, never fakes a real opponent), and `WebSocketMultiplayerAdapter` (talks to the real server).

**To turn it on:**

1. Deploy the server:
   ```
   cd server
   npm install
   npm start        # or: node server.js
   ```
   Deploy it somewhere that gives you a public `wss://` URL — Render, Railway, or Fly.io all work well on their free tiers and terminate TLS for you automatically. **This matters**: CrazyGames pages are served over HTTPS, and an HTTPS page cannot open an insecure `ws://` connection, only `wss://`. If you self-host on a VPS instead, put the server behind nginx/Caddy with a TLS cert.

2. In `index.html`, set:
   ```js
   const MULTIPLAYER_SERVER_URL = "wss://your-deployed-server.example.com";
   ```
   Leave it as an empty string to keep "PLAY ONLINE" as an honest "not configured yet" message instead of guessing.

3. Reload — "PLAY ONLINE" now runs real matchmaking, a live 3‑2‑1‑GO countdown, and a fully server-authoritative match (the client never decides a win or a removal locally in online mode, it only renders what the server sends).

I ran this server through three scripted end-to-end tests over a real WebSocket connection before shipping it: a winning 4th move (oldest mark correctly kept, game ends immediately), a non-winning 4th move (oldest mark correctly removed, game continues), and an opponent disconnecting mid-match (remaining player correctly awarded the win). All three passed.

**What's intentionally not built yet:** private rooms (`createRoom`/`joinRoom` exist on the adapter interface but just log a warning), reconnect-after-drop, and a persistent player database — the server currently uses in-memory guest names (`PLAYER_1234`) and forgets everything on restart. Good next steps if you want to take this further.

## Known limitations (MVP scope)

- Online multiplayer is not implemented — only clearly labeled as unavailable.
- No profile/leaderboard screens yet (mock data services were intentionally left out of this MVP pass to keep the file small).
- Invalid-move, oldest-mark-removal, draw, and match-select sounds are still synthesized (Web Audio oscillators) since no source files were provided for those — swap them in `AudioManager`'s `sfx` object the same way `click`/`win`/`lose` were wired to real files, if you want fully custom audio everywhere.
- Rewarded ads (`CrazyGamesManager.showRewardedAd`) are implemented but not wired to any UI yet, since there's no cosmetic reward system in this pass — add a button and a reward payload when one exists.
- Confirm you have the rights/license to ship the four bundled audio files (`click.mp3`, `bg-music.mp3`, `win.mp3`, `gameover.mp3`) before submitting to CrazyGames.
