import { HomeMedium } from "../../components/Icons";
import * as Popover from "@radix-ui/react-popover";

function setBGPage(newBGPageColor: string) {
  let root = document.querySelector(":root") as HTMLElement;
  root?.style.setProperty("--bg-page", newBGPageColor);
}

function setBGCard(newBGCardColor: string) {
  let root = document.querySelector(":root") as HTMLElement;
  root?.style.setProperty("--bg-card", newBGCardColor);
}

function setAccent(newAccentColor: string) {
  let root = document.querySelector(":root") as HTMLElement;
  root?.style.setProperty("--accent", newAccentColor);
}

export const PageHeader = () => {
  return (
    <div className="pageHeader shrink-0 flex justify-between gap-4 grow-0 mx-4">
      <div className="flex gap-4 items-center w-fit grow-0 shrink-0">
        <button className="home text-grey-55">
          <HomeMedium />
        </button>
      </div>

      <div className="flex gap-3 items-center ">
        <ThemePopover />
        <InvitePopover />
      </div>
    </div>
  );
};

const ThemePopover = () => {
  return (
    <Popover.Root>
      <Popover.Trigger>
        {" "}
        <div className="rounded-full w-6 h-6 border" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="w-64 py-2 px-3 bg-white rounded-md border border-grey-80 flex flex-col gap-1"
          align="center"
          sideOffset={4}
          collisionPadding={16}
        >
          <div className="flex gap-1">
            <strong>page bg color</strong>
            <button
              onClick={() => {
                setBGPage("240 247 250");
              }}
            >
              blue
            </button>
            <button
              onClick={() => {
                setBGPage("255 234 234");
              }}
            >
              pink
            </button>
            <button
              onClick={() => {
                setBGPage("226 251 201");
              }}
            >
              green
            </button>
          </div>
          <div>page bg image</div>
          <div className="flex gap-1">
            <strong>card bg</strong>
            <button
              onClick={() => {
                setBGCard("255 255 255");
              }}
            >
              white
            </button>
            <button
              onClick={() => {
                setBGCard("255 242 194");
              }}
            >
              yellow
            </button>
            <button
              onClick={() => {
                setBGCard("245 228 255");
              }}
            >
              purple
            </button>
          </div>
          <div>text color</div>
          <div className="flex gap-1">
            <strong>accent color</strong>
            <button>blue</button>
            <button>magenta</button>
            <button>gold</button>
          </div>

          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

const InvitePopover = () => {
  return (
    <Popover.Root>
      <Popover.Trigger> Invite </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="bg-white rounded-md border border-grey-80 py-1"
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
