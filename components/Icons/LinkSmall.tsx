import { Props } from "./Props";

export const LinkSmall = (props: Props) => {
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
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101a.75.75 0 00-1.06-1.06l-1.102 1.1a2.5 2.5 0 11-3.536-3.535l4-4a2.5 2.5 0 013.536 3.536.75.75 0 101.06 1.06 4 4 0 000-5.656z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 10-5.656-5.656l-1.102 1.101a.75.75 0 001.06 1.06l1.102-1.1a2.5 2.5 0 113.536 3.535l-4 4a2.5 2.5 0 01-3.536-3.536.75.75 0 10-1.06-1.06 4 4 0 000 5.656z"
        fill="currentColor"
      />
    </svg>
  );
};
