import { forwardRef } from "react";
import { SettingsTiny } from "components/Icons/SettingsTiny";

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
