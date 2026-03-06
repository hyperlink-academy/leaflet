import { AccountTiny } from "./Icons/AccountTiny";

export const Avatar = (props: {
  src: string | undefined;
  displayName: string | undefined;
  className?: string;
  size?: "tiny" | "small" | "medium" | "large" | "giant";
}) => {
  let sizeClassName =
    props.size === "tiny"
      ? "w-4 h-4"
      : props.size === "small"
        ? "w-5 h-5"
        : props.size === "medium"
          ? "h-6 w-6"
          : props.size === "large"
            ? "w-8 h-8"
            : props.size === "giant"
              ? "h-16 w-16"
              : "w-6 h-6";

  if (props.src)
    return (
      <img
        className={`${sizeClassName} relative rounded-full shrink-0 border border-border-light ${props.className}`}
        src={props.src}
        alt={
          props.displayName
            ? `${props.displayName}'s avatar`
            : "someone's avatar"
        }
      />
    );
  else
    return (
      <div
        className={` relative bg-[var(--accent-light)] flex rounded-full shrink-0 border border-border-light place-items-center justify-center text-accent-1 ${sizeClassName}`}
      >
        <AccountTiny
          className={
            props.size === "tiny"
              ? "scale-80"
              : props.size === "small"
                ? "scale-90"
                : ""
          }
        />
      </div>
    );
};
