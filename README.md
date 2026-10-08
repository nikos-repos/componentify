# componentify

Niko Bono's public web components. Every piece is one self-contained HTML file: open it, read it, copy the `usage` block at the bottom into your own page. Live versions run at [nikobono.com/web-design](https://www.nikobono.com/web-design.html).

## Components

Three sets: A–J use the site system (Space Grotesk + JetBrains Mono, cyan accent); K–U use the gold set (Instrument Serif + Inter, `#c9a24b`); V–AA are the dither heroes below, site type with one tint each. GSAP 3.13 from cdnjs where a file says so; nothing else to install.

| # | Component | Category | What it does | File |
|---|---|---|---|---|
| A | Plus-Marked Frame | Framing | A framed container with plus corner markers, assembling in reading order. | [plus-frame.html](components/plus-frame.html) |
| B | Hover List | Navigation | Large nav items that brighten, indent, and bullet on hover. | [hover-list.html](components/hover-list.html) |
| C | ASCII Lava Hero | Background | Fixed ASCII noise field drifting upward behind the content. | [ascii-hero.html](components/ascii-hero.html) |
| D | Status Lines | Indicators | Breathing status squares and a drifting scanline panel. | [status-lines.html](components/status-lines.html) |
| E | Directional Fill Button | Action | A CTA whose fill wipes in from the cursor's entry edge. | [directional-button.html](components/directional-button.html) |
| F | Project Card | Card | Numbered card with a hover meta reveal and an accent title rule. | [project-card.html](components/project-card.html) |
| G | Timeline Rail | Section | A vertical rail that draws top to bottom with staggered entries. | [timeline-rail.html](components/timeline-rail.html) |
| H | Code Reveal | Content | Code display with line stagger, monochrome syntax, and copy. | [code-reveal.html](components/code-reveal.html) |
| I | Kinetic Marquee | Motion | A seamless scrolling text band that pauses on hover. | [kinetic-marquee.html](components/kinetic-marquee.html) |
| J | Contact Form | Form | Underline inputs, accent focus, directional-wipe submit. | [contact-form.html](components/contact-form.html) |
| K | Text Shimmer | Text Effect | A slow gold gradient sweep across otherwise-muted text. | [text-shimmer.html](components/text-shimmer.html) |
| L | Stacking Cards | Section | Sticky cards that lock and fade as the next one rises. | [stacking-cards.html](components/stacking-cards.html) |
| M | Magnetic Emblem | Interaction | Dock-style proximity magnification with a breathing halo. | [magnetic-emblem.html](components/magnetic-emblem.html) |
| N | Alpha Curve | Data Viz | A gold curve that draws itself in on scroll with a synced counter. | [alpha-curve.html](components/alpha-curve.html) |
| O | Bento Card | Card | A cell whose gold hairline and feature glyph ignite on hover. | [bento-card.html](components/bento-card.html) |
| P | Testimonial Carousel | Carousel | Overlapping portraits with full keyboard control. | [testimonial-carousel.html](components/testimonial-carousel.html) |
| Q | Scroll Progress | Indicator | A 2px gold bar that tracks the page scroll ratio. | [scroll-progress.html](components/scroll-progress.html) |
| R | Seamless Marquee | Motion | A doubled track that loops and pauses on hover. | [marquee.html](components/marquee.html) |
| S | Access Form | Form | A gated invitation form with inline validation and states. | [access-form.html](components/access-form.html) |
| T | Ambient Layer | Atmosphere | Film grain plus a radial wash and a warm gold bloom. | [ambient-layer.html](components/ambient-layer.html) |
| U | Scroll-Scrubbed Creed | Section | A manifesto that writes itself in word by word on scroll. | [scroll-creed.html](components/scroll-creed.html) |

[accent-study.html](components/accent-study.html) is the study that fixed the one-accent rule the A–J set follows.

## Dither heroes (V–AA)

Six hero splash screens on one engine, [dither.js](components/dither.js), a WebGL2 generalisation of the repconnect crescent. The engine owns the look: 2px cells re-rolled every 90 frames, three density bands, a solid rim with a travelling glimmer, 2px sparks, grain, vignette. Each hero is a stencil: two short GLSL functions and a layout. Copy `dither.js` next to your page and paste the stencil from the hero's usage block.

| # | Component | Geometry | File |
|---|---|---|---|
| V | Dither Tide | Three-sine sea surface; the sea glows below it, spray rises into the dark. | [dither-tide.html](components/dither-tide.html) |
| W | Dither Halo | A thin ring, long bands out and short bands in; sparks fall toward the copy. | [dither-halo.html](components/dither-halo.html) |
| X | Dither Beam | A cone from the top-left, solid edges, dust drifting down the shaft. | [dither-beam.html](components/dither-beam.html) |
| Y | Dither Bloom | A pocket eclipse that stretches into a comet as it moves; eases toward the pointer, wanders a Lissajous path when idle. | [dither-bloom.html](components/dither-bloom.html) |
| Z | Dither Signal | The headline rasterised to a signed distance texture; glyphs carved out of light. | [dither-signal.html](components/dither-signal.html) |
| AA | Dither Portal | A standing oval; three spiral arms turn about a black core inside, the glow spills out, sparks ride the arms in. | [dither-portal.html](components/dither-portal.html) |

Writing a new one:

```js
ditherHero(canvas, {
  palette:  { base, rim, mid, far, spark, vignette },   // hex strings, vignette 0|1
  common:   `/* glsl shared by field and particle */`,  // optional
  field:    `vec4 field(vec2 p) { ... }`,                // (rim, mid, far odds, theta); rim >= 1 is a solid cell
  particle: `vec3 particle(uint seed) { ... }`,          // (x, y, alpha) in canvas px
  layout:   (w, h, scale) => ({ count, custom, texture }),
  frame:    (custom, df, pointer) => {},                 // optional, per frame
});
```

`bands(d, stretch)` gives the crescent falloff for a cell `d` px outside an edge; `fallFromRing` and `riseFrom` are the two particle behaviours the heroes share.

## Running locally

```sh
python3 -m http.server 8000
# open http://localhost:8000/components/<name>.html
```

Opening a file directly works for most pieces too; a server is only needed where a page fetches a sibling asset.

## Source of truth

These files are copied from the `web-components/` folder of nikobono.com. The only edit is the top-left back link, which points at the live index instead of a relative page that does not exist here.
