import { Props } from "./Props";

export const PopoverArrow = (
  props: { arrowFill: string; arrowStroke: string } & Props,
) => {
  let { arrowFill, arrowStroke, ...passDownProps } = props;
  return (
    <svg
      {...passDownProps}
      width="16"
      height="8"
      viewBox="0 0 16 8"
      fill="none"
      className="-mt-px"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15.1975 0L0.951538 0.00460007L8.07229 7.31325L15.1975 0Z"
        fill={arrowFill}
      />
      <path
        d="M16 0L8.35386 7.84887C8.15753 8.05038 7.83922 8.05038 7.64289 7.84887L0 0.00420923L1.42188 0.00424847L7.99837 6.75428L14.579 0H16Z"
        fill={arrowStroke}
      />
    </svg>
  );
};
