"use client";
import { HelpSmall } from "components/Icons";
import { HoverButton } from "components/Buttons";
import { Popover } from "components/Popover";

export const HomeHelp = () => {
  return (
    <Popover
      className="max-w-sm"
      trigger={
        <HoverButton
          icon={<HelpSmall />}
          noLabelOnMobile
          label="Info"
          background="bg-accent-1"
          text="text-accent-2"
        />
      }
    >
      <div className="flex flex-col gap-2">
        <p>
          Leaflets are saved to home <strong>per-device / browser</strong> using
          cookies.
        </p>
        <p>
          <strong>If you clear your cookies, they&apos;ll disappear.</strong>
        </p>
        <p>
          Please <a href="mailto:contact@hyperlink.academy">contact us</a> for
          help recovering Leaflets!
        </p>
      </div>
    </Popover>
  );
};
