# Prompts for Claude Code

Unzip, `cd` into the folder and run `claude`. It reads `CLAUDE.md` automatically, so it already knows the project, the constraints and the design direction. Paste these one at a time. After each one, look at the screenshots it shows you before moving on.

---

## 0 · Orient (optional, quick)

```
Read CLAUDE.md, src/shell.html and src/app.js. Build with `python3 build.py`, install test deps (`cd test && npm i`) and run `node test/probe.js` to confirm the page boots. Summarise in 5 lines what state the project is in. Don't change anything yet.
```

## 1 · Make it chic (the big one)

```
Redesign the visual layer to the "after-hours patisserie" direction in CLAUDE.md. Think like a senior UI designer at a luxury brand: restraint, hairlines, beautiful type, one accent colour. Concretely:
- Rewrite the CSS in src/shell.html: dark warm backdrop with a soft pool behind the cake, faint film grain + vignette; dark smoked-glass dock with 1px hairlines; cream text; champagne gold as the only accent; Instrument Serif for display/labels, Jost (300/400) small caps for UI.
- Chapter rail as quiet text "I · Bake — II · Decorate — III · Candles — IV · Light" with a gold hairline under the active one.
- Restyle every dock panel (tiers stepper with the count spelled out, swatches as small circles with gold selection ring and serif labels, tools, digit keypad, Undo, Next as cream pill, Back as hairline circle), the intro, matchbox, wish card, toasts, spectator HUD.
- 3D: remove the wood table; dark floor plane with alpha fade; key SpotLight from above-front with soft shadow, warm rim/backlight, low hemi, env ≈ 0.5. Update applyAmb() so candlelight mode goes near-black.
- Gold rim on the marble stand (plate edge + foot).
Then run the e2e test and show me screenshots of intro, bake, decorate and candles at 1180×820. Iterate until it genuinely looks like a luxury product page, not a 3D demo.
```

## 2 · Make the cake look real

```
Fix the cake itself:
1. Seams: render one full 360° frosting + drip mesh while the slice is closed, and swap to the split main/wedge meshes only while sliced (swap before the slide-out, swap back after the slide-in finishes). Make decorHit skip invisible meshes and work out wedge-vs-main from the hit angle.
2. Add a piped pearl border (instanced small spheres using the tier's frosting material) at the base of every tier; split between main/wedge groups so it moves with the slice.
3. Drips: darker, glossier, thinner top cap. Chocolate ≈ #2b140c, caramel ≈ #8f4a14, matcha darker. It should never read as a flat coloured disk.
4. Slightly more frosting texture (bump) and a touch of subsurface warmth.
Show me close-up screenshots of a 3-tier cake with a chocolate drip, slice closed and open.
```

## 3 · Make the toppings recognisable

```
The toppings don't read at cake scale. Rebuild them in makeTopping() so each one is instantly recognisable from the default camera distance, following the list in CLAUDE.md (bigger scale, strawberry with prominent calyx, macarons standing on edge with ruffled feet and a filling line, a large upright vinyl with its label, a bigger latte, crinkled gold leaf, a cherry with its stem, blueberries in clusters of 3). Keep geometry cached and draw calls low (merge where possible). Re-render the dock thumbnails. Show me a decorated cake screenshot plus the thumbnail strip.
```

## 4 · Verify the whole flow end to end

```
Run the full e2e test (test/run.js) through candles → light (strike the match, light every wick) → blow (hold button) → finale (Polaroid develops, receipt prints) → pay with a kiss → letter, with the spectator page open the whole time. Call gsap.ticker.lagSmoothing(0) in both pages first. Fix anything broken, and confirm the spectator mirrors tiers, toppings, piping, candles, flames, blow-out and the "paid" banner. Show me screenshots of each step and the spectator at the lit and paid moments. List any console errors.
```

## 5 · Personal touches

```
Set CONFIG.from to "<YOUR NAME>". Read the letter text in CONFIG.letter back to me and suggest (don't apply) one or two small wording tweaks so it sounds like me talking to her, not a card. Keep the "12 kids" line.
```

## 6 · Ship it

```
Help me put dist/index.html on GitHub Pages: create the repo, push, enable Pages, and give me (a) her link and (b) my private watch link (?watch). Then, with both open in two real browsers, confirm the live sync works over the public brokers. If neither broker connects, tell me and suggest a fallback that still needs no accounts.
```

## 7 · Final polish pass

```
Do one senior-designer polish pass at iPad 1180×820: spacing rhythm, type scale, motion timing (every transition should ease, nothing should snap), sound levels, and the candlelight moment. Check the finale on a phone width too. Show me before/after screenshots and keep the changes small and tasteful.
```
