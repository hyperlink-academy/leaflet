import { HomeMedium } from "../../components/Icons";
import * as Popover from "@radix-ui/react-popover";
import { ThemePopover } from "./themeSetter";
import { imageArgs } from "./page";

export const PageHeader = (props: {
  pageBGImage: imageArgs;
  setPageBGImage: (imageArgs: Partial<imageArgs>) => void;
}) => {
  return (
    <div className="pageHeader shrink-0 flex justify-between gap-4 grow-0 mx-4">
      <div className="flex gap-4 items-center w-fit grow-0 shrink-0">
        <button className="home text-accent">
          <HomeMedium />
        </button>
      </div>

      <div className="flex gap-3 items-center ">
        <ThemePopover
          pageBGImage={props.pageBGImage}
          setPageBGImage={props.setPageBGImage}
        />
        <InvitePopover />
      </div>
    </div>
  );
};

const InvitePopover = () => {
  return (
    <Popover.Root>
      <Popover.Trigger> Invite </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="bg-bg-card rounded-md border border-border py-1"
          align="end"
          sideOffset={4}
        >
          <div className="px-3 py-1 flex items-stretch justify-end gap-2 hover:bg-bg-accent ">
            <div className="flex flex-col text-right">
              <strong>Share</strong>
              <small>read only</small>
            </div>
            <div className="w-6 bg-test my-1" />
          </div>

          <div className="py-1 px-3 flex items-stretch justify-end gap-2 hover:bg-bg-accent">
            <div className="flex flex-col text-right">
              <strong>Invite Collaborators</strong>
              <small>full edit access</small>
            </div>
            <div className="w-6 bg-test my-1" />
          </div>

          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
