import { Props } from "./Props";

export const BlockEmbeddedCanvasSmall = (props: Props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect
        x="2.75"
        y="4.75"
        width="18.5"
        height="14.5"
        rx="2.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6 15.5C7.5 12 9 10 10.5 11.5C12 13 12.5 14.5 14.5 12C15.9 10.25 17 9 18 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};
