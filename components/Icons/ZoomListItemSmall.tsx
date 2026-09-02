import { Props } from "./Props";

export const ZoomListItemSmall = (props: Props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="4.4" cy="6.2" r="1.3" fill="currentColor" />
      <circle cx="4.4" cy="12" r="1.3" fill="currentColor" />
      <circle cx="4.4" cy="17.8" r="1.3" fill="currentColor" />
      <path
        d="M8.2 6.2H19.5M8.2 12H10.5M8.2 17.8H9.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        cx="15.5"
        cy="14.5"
        r="4"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M18.5 17.5L21.5 20.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};
