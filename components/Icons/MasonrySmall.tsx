import { Props } from "./Props";

export const MasonrySmall = (props: Props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect x="3" y="3" width="8" height="10" rx="1" fill="currentColor" />
      <rect x="3" y="15" width="8" height="6" rx="1" fill="currentColor" />
      <rect x="13" y="3" width="8" height="5" rx="1" fill="currentColor" />
      <rect x="13" y="10" width="8" height="11" rx="1" fill="currentColor" />
    </svg>
  );
};
