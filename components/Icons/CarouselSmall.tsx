import { Props } from "./Props";

export const CarouselSmall = (props: Props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect x="2" y="7" width="3" height="10" rx=".75" fill="currentColor" />
      <rect x="7" y="4" width="10" height="16" rx="1" fill="currentColor" />
      <rect x="19" y="7" width="3" height="10" rx=".75" fill="currentColor" />
    </svg>
  );
};
