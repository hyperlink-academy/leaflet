// Shared helpers for the collaborative cursor overlay (see RemoteCursors.tsx
// for the rendering and remoteCursorPlugin.ts for the awareness plumbing).

// All durations are the prototype's values × a 0.7 global speed multiplier.
export const CONTRACT_MS = 112;

// Damped harmonic oscillator (mass 1, stiffness 280, damping 14 — ~13%
// overshoot with a faint second bounce) solved closed-form and sampled into
// a CSS linear() easing. Falls back to a bouncy bezier where linear() isn't
// supported.
let springVars: { easing: string; duration: number } | null = null;
export function getSpringVars() {
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
export function ensureGooFilter() {
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

export function cursorColors(hue: number) {
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
