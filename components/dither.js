/* dither.js — a WebGL2 dither-field hero engine, generalised from the
   repconnect crescent (itself a port of the omp.sh eclipse stencil).

   the engine owns the look: 2px dither cells re-rolled every 90 frames,
   three density bands, a solid rim with a travelling glimmer, 2px spark
   particles, base grain + vignette, and a faint 512px grade-noise tile.
   a stencil supplies only the geometry:

   ditherHero(canvas, {
     palette:  { base, rim, mid, far, spark, vignette },  // hex strings, vignette 0|1
     common:   "glsl shared by field and particle",        // optional
     field:    "vec4 field(vec2 p) { ... }",
               // p: a 2px cell corner in canvas px, y down. returns
               // (wRim, wMid, wFar, theta). wRim >= 1 paints a solid rim
               // cell; otherwise the weights are the odds of each tint.
               // theta drives the rim glimmer: one wave per TAU.
     particle: "vec3 particle(uint seed) { ... }",         // (x, y, alpha) canvas px
     layout(w, h, scale) -> { count, custom?: number[<=12], texture?: { width, height, data: Uint8Array } }
     frame?(custom, df, pointer)                            // per frame; df in 60fps units
   })

   glsl sees: viewport (w, h, scale, frame) pointer (x, y, active, vignette)
   c0 c1 c2 (custom) rim mid far spark base, sampler2D tex (R8, linear),
   plus the helpers bands, glimmer, cycle, fade, shallow, fallFromRing, riseFrom. */
