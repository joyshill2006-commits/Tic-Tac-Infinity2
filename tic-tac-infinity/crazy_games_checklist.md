# CrazyGames Submission Checklist — TIC-TAC-∞

- [x] Original game, original name/logo/terminology
- [x] English localization (only language currently — centralize into i18n.js before adding more)
- [x] Responsive down to mobile portrait, tested breakpoints via `clamp()`/`min()`/`aspect-ratio`
- [x] Touch controls (tap cells, tap buttons)
- [x] Keyboard controls (1–9 selects a cell, focus-visible states on all buttons)
- [x] No custom fullscreen button — platform handles fullscreen
- [x] No external ad networks — CrazyGames SDK `ad.requestAd` only
- [x] CrazyGames SDK v3 loaded and initialized (`SDK.init()`)
- [x] `game.loadingStart()` / `loadingStop()` around init
- [x] `game.gameplayStart()` fires only when real gameplay begins
- [x] `game.gameplayStop()` fires on every gameplay break (menu, forfeit, tab hidden)
- [x] Settings saved through `SDK.data` with a `localStorage` fallback
- [x] No broken ad buttons — ad calls are feature-detected and always resolve their callback
- [x] Midgame ads throttled, never mid-match, never back-to-back
- [x] Rewarded ad hook implemented (not yet wired to a UI reward, see README)
- [x] No external game cross-promotion or portal links
- [x] Suitable for a general 13+ audience — no gambling, no real-money elements
- [x] No external login — guest-only, ready for CrazyGames account layer later
- [x] Sound settings (SFX on/off + volume, music on/off + volume)
- [x] Reduced motion setting
- [x] Space/Arrow key default scroll prevented (required when embedded)
- [x] Online multiplayer adapter — `MultiplayerAdapter` interface + `MockMultiplayerAdapter` (dev-only) + real `WebSocketMultiplayerAdapter`, backed by an authoritative Node/`ws` server in `server/`. Win detection, oldest-mark removal, and disconnect handling all verified over a real WebSocket connection. **Still needs**: deploying the server somewhere with a `wss://` URL and setting `MULTIPLAYER_SERVER_URL` in `index.html` before this goes live (see README) — until then "Play Online" honestly says it isn't configured yet.
- [ ] Leaderboard / profile screens — out of scope for this MVP pass
- [ ] Game logic unit tests as standalone test files — the ∞-rule ordering is documented and manually verifiable per README, but no automated test harness is included yet
- [x] ∞ rule regression case manually verified: a winning 4th move is never undone; a non-winning 4th move always removes the oldest mark, after the win check

## Before submitting for real

1. Test on an actual CrazyGames QA Tool build (not just localhost) to confirm ads render and gameplay events are tracked.
2. Decide whether "Play Online" should stay disabled for launch or be cut from the menu entirely until a real backend exists.
3. Swap the synthesized ambient pad for a licensed/produced music loop if you want a more polished menu theme.
4. Have someone else play through Hard AI for ~10 games to sanity-check there's no line where the AI fails to block/win due to the 5-ply search depth cap.
