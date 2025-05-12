import { Props } from "./Props";

export const CheckboxEmpty = (props: Props) => {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 1.875C0 0.839466 0.839466 0 1.875 0H10.125C11.1605 0 12 0.839466 12 1.875V10.125C12 11.1605 11.1605 12 10.125 12H1.875C0.839466 12 0 11.1605 0 10.125V1.875ZM1.875 1.25C1.52982 1.25 1.25 1.52982 1.25 1.875V10.125C1.25 10.4702 1.52982 10.75 1.875 10.75H10.125C10.4702 10.75 10.75 10.4702 10.75 10.125V1.875C10.75 1.52982 10.4702 1.25 10.125 1.25H1.875Z"
        fill="currentColor"
      />
    </svg>
  );
};
