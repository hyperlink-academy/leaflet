import { ShareSmall } from "../../components/Icons";
import * as Popover from "@radix-ui/react-popover";
import { ThemePopover } from "./ThemeSetter";
import { imageArgs } from "./page";

export const PageHeader = (props: {
  pageBGImage: imageArgs;
  setPageBGImage: (imageArgs: Partial<imageArgs>) => void;
}) => {
  return (
    <>
      <InvitePopover />

      <ThemePopover
        pageBGImage={props.pageBGImage}
        setPageBGImage={props.setPageBGImage}
      />
    </>
  );
};

const InvitePopover = () => {
  return (
    <Popover.Root>
      <Popover.Trigger className="p-1  bg-accent rounded-full font-bold text-accentText">
        <ShareSmall />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="bg-bg-card rounded-md border border-border py-1"
          align="end"
          sideOffset={4}
          collisionPadding={16}
        >
          <div className="px-3 py-1 flex items-stretch gap-2 hover:bg-bg-accent ">
            <div className="w-6 bg-test my-1" />

            <div className="flex flex-col">
              <strong>Publish</strong>
              <small>read only</small>
            </div>
          </div>

          <div className="py-1 px-3 flex items-stretch gap-2 hover:bg-bg-accent">
            <div className="w-6 bg-test my-1" />

            <div className="flex flex-col ">
              <strong>Collab</strong>
              <small>full edit access</small>
            </div>
          </div>

          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
