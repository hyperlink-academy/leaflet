"use client";
import { ActionButton } from "components/ActionBar/ActionButton";
import { HelpSmall } from "components/Icons/HelpSmall";
import { Popover } from "components/Popover";

export const HomeHelp = () => {
  return (
    <Popover
      className="max-w-sm"
      trigger={<ActionButton icon={<HelpSmall />} label="Info" />}
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
          Please <a href="mailto:contact@leaflet.pub">contact us</a> for help
          recovering Leaflets!
        </p>
      </div>
    </Popover>
  );
};
