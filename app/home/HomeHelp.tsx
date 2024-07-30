"use client";
import { InfoSmall, PopoverArrow } from "components/Icons";
import { HoverButton } from "components/Buttons";
import * as Popover from "@radix-ui/react-popover";

export const HomeHelp = () => {
  return (
    <Popover.Root>
      <Popover.Trigger>
        <HoverButton
          icon=<InfoSmall />
          label="Info"
          background="bg-accent-1"
          text="text-accent-2"
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-20 bg-white border border-[#CCCCCC] text-[#595959]  rounded-md text-sm max-w-sm p-2"
          align="center"
          sideOffset={4}
          collisionPadding={16}
        >
          <div className="flex flex-col gap-2">
            <div>
              These docs are saved using cookies,{" "}
              <strong>
                if you clear your cookies you will lose access to them.
              </strong>
            </div>
            <div>
              Please <a href="mailto:contact@hyperlink.academy">contact us</a>{" "}
              and we&apos;ll help recover them!
            </div>
          </div>
          <Popover.Arrow asChild width={16} height={8} viewBox="0 0 16 8">
            <PopoverArrow arrowFill="#FFFFFF" arrowStroke="#CCCCCC" />
          </Popover.Arrow>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
