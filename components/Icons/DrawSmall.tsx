import { Props } from "./Props";

export const DrawSmall = (props: Props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M20.17 6.81a1 1 0 0 0-3.98-3.99L4.84 14.17a2 2 0 0 0-.5.83l-1.32 4.36a.5.5 0 0 0 .62.62l4.36-1.32a2 2 0 0 0 .83-.5zM14 5l4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
