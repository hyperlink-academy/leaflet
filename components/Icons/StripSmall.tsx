import { Props } from "./Props";

export const StripSmall = (props: Props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect x="3" y="3" width="18" height="3" rx="1" fill="currentColor" />
      <rect x="3" y="8" width="18" height="8" rx="1" fill="currentColor" />
      <rect x="3" y="18" width="18" height="3" rx="1" fill="currentColor" />
    </svg>
  );
};
