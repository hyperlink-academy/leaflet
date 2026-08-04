import { LockTiny } from "components/Icons/LockTiny";

export function MembersBadge() {
  return (
    <button
      type="button"
      aria-label="Contains member only content"
      // iOS Safari doesn't focus buttons on tap, so :focus never fires there
      // without this — it's what makes the label openable on touch.
      onClick={(e) => e.currentTarget.focus()}
      className="membersBadge group absolute top-2.5 right-2.5 bg-accent-1 text-accent-2 rounded-full h-5 px-0.5 flex items-center gap-1 outline-hidden"
    >
      <div
        aria-hidden
        className="whitespace-nowrap text-xs font-bold pl-1 hidden group-hover:block group-focus:block"
      >
        Contains member only content
      </div>

      <LockTiny className="shrink-0 " />
    </button>
  );
}