(() => {
    "use strict";

    const TAU = Math.PI * 2;
    const FRAME_MS = 1000 / 60;
    const PIXEL_BUDGET = 2.2e6;
    const MAX_PARTICLES = 30000;

    const PRELUDE = `#version 300 es
precision highp float;
precision highp int;
layout(std140) uniform Scene {
    vec4 viewport;  // width, height, scale, frame (60 fps units)
    vec4 pointer;   // x, y (canvas px, y down), active, vignette strength
    vec4 c0; vec4 c1; vec4 c2;  // stencil-defined
    vec4 rim; vec4 mid; vec4 far; vec4 spark; vec4 base;
};
uniform sampler2D tex;
const float TAU = 6.283185307179586;
uint hash_u32(uint v) {
    v = (v ^ (v >> 16u)) * 0x7feb352du;
    v = (v ^ (v >> 15u)) * 0x846ca68bu;
    return v ^ (v >> 16u);
}
float random01(uint v) { return float(hash_u32(v) >> 8u) / 16777216.0; }
float vignette(vec2 p) {
    float n = distance(p, viewport.xy * 0.5) / (1600.0 * viewport.z);
    return max(0.2, 1.0 - pointer.w * n * n * n);
}
float glimmer(float theta) { return 1.0 + 0.16 * sin(theta - viewport.w * (TAU * 2.2 / 720.0)); }
/* the crescent falloff: rim, mid and far odds for a cell d px outside an
   edge. stretch scales all three decay lengths. */
vec3 bands(float d, float stretch) {
    float s = viewport.z * stretch;
    return vec3(exp(-d / (14.0 * s)),
                exp(-d / (120.0 * s)) * min(1.0, d / (10.0 * s)) * 0.85,
                exp(-d / (600.0 * s)) * min(1.0, d / (30.0 * s)) * 0.7);
}
/* a particle's life: x wraps every period, fades in over 3px and out over the last quarter */
float cycle(float x, float period) { return x - floor(x / period) * period; }
float fade(float x, float period) { return max(0.0, min(min(1.0, x / 3.0), (period - x) / (period * 0.25))); }
/* cube-root bias: most particles travel a short way, a few go the whole band */
float shallow(uint seed, float band) { return max(band * (1.0 - pow(random01(seed), 1.0 / 3.0)), 14.0 * viewport.z); }
/* the crescent's particles: born on a ring, falling inward through band px with a sideways wander */
vec3 fallFromRing(uint seed, vec2 center, float ringRadius, float band) {
    float s = viewport.z, t = viewport.w;
    float angle = random01(seed ^ 0xa511e9b3u) * TAU;
    float depth = shallow(seed ^ 0x63d83595u, band);
    float speed = (0.14 + random01(seed ^ 0x9e3779b9u) * 0.22) * s;
    float fall = cycle(t * speed + random01(seed ^ 0xc2b2ae35u) * depth, depth);
    float radius = ringRadius - fall;
    float wf = 0.004 + random01(seed ^ 0x27d4eb2fu) * 0.011;
    float wander = -(0.06 * s / wf) * cos(t * wf + random01(seed ^ 0x165667b1u) * TAU) / max(radius, 1.0);
    return vec3(center + radius * vec2(cos(angle + wander), sin(angle + wander)), fade(fall, depth));
}
/* born at origin, rising straight up through band px with a sideways sway */
vec3 riseFrom(uint seed, vec2 origin, float band) {
    float s = viewport.z, t = viewport.w;
    float height = shallow(seed ^ 0x63d83595u, band);
    float speed = (0.10 + random01(seed ^ 0x9e3779b9u) * 0.18) * s;
    float h = cycle(t * speed + random01(seed ^ 0xc2b2ae35u) * height, height);
    float sway = sin(t * 0.012 + random01(seed ^ 0x27d4eb2fu) * TAU) * 8.0 * s;
    return vec3(origin.x + sway, origin.y - h, fade(h, height));
}
`;

    const FULLSCREEN_VS = `
void main() {
    float x = float((gl_VertexID & 1) << 2) - 1.0;
    float y = float((gl_VertexID & 2) << 1) - 1.0;
    gl_Position = vec4(x, y, 0.0, 1.0);
}`;

    const FIELD_FS = `
out vec4 fragColor;
void main() {
    vec2 pos = vec2(gl_FragCoord.x, viewport.y - gl_FragCoord.y);
    uvec2 pixel = uvec2(pos);
    float grain = (random01((pixel.y * uint(viewport.x) + pixel.x) ^ 0x9e3779b9u) - 0.5) * (24.0 / 255.0);
    vec3 ground = max(base.rgb * vignette(pos) + grain, 0.0);
    vec2 cell = floor(pos * 0.5) * 2.0;
    vec4 f = field(cell);
    float shade = vignette(cell + 1.0);
    vec3 ink = vec3(0.0);
    bool occupied = false;
    if (f.x >= 1.0) {
        ink = rim.rgb * shade * glimmer(f.w);
        occupied = true;
    } else {
        float total = min(1.0, f.x + f.y + f.z);
        if (total > 0.003) {
            uint columns = uint(ceil(viewport.x * 0.5));
            uint cellIndex = uint(cell.y * 0.5) * columns + uint(cell.x * 0.5);
            uint bucket = hash_u32(cellIndex ^ 0x85ebca6bu) % 90u;
            uint frame = uint(max(0.0, floor(viewport.w)));
            uint generation = (frame + 89u - bucket) / 90u;
            float roll = random01(cellIndex ^ (generation * 0xc2b2ae35u) ^ 0x20260712u);
            if (roll < f.x) { ink = rim.rgb * shade * glimmer(f.w); occupied = true; }
            else if (roll < f.x + f.y) { ink = mid.rgb * shade; occupied = true; }
            else if (roll < total) { ink = far.rgb * shade; occupied = true; }
        }
    }
    fragColor = vec4(occupied ? max(ink + grain, 0.0) : ground, 1.0);
}`;

    const PARTICLE_VS = `
out float intensity;
out float opacity;
void main() {
    vec3 p = particle(uint(gl_VertexID));
    gl_Position = vec4(p.x / viewport.x * 2.0 - 1.0, 1.0 - p.y / viewport.y * 2.0, 0.0, 1.0);
    gl_PointSize = 2.0;
    intensity = vignette(p.xy);
    opacity = p.z;
}`;

    const PARTICLE_FS = `
in float intensity;
in float opacity;
out vec4 fragColor;
void main() { fragColor = vec4(spark.rgb * intensity, opacity); }`;

    const GRADE_FS = `
out vec4 fragColor;
void main() {
    uvec2 tile = uvec2(vec2(gl_FragCoord.x, viewport.y - gl_FragCoord.y)) % 512u;
    float value = random01((tile.y * 512u + tile.x) ^ 0xc2b2ae35u);
    if (value >= 0.045) discard;
    fragColor = vec4(vec3(value < 0.023 ? 0.0 : 1.0), 10.0 / 255.0);
}`;

    window.ditherHero = function ditherHero(canvas, stencil) {
        const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false });
        if (!gl) return;

        function compile(type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, PRELUDE + source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
            return shader;
        }

        function program(vs, fs) {
            const prog = gl.createProgram();
            gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
            gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
            gl.linkProgram(prog);
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
            gl.uniformBlockBinding(prog, gl.getUniformBlockIndex(prog, "Scene"), 0);
            gl.useProgram(prog);
            gl.uniform1i(gl.getUniformLocation(prog, "tex"), 0);
            return prog;
        }

        const common = stencil.common || "";
        const field = program(FULLSCREEN_VS, common + stencil.field + FIELD_FS);
        const particles = program(common + stencil.particle + PARTICLE_VS, PARTICLE_FS);
        const grade = program(FULLSCREEN_VS, GRADE_FS);

        // scene layout (floats): viewport 0, pointer 4, c0..c2 8..19, rim 20, mid 24, far 28, spark 32, base 36
        const scene = new Float32Array(40);
        const custom = scene.subarray(8, 20);
        const sceneBuffer = gl.createBuffer();
        gl.bindBuffer(gl.UNIFORM_BUFFER, sceneBuffer);
        gl.bufferData(gl.UNIFORM_BUFFER, scene.byteLength, gl.DYNAMIC_DRAW);
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, sceneBuffer);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const rgba = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1]; };
        const { rim, mid, far, spark, base, vignette = 1 } = stencil.palette;
        scene.set([...rgba(rim), ...rgba(mid), ...rgba(far), ...rgba(spark), ...rgba(base)], 20);
        scene[7] = vignette;

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        const upload = ({ width, height, data }) => gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, width, height, 0, gl.RED, gl.UNSIGNED_BYTE, data);
        upload({ width: 1, height: 1, data: new Uint8Array(1) });

        let count = 0;

        function resize() {
            const cssW = Math.max(320, canvas.clientWidth), cssH = Math.max(240, canvas.clientHeight);
            const density = Math.max(.55, Math.min(window.devicePixelRatio || 1, Math.sqrt(PIXEL_BUDGET / (cssW * cssH))));
            const w = Math.round(cssW * density), h = Math.round(cssH * density);
            canvas.width = w;
            canvas.height = h;
            gl.viewport(0, 0, w, h);
            const scale = Math.min(2, Math.max(.5, Math.sqrt(w * h / (1920 * 1080))));
            scene.set([w, h, scale], 0);
            const out = stencil.layout(w, h, scale);
            count = Math.min(MAX_PARTICLES, Math.round(out.count));
            if (out.custom) custom.set(out.custom);
            if (out.texture) upload(out.texture);
        }

        const pointer = { x: 0, y: 0, active: 0 };
        const host = canvas.parentElement || canvas;
        host.addEventListener("pointermove", (e) => {
            const r = canvas.getBoundingClientRect();
            pointer.x = (e.clientX - r.left) * canvas.width / r.width;
            pointer.y = (e.clientY - r.top) * canvas.height / r.height;
            pointer.active = 1;
            kick();
        });
        host.addEventListener("pointerleave", () => { pointer.active = 0; kick(); });

        const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
        let elapsed = 0, lastTime = 0, raf = 0, inView = true;

        function draw(now) {
            raf = 0;
            const df = motion.matches ? 0 : Math.min(10, (now - lastTime) / FRAME_MS);
            lastTime = now;
            elapsed += df;
            scene[3] = elapsed;
            scene.set([pointer.x, pointer.y, pointer.active], 4);
            if (stencil.frame) stencil.frame(custom, df, pointer);
            gl.bufferSubData(gl.UNIFORM_BUFFER, 0, scene);
            gl.disable(gl.BLEND);
            gl.useProgram(field);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            gl.enable(gl.BLEND);
            gl.useProgram(particles);
            gl.drawArrays(gl.POINTS, 0, count);
            gl.useProgram(grade);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            if (inView && !motion.matches) raf = requestAnimationFrame(draw);
        }

        function kick() {
            if (raf) return;
            lastTime = performance.now();
            raf = requestAnimationFrame(draw);
        }

        new ResizeObserver(() => { resize(); kick(); }).observe(canvas);
        new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; if (inView) kick(); }).observe(canvas);
        motion.addEventListener("change", kick);
        // stencils that rasterise text (signal) need the webfont; harmless for the rest
        if (document.fonts) document.fonts.ready.then(() => { resize(); kick(); });
    };
})();
