import { Props } from "./Props";

export const GridSmall = (props: Props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect x="3" y="4" width="8" height="7" rx="1" fill="currentColor" />
      <rect x="13" y="4" width="8" height="7" rx="1" fill="currentColor" />
      <rect x="3" y="13" width="8" height="7" rx="1" fill="currentColor" />
      <rect x="13" y="13" width="8" height="7" rx="1" fill="currentColor" />
    </svg>
  );
};
