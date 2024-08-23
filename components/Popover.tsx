import * as RadixPopover from "@radix-ui/react-popover";
import { PopoverArrow } from "./Icons";
import { theme } from "tailwind.config";

export const Popover = (props: {
  trigger: React.ReactNode;
  content: React.ReactNode;
  align?: "start" | "end" | "center";
  background?: string;
  border?: string;
  className?: string;
}) => {
  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger>{props.trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          className={`z-20 bg-bg-card border border-border rounded-md px-3 py-2 ${props.className}`}
          align={props.align ? props.align : "center"}
          sideOffset={4}
          collisionPadding={16}
        >
          {props.content}
          <RadixPopover.Arrow asChild width={16} height={8} viewBox="0 0 16 8">
            <PopoverArrow
              arrowFill={
                props.background ? props.background : theme.colors["bg-card"]
              }
              arrowStroke={props.border ? props.border : theme.colors["border"]}
            />
          </RadixPopover.Arrow>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
};
