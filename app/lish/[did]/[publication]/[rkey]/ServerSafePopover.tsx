import { Popover } from "components/Popover";

export const ServerSafePopover = (props: {
  trigger: React.ReactNode;
  disabled?: boolean;
  children: React.ReactNode;
  align?: "start" | "end" | "center";
  side?: "top" | "bottom" | "left" | "right";
  background?: string;
  border?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  asChild?: boolean;
  arrowFill?: string;
}) => {
  if (typeof window === "undefined") return props.trigger;
  return <Popover {...props} />;
};
