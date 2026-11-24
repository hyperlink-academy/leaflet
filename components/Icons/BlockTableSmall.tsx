import type { Props } from "./Props";

export function BlockTableSmall(props: Props) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <rect
        x="3"
        y="4"
        width="14"
        height="12"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M3 8h14M3 12h14M10 4v12"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
