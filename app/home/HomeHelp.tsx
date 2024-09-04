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
            <p>
              Leaflets are saved to home <strong>per-device / browser</strong>{" "}
              using cookies.
            </p>
            <p>
              <strong>
                If you clear your cookies, they&apos;ll disappear.
              </strong>
            </p>
            <p>
              Please <a href="mailto:contact@hyperlink.academy">contact us</a>{" "}
              for help recovering Leaflets!
            </p>
          </div>
          <Popover.Arrow asChild width={16} height={8} viewBox="0 0 16 8">
            <PopoverArrow arrowFill="#FFFFFF" arrowStroke="#CCCCCC" />
          </Popover.Arrow>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
