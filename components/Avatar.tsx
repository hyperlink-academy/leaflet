import { AccountTiny } from "./Icons/AccountTiny";

export const Avatar = (props: {
  src: string | undefined;
  displayName: string | undefined;
  className?: string;
  tiny?: boolean;
  large?: boolean;
  giant?: boolean;
}) => {
  if (props.src)
    return (
      <img
        className={`${props.tiny ? "w-4 h-4" : props.large ? "h-8 w-8" : props.giant ? "h-16 w-16" : "w-5 h-5"} rounded-full shrink-0 border border-border-light ${props.className}`}
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
        className={`bg-[var(--accent-light)] flex rounded-full shrink-0 border border-border-light place-items-center justify-center text-accent-1 ${props.tiny ? "w-4 h-4" : "w-5 h-5"}`}
      >
        <AccountTiny className={props.tiny ? "scale-80" : "scale-90"} />
      </div>
    );
};
