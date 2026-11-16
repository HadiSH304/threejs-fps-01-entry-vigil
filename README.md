# VIGIL // FOUNDRY

A 5v5 round-based tactical FPS in three.js (0.187.0, vendored), built for the
make.fun threejs-fps-01 bounty — "Make the best three.js tactical FPS".

Ember Jackals attack: plant the charge at Site A or Site B. Harbor Wardens
defend. First to 9 rounds (max 16), halftime side swap after round 8. CS-style
economy, buy menu, six weapons with CS2-calibrated damage, smoke and flash
utility, bot teammates and enemies that follow team plans, call out contacts
on the radio, and rotate on callouts.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

WASD move, Shift silent walk, C crouch, Space jump, R reload, 1/2/3/4
weapons, Q smoke, G flash, E plant / defuse, B buy menu, TAB scoreboard,
M switch map next round.

## Maps

- **Foundry Yard** — outdoor industrial yard at dusk: two plant sites, a long
  north corridor, a mid connector chokepoint, an elevated catwalk, and a tall
  furnace stack with FOUNDRY painted vertically and a glowing furnace mouth.
- **Killhouse** — indoor CQB: tight hallways, 90-degree blind corners, breach
  doorways, plywood barriers, pop-up target lanes, fluorescent panels, and a
  named hall sign over the main lane.

## Structure

- `game/index.html` — HUD, deploy screen, buy menu, scoreboard, AAR.
- `game/src/main.js` — boot, fixed-step loop, round orchestration, economy.
- `game/src/config.js` — weapons, economy, timers (CS2 figures).
- `game/src/damage.js` — CS2 damage pipeline + calibration sanity checks.
- `game/src/fsm.js` — round flow and bot behaviour as transition tables.
- `game/src/maps.js` — both maps as layout data; `game/src/world.js` builds them.
- `game/src/bots.js` — bot AI, team plans, radio callouts.
- `game/src/weapons.js` — viewmodels, recoil, the shared hitscan path.
- `game/src/audio.js` — 100% Web Audio synthesis, zero audio files.
- `game/src/hud.js` — HUD, filled floor-plan radar, buy menu, AAR.
- `game/src/telemetry.js` — match stats and the Tactical Rank composite.
- `game/src/player.js` — player controller. `game/src/objective.js` — input,
  plant/defuse, smoke/flash. `game/src/staging.js` — `?shot=` staging modes
  and the `?soak=1` logic test.
- `main.ts` — entrypoint: copies `game/` and `screenshots/` to `/output` and
  writes `dossier.json` with the vendored make.fun library.

## Verification

- `node main.ts` twice writes byte-identical `dossier.json`.
- Logic soak (`?soak=1`) drives full rounds: elimination win, bot plant +
  40 s detonation, bot defuse, score progression; damage sanity 12/12.
- Screenshots are real Chromium renders of the game (`?shot=cover`,
  `?shot=killhouse`, `?shot=buy`, `?shot=aar`).

## License

MIT. three.js 0.187.0 is vendored byte-exact from the kit starter.
