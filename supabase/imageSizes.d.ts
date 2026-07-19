// Type companion for imageSizes.js (which stays CommonJS so next.config.js
// can require it) — keep the union in sync with IMAGE_WIDTHS there. Typing
// widths as this union lets call sites request tiers with plain literals
// while the compiler rejects off-ladder values.
export type ImageWidth = 360 | 800 | 1200 | 2000;
// Mutable array type because next.config.js assigns it to `deviceSizes`.
export const IMAGE_WIDTHS: ImageWidth[];
export function snapToImageWidth(width: number): ImageWidth;
