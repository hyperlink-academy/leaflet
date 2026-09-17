import { GoBackTiny } from "components/Icons/GoBackTiny";

// Leaves a page that replaced the one it was opened from (single-layout
// frames). `chip` floats over pages with no flow of their own to sit in.
export function PageBackButton(props: { onClick: () => void; chip?: boolean }) {
  return (
    <div
      className={
        props.chip
          ? "absolute top-3 left-3 sm:top-4 sm:left-4 z-20 bg-bg-page border border-border-light rounded-md px-2 py-1"
          : "px-3 sm:px-4 pt-2 sm:pt-3"
      }
    >
      <button
        className="flex items-center gap-1 text-sm font-bold text-tertiary hover:text-accent-contrast"
        onClick={props.onClick}
      >
        <GoBackTiny /> Back
      </button>
    </div>
  );
}
