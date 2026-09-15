import { forwardRef } from "react";
import { SettingsTiny } from "components/Icons/SettingsTiny";
import { Popover } from "components/Popover";

export const SettingsTriggerButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ "aria-label": ariaLabel = "Settings", ...props }, ref) => (
  <button
    {...props}
    ref={ref}
    onMouseDown={(e) => e.preventDefault()}
    aria-label={ariaLabel}
    className="flex items-center"
  >
    <SettingsTiny />
  </button>
));
SettingsTriggerButton.displayName = "SettingsTriggerButton";

export function BlockSettings(props: {
  // Names the block for the trigger's aria-label; nothing renders it.
  label: string;
  children: React.ReactNode;
  // Width only — the rest of the shell is shared across every block.
  className?: string;
}) {
  return (
    <Popover
      asChild
      side="top"
      align="end"
      sideOffset={6}
      // Padding lives on the scroll container instead, so a popover taller
      // than the viewport keeps its padding above and below the scrolled area.
      className={`p-0! min-w-xs ${props.className || ""}`}
      onOpenAutoFocus={(e) => e.preventDefault()}
      trigger={
        <SettingsTriggerButton
          aria-label={`${props.label} Settings`}
          onClick={(e) => e.stopPropagation()}
        />
      }
    >
      {/* Clicks here would otherwise bubble (through the portal) to the page
          wrapper, which refocuses the page and unmounts the options bar. */}
      <div
        className="flex flex-col gap-3 p-3 min-w-[220px] text-primary overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {props.children}
      </div>
    </Popover>
  );
}
