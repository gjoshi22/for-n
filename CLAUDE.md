# Noush's Birthday Cake

An interactive 3D "build your own birthday cake" gift for Noush (27), made for an iPad in landscape. She bakes the cake, decorates it, adds candles, lights them with a match and blows them out. The finale is a Polaroid of her cake, a receipt she pays with a kiss, and a love letter. Her boyfriend can watch live from a hidden URL.

Quality bar: it has to feel **chic, elegant and buttery smooth**, like a luxury patisserie. It must never feel like a 3D tech demo. The owner has already rejected the current look as "not chic at all". Fixing that is the top priority.

## Files

```
src/shell.html     page markup + all CSS (one <style> block); contains /*APP_JS*/ placeholder
src/app.js         all game code (ES module, Three.js r160 + GSAP 3.12.5)
build.py           inlines app.js into shell → dist/index.html (full doc, for hosting)
                                              dist/artifact.html (body-only, for a claude.ai artifact)
dist/index.html    THE deliverable. Single self-contained file.
test/run.js        Playwright end-to-end run (player + spectator + local MQTT broker), screenshots → test/shots/
test/probe.js      quick boot/fps/screenshot probe
test/package.json  test deps (three, gsap, mqtt, aedes, ws) — run `npm i` in test/
```

Always edit `src/`, then run `python3 build.py`. Never hand-edit `dist/`.

## Hard constraints

- Vanilla JS only, no React or other UI framework. Use Three.js r160 (import map → jsdelivr), GSAP 3.12.5 (cdnjs) and mqtt.js 5.10.1 (unpkg, lazy-loaded). Google Fonts is the only font host.
- Everything ships as one static `index.html`. It gets hosted on GitHub Pages (https is needed for the mic).
- Target an **iPad at 60fps**. Use at most one shadow-casting key light plus one candle SpotLight with a shadow, and never a shadow-casting PointLight per candle (6 renders each). Keep instancing for piping, confetti and sparks. Adaptive DPR is already in the loop.
- No `preserveDrawingBuffer`: the Polaroid capture runs right after `renderer.render` in the same frame (`captureCb` in the loop).
- iOS details: `touch-action:none` on the body, pinch zoom blocked, audio only after the first tap, and the mic needs https plus a user gesture.
- The spectator view must **not need any accounts**. It uses public MQTT brokers (emqx and hivemq over wss) on a random topic set in `CONFIG.room`. The player publishes a retained full-state snapshot (`/state`, throttled to 250ms) plus a 10Hz live channel (`/live`: camera, pointer, match position, blow intensity). The watch URL is `index.html?watch` and is never linked from her UI.

## Architecture (app.js)

- **State-driven.** A single object `S` holds tiers, toppings, piping, candles, lit candles, chapter, log and so on. Player actions mutate `S`, then call `commit()`, which runs `reconcile()` (syncTiers/syncTops/syncPipes/syncCandles diff the scene against `S`), then `Sync.state()` and `save()` (localStorage, because iPad Safari can kill heavy tabs). The spectator just does `Object.assign(S, remote)` and calls `reconcile()`. Keep it this way: every visual must be derivable from `S`.
- Chapters: `intro → bake → decorate → candles → light → (wish/blow) → finale`. Each one has a dock UI built by `renderDock()`, a camera preset in `frameFor()` and a hint in `HINTS`.
- Tiers are `class Tier`, with a `main` group (300°) and a `wedge` group (60°, facing +z) so "Cut a slice" can slide the wedge out and show the sponge layers on the cut faces (canvas texture `spongeTex`). Toppings and piping are parented to main/wedge so they move with the slice.
- Toppings come from `makeTopping(kind)`: procedural geometry, cached in `GC`, placed by raycast with the surface normal (`decorHit` → `hitToLocal` → `orient`).
- Piping uses one InstancedMesh per tier part (`pipeIMs`), with a fluted rosette geometry (`blobGeo`).
- Candles: number candles are TubeGeometry along digit stroke paths (`DIGITS`); tapers have a spiral stripe texture; sparklers emit particles. Flames are a custom shader (`FLAME_VS/FS`) plus an additive glow sprite, and they bend away from the camera by the blow intensity.
- Light: a 3D match follows her finger on a plane at wick height and lights a wick when it gets within 0.08 in xz. Ambience goes from day to candlelight (`setNight`) and swaps the CSS backgrounds `#bgDay`/`#bgNight`.
- Blow: a mic RMS analyser with noise-floor calibration, and the "Hold to blow" button as a fallback. Each candle has random resistance, so they go out one at a time.
- Sound is fully synthesized (`Sound`): pops, thuds, match strike, shutter, chord, kiss, and a public-domain "Happy Birthday" music box.
- Debug handle: `window.__cake`.

