// Custom cursor widget for y-prosemirror's yCursorPlugin: a caret line with
// a small dot centered on its tip. Hovering contracts the caret in
// anticipation, then springs it open into a pill showing the user's name,
// the dot melting into the pill via an SVG goo filter. Styles live in
// app/globals.css.
//
// Three layers, so the goo filter never touches visible text:
//  1. goo: a line stub + the pill blob (with a transparent copy of the name
//     for sizing), run through the goo filter so they melt together
//  2. the full caret line, outside the filter, so its bottom cap stays crisp
//  3. a transparent twin of the pill holding the visible name — identical
//     bounds and transforms in every state so the text clips and moves with
//     the pill

// All durations are the prototype's values × a 0.7 global speed multiplier.
const CONTRACT_MS = 112;

// Damped harmonic oscillator (mass 1, stiffness 280, damping 14 — ~13%
// overshoot with a faint second bounce) solved closed-form and sampled into
// a CSS linear() easing. Falls back to a bouncy bezier where linear() isn't
// supported.
let springVars: { easing: string; duration: number } | null = null;
function getSpringVars() {
  if (springVars) return springVars;
  const supported =
    typeof CSS !== "undefined" &&
    CSS.supports("transition-timing-function", "linear(0, 0.5, 1)");
  if (!supported)
    return (springVars = {
      easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      duration: 400,
    });
  const stiffness = 280;
  const damping = 14;
  const w0 = Math.sqrt(stiffness);
  const zeta = damping / (2 * Math.sqrt(stiffness));
  const wd = w0 * Math.sqrt(1 - zeta * zeta);
  // run until the envelope settles to 0.1%, clamped, × 0.7 speed
  const duration = Math.min(6, Math.max(0.15, Math.log(1000) / (zeta * w0)));
  let points: string[] = [];
  for (let i = 0; i <= 100; i++) {
    const t = (i / 100) * duration;
    const x =
      1 -
      Math.exp(-zeta * w0 * t) *
        (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
    points.push(x.toFixed(4));
  }
  return (springVars = {
    easing: `linear(${points.join(",")})`,
    duration: Math.round(duration * 700),
  });
}

// Goo: blur, then hard-cut alpha at exactly 0.5 (no halo on lone shapes;
// melt only appears where two blurs overlap), then draw the crisp source
// over the goo.
function ensureGooFilter() {
  if (document.getElementById("yjs-cursor-goo-svg")) return;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = "yjs-cursor-goo-svg";
  svg.setAttribute("aria-hidden", "true");
  svg.style.position = "absolute";
  svg.style.width = "0";
  svg.style.height = "0";
  svg.innerHTML = `<defs><filter id="yjs-cursor-goo">
    <feGaussianBlur in="SourceGraphic" stdDeviation="1.25" result="blur" />
    <feComponentTransfer in="blur" result="goo"><feFuncA type="discrete" tableValues="0 1" /></feComponentTransfer>
    <feComposite in="SourceGraphic" in2="goo" operator="over" />
  </filter></defs>`;
  document.body.appendChild(svg);
}

// Tap-to-expand for touch devices. The widget is fully pointer-events: none
// on touch so it can never interrupt a caret or selection-handle drag —
// so instead of receiving events, a single passive document listener
// watches for completed taps (single touch, little movement) and hit-tests
// them against the cursor dots by bounding rect (elementFromPoint skips
// pointer-events: none elements). The tap still places the local caret
// underneath; the pill just opens above it.
const TAP_SLOP = 12;
const TAP_AUTO_CLOSE_MS = 4000;
let tapToExpandInstalled = false;
function installTapToExpand() {
  if (tapToExpandInstalled || typeof window === "undefined") return;
  tapToExpandInstalled = true;
  // hover-capable devices use the mouseenter/mouseleave path instead; on
  // hybrids the synthetic mouse events from taps already drive it
  if (!window.matchMedia("(hover: none)").matches) return;

  let touchStart: { x: number; y: number } | null = null;
  let contractTimer: number | null = null;
  let autoCloseTimer: number | null = null;
  const close = (cursor: Element) =>
    cursor.classList.remove("yjs-cursor-contract", "yjs-cursor-open");

  document.addEventListener(
    "touchstart",
    (e) => {
      touchStart =
        e.touches.length === 1
          ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
          : null;
    },
    { passive: true },
  );
  document.addEventListener(
    "touchend",
    (e) => {
      if (!touchStart) return;
      const start = touchStart;
      touchStart = null;
      const touch = e.changedTouches[0];
      if (!touch) return;
      if (Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > TAP_SLOP)
        return;

      const tappedHit = Array.from(
        document.querySelectorAll(".yjs-cursor-hit, .yjs-cursor-label"),
      ).find((hit) => {
        const r = hit.getBoundingClientRect();
        return (
          touch.clientX >= r.left - TAP_SLOP &&
          touch.clientX <= r.right + TAP_SLOP &&
          touch.clientY >= r.top - TAP_SLOP &&
          touch.clientY <= r.bottom + TAP_SLOP
        );
      });
      const target = tappedHit?.closest(".ProseMirror-yjs-cursor") ?? null;

      if (contractTimer !== null) window.clearTimeout(contractTimer);
      if (autoCloseTimer !== null) window.clearTimeout(autoCloseTimer);
      contractTimer = null;
      autoCloseTimer = null;
      document
        .querySelectorAll(
          ".ProseMirror-yjs-cursor.yjs-cursor-open, .ProseMirror-yjs-cursor.yjs-cursor-contract",
        )
        .forEach((c) => {
          if (c !== target) close(c);
        });
      if (!target) return;
      if (target.classList.contains("yjs-cursor-open")) {
        close(target);
        return;
      }
      // same anticipation → spring-open sequence as hover
      target.classList.add("yjs-cursor-contract");
      contractTimer = window.setTimeout(() => {
        contractTimer = null;
        target.classList.remove("yjs-cursor-contract");
        target.classList.add("yjs-cursor-open");
      }, CONTRACT_MS);
      autoCloseTimer = window.setTimeout(() => {
        autoCloseTimer = null;
        close(target);
      }, TAP_AUTO_CLOSE_MS);
    },
    { passive: true },
  );
}

const el = (tag: string, ...classes: string[]) => {
  const e = document.createElement(tag);
  e.classList.add(...classes);
  return e;
};

// Cursor colors are derived from the leaflet's theme: each client gets a
// stable hue offset, rotated from --accent-contrast in oklch so every cursor
// shares the accent's character and re-themes live. Chroma is clamped up so
// near-gray accents still differentiate, lightness is clamped into a band
// that keeps cursors visible, and the label text flips between near-white
// and near-black based on the derived lightness so it always reads.
const FALLBACK_COLORS = [
  "#30bced",
  "#6eeb83",
  "#ffbc42",
  "#ecd444",
  "#ee6352",
  "#9ac2c9",
  "#8acb88",
  "#1be7ff",
];
const FALLBACK_TEXT = "rgba(0, 0, 0, 0.8)";

let relativeColorSupport: boolean | null = null;
const supportsRelativeColor = () => {
  if (relativeColorSupport === null)
    relativeColorSupport =
      typeof CSS !== "undefined" && CSS.supports("color", "oklch(from red l c h)");
  return relativeColorSupport;
};

function cursorColors(hue: number) {
  if (!supportsRelativeColor()) {
    const i =
      ((Math.round(hue / 45) % FALLBACK_COLORS.length) +
        FALLBACK_COLORS.length) %
      FALLBACK_COLORS.length;
    return {
      color: FALLBACK_COLORS[i],
      text: FALLBACK_TEXT,
      selection: `${FALLBACK_COLORS[i]}59`, // 35% alpha
    };
  }
  const channels = `clamp(0.55, l, 0.75) clamp(0.08, c, 0.16) calc(h + ${hue})`;
  return {
    color: `oklch(from rgb(var(--accent-contrast)) ${channels})`,
    // the steep slope makes this resolve to ~white below L 0.66, ~black above
    text: `oklch(from rgb(var(--accent-contrast)) clamp(0.13, (0.66 - clamp(0.55, l, 0.75)) * 1000, 0.985) 0 0)`,
    selection: `oklch(from rgb(var(--accent-contrast)) ${channels} / 0.35)`,
  };
}

// The default selection builder concatenates an alpha onto a hex color, so
// it can't express theme-derived colors — this one inlines them instead.
export const collabSelectionBuilder = (user: { hue?: number }) => ({
  style: `background-color: ${cursorColors(user.hue ?? 0).selection}`,
  class: "ProseMirror-yjs-selection",
});

export const collabCursorBuilder = (user: {
  name?: string;
  hue?: number;
}): HTMLElement => {
  ensureGooFilter();
  installTapToExpand();
  const spring = getSpringVars();
  const colors = cursorColors(user.hue ?? 0);

  const cursor = document.createElement("span");
  cursor.classList.add("ProseMirror-yjs-cursor");
  cursor.style.setProperty("--cursor-color", colors.color);
  cursor.style.setProperty("--cursor-text-color", colors.text);
  cursor.style.setProperty("--yjs-spring-ease", spring.easing);
  cursor.style.setProperty("--yjs-spring-dur", `${spring.duration}ms`);
  // Word-joiners on either side keep the widget from affecting line breaks,
  // same as y-prosemirror's default cursor builder.
  cursor.appendChild(document.createTextNode("\u2060"));

  const displayName = user.name || "Anonymous";
  const goo = el("div", "yjs-cursor-goo");
  const stub = el("div", "yjs-cursor-stub");
  const pill = el("div", "yjs-cursor-pill");
  const sizer = el("span", "yjs-cursor-text", "yjs-cursor-sizer");
  sizer.textContent = displayName;
  pill.appendChild(sizer);
  goo.appendChild(stub);
  goo.appendChild(pill);

  const line = el("div", "yjs-cursor-line");

  const overlay = el("div", "yjs-cursor-overlay");
  const hit = el("div", "yjs-cursor-hit");
  const label = el("div", "yjs-cursor-pill", "yjs-cursor-label");
  const name = el("span", "yjs-cursor-text");
  name.textContent = displayName;
  label.appendChild(name);
  overlay.appendChild(hit);
  overlay.appendChild(label);

  cursor.appendChild(goo);
  cursor.appendChild(line);
  cursor.appendChild(overlay);
  cursor.appendChild(document.createTextNode("\u2060"));

  // mouseenter → brief contraction, then spring open; mouseleave anytime →
  // ease back. States are classes driving transitions (never keyframes), so
  // interrupting mid-animation stays smooth.
  let timer: number | null = null;
  cursor.addEventListener("mouseenter", () => {
    if (timer !== null) window.clearTimeout(timer);
    cursor.classList.remove("yjs-cursor-open");
    cursor.classList.add("yjs-cursor-contract");
    timer = window.setTimeout(() => {
      timer = null;
      cursor.classList.remove("yjs-cursor-contract");
      cursor.classList.add("yjs-cursor-open");
    }, CONTRACT_MS);
  });
  cursor.addEventListener("mouseleave", () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    cursor.classList.remove("yjs-cursor-contract", "yjs-cursor-open");
  });

  return cursor;
};
