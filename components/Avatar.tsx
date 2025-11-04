import { AccountTiny } from "./Icons/AccountTiny";

export const Avatar = (props: {
  src: string | undefined;
  displayName: string | undefined;
  small?: boolean;
}) => {
  if (props.src)
    return (
      <img
        className="rounded-full w-6 h-6 shrink-0 border border-border-light "
        src={props.src}
        alt={props.displayName ? `${props.displayName}'s avatar` : "avatar"}
      />
    );
  else
    return (
      <div className="bg-[var(--accent-light)]  rounded-full w-6 h-6 shrink-0 border border-border-light place-items-center text-accent-1">
        <AccountTiny />
      </div>
    );
};