## Personal content (CONFIG at the top of app.js)

Name Noush, age 27. The letter says he loves her, she's the best thing that has happened to him, and this is their first birthday together, the first of many more to come… with their 12 kids. The receipt's amount due is "1 big fat kiss, on the lips", paid with the "Pay with a kiss 💋" button. `CONFIG.from` (his name for the sign-off) is still empty.

## Design direction (decided, not yet implemented)

The current UI is peach on peach with chunky white app buttons and a bold sans. It's rejected. Change it to an **after-hours patisserie**:

- **Backdrop:** dark and warm, roughly `#110b0c → #2c1f1e`, with a soft radial pool behind the cake, faint film grain and a vignette. Remove the wood table. Use a dark floor plane with an alpha fade so the spotlight pool blends into the CSS background.
- **Lighting:** a key **SpotLight** from above-front (penumbra ~0.85, soft shadow), a strong warm backlight/rim to separate the cake from the dark background, a low hemisphere light and environment intensity around 0.5. Candlelight mode should then drop to near black, with the candles as the only light.
- **Stand:** marble with a thin **gold rim** at the plate edge and at the foot.
- **Cake:** no visible seams (see the bugs below). Add a **piped pearl border** (instanced spheres in the frosting color) at the base of every tier. Drips should be darker and glossier with a thinner top cap, never a flat colored disk.
- **Type:** Instrument Serif for display text and swatch/tool labels (italic for accents); a light geometric sans such as Jost (300/400) for UI, with small caps and letter-spacing on labels. Use IBM Plex Mono on the receipt and Caveat on the Polaroid caption.
- **UI:** dark smoked glass (`rgba(24,17,18,.5)`, blur 24px), 1px hairlines (`rgba(243,233,222,.14)`), cream text `#f3e9de`, and champagne gold `#d6b483` as the single accent. The chapter rail is quiet text, "I · Bake — II · Decorate — III · Candles — IV · Light", with a gold hairline under the active step. The Next button is a cream pill with small caps; Back is a hairline circle. Swatches are small circles with a gold ring when selected and serif labels. Spell out the tier count ("Two tiers"). Hints in serif italic.
- **Intro:** dark, with the empty stand in a spotlight. Small-caps eyebrow, "Happy birthday," in serif italic, a huge "Noush", and an outlined gold "Start baking" pill.
- **Finale:** the white Polaroid and receipt paper on the dark backdrop (already good contrast).

## Known issues / TODO (priority order)

1. **The look** (see the design direction above).
2. **Tier seams:** the vertical lines where main/wedge meet are visible even when the slice is closed. Fix by rendering a single full 360° frosting mesh (and full drip) while closed, and swapping to the split meshes only while sliced. Note that Raycaster does **not** skip invisible meshes, so filter `h.object.visible` in `decorHit`. With the full mesh, work out wedge vs main from the hit angle (|atan2(x,z)| < 30° means wedge).
3. **Toppings don't read** at cake scale. In the test screenshot the strawberries look like red balls, the macarons are pale blobs on the tier edge, the vinyl is a black dot and the latte is tiny. Raise the scale (`TS` 1.5 → about 2.2 and per-item tuning) and make each one recognizable:
   - Strawberry: a prominent green calyx facing up or sideways; consider a halved berry option with a white core.
   - Macaron: stands on its edge leaning into the frosting, with a visible ruffled foot and a contrasting filling line.
   - Vinyl: about 2× bigger, standing upright and leaning, with a visible label.
   - Latte: 1.5× bigger, with visible ice and the coffee/milk swirl.
   - Gold leaf: larger, crinkled flakes.
   - Cherry: on top with its stem visible.
   - Blueberries: placed as a little cluster of 3.
4. **The e2e test has only been verified up to Decorate.** Candles, light (match strike plus wick ignition), blow, finale, pay, letter and the spectator sync are written but not yet confirmed in a browser run.
5. Headless test notes: SwiftShader runs at about 11fps, so screenshots take around 12s. GSAP lag smoothing makes the tier drops look mid-air in screenshots, so call `gsap.ticker.lagSmoothing(0)` from the test via `page.evaluate`. Use long timeouts (`page.setDefaultTimeout(120000)`) and run `run.js` in the background.
6. The live MQTT brokers have never been tested against the real internet (the sandbox blocked them); only the local aedes broker was used. Test with two real browsers after deploying.
7. `CONFIG.from` is empty, so fill in his name.

## How to test

```
cd test && npm i
python3 ../build.py   # from repo root: python3 build.py
node run.js           # writes test/shots/*.png; ~5–8 min under SwiftShader
```
Look at every screenshot before calling a visual change done. Check iPad landscape (1180×820 and 1024×768) and also a phone width.
