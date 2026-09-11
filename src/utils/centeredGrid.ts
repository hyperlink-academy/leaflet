import type { CSSProperties } from "react";

// Column layout shared by the membership tier grid and the post-subscribe
// publication recommendations: one to three items each get their own column in
// a single row, four splits into two rows of two, and anything more runs three
// across with a partial last row centered under the full ones.
//
// The grid is laid out with twice as many columns as it shows so a leftover
// last row can start on a half-column offset; every cell spans two.
export function centeredGridColumns(count: number) {
  if (count <= 3) return Math.max(count, 1);
  if (count === 4) return 2;
  return 3;
}

export function centeredGridStyle(count: number): CSSProperties {
  return {
    gridTemplateColumns: `repeat(${centeredGridColumns(count) * 2}, minmax(0, 1fr))`,
  };
}

export function centeredGridCellStyle(
  index: number,
  count: number,
): CSSProperties {
  let columns = centeredGridColumns(count);
  let remainder = count % columns;
  let lastRowStart = count - remainder;
  if (!remainder || index < lastRowStart) return { gridColumn: "span 2" };
  let start = columns - remainder + 1 + (index - lastRowStart) * 2;
  return { gridColumn: `${start} / span 2` };
}
