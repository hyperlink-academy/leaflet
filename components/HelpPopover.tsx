import { HelpSmall } from "./Icons";
import { ShortcutKey } from "./Layout";
import { Media } from "./Media";
import { Popover } from "./Popover";
import { metaKey } from "src/utils/metaKey";

export const HelpPopover = () => {
  return (
    <Popover
      className="max-w-xs w-full"
      trigger={
        <div className="p-1 rounded-full bg-accent-1 text-accent-2">
          <HelpSmall />{" "}
        </div>
      }
    >
      <div className="flex flex-col  text-sm gap-1  text-secondary">
        <div className="font-bold text-base">Welcome to Leaflet!</div>
        <div>A fun, fast, no accounts needed document editor.</div>
        <div
          className="py-1 px-1 -mx-1 rounded-md "
          style={{
            backgroundColor:
              "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 85%)",
          }}
        >
          <a href="/">Learn more</a> about us, or{" "}
          <a href="mailto:contact@hyperlink.academy">email us</a> with feedback,
          questions, and issues.
        </div>
        <Media mobile={false}>
          <hr className="text-border my-1" />
          <div className="flex flex-col gap-1">
            {/*
            BRENDAN TODO:
            I'll seeded a couple for ya!

            The meta key is a special util that shows that like curly thing on macs but just says cmd on desktop
            Mone of the other special keys are like that, though I guess we could add them

            It's possible that there's too many shortcuts and the modal will get too tall,
            In that case i thought we could do a two column list and make the popover wider
            (since there isn't keyboard short in mobile anyway)
            */}
            <Label>Text Shortcuts</Label>
            <KeyboardShortcut name="Bold" keys={[metaKey(), "B"]} />
            <KeyboardShortcut name="Underline" keys={[metaKey(), "U"]} />
            <KeyboardShortcut name="Italic" keys={[metaKey(), "I"]} />
            <Label>Block Shortcuts</Label>
            <KeyboardShortcut
              name="Move Block Up"
              keys={["Shift", metaKey(), "↑"]}
            />
            <KeyboardShortcut
              name="Move Block Down"
              keys={["Shift", metaKey(), "↓"]}
            />
          </div>
        </Media>
      </div>
    </Popover>
  );
};

const KeyboardShortcut = (props: { name: string; keys: string[] }) => {
  return (
    <div className="flex justify-between items-center">
      {props.name}
      <div className="flex gap-1 items-center font-bold">
        {props.keys.map((key, index) => {
          return <ShortcutKey key={index}>{key}</ShortcutKey>;
        })}
      </div>
    </div>
  );
};

const Label = (props: { children: React.ReactNode }) => {
  return <div className="text-tertiary font-bold pt-2 ">{props.children}</div>;
};
