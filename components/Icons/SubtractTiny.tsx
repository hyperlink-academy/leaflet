import { Props } from "./Props";

export const SubtractTiny = (props: Props) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0ZM3.29821 7C2.74592 7 2.29821 7.44771 2.29821 8C2.29821 8.55228 2.74592 9 3.29821 9H12.7018C13.2541 9 13.7018 8.55228 13.7018 8C13.7018 7.44772 13.2541 7 12.7018 7H3.29821Z"
        fill="currentColor"
      />
    </svg>
  );
};
