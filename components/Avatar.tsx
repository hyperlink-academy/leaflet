import { AccountTiny } from "./Icons/AccountTiny";

export const Avatar = (props: {
  src: string | undefined;
  displayName: string | undefined;
  small?: boolean;
}) => {
  if (props.src)
    return (
      <img
        className={`${props.small ? "w-4 h-4" : "w-6 h-6"} rounded-full shrink-0 border border-border-light`}
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
        className={`bg-[var(--accent-light)] flex rounded-full shrink-0 border border-border-light place-items-center justify-center text-accent-1 ${props.small ? "w-4 h-4" : "w-5 h-5"}`}
      >
        <AccountTiny className={props.small ? "scale-80" : "scale-90"} />
      </div>
    );
};
