# componentify

Niko Bono's public web components. Every piece is one self-contained HTML file: open it, read it, copy the `usage` block at the bottom into your own page. Live versions run at [nikobono.com/web-design](https://www.nikobono.com/web-design.html).

## Components

Two token sets: A–J use the site system (Space Grotesk + JetBrains Mono, cyan accent); K–U use the gold set (Instrument Serif + Inter, `#c9a24b`). GSAP 3.13 from cdnjs where a file says so; nothing else to install.

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

## Running locally

```sh
python3 -m http.server 8000
# open http://localhost:8000/components/<name>.html
```

Opening a file directly works for most pieces too; a server is only needed where a page fetches a sibling asset.

## Source of truth

These files are copied from the `web-components/` folder of nikobono.com. The only edit is the top-left back link, which points at the live index instead of a relative page that does not exist here.
