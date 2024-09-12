import { isMac } from "@react-aria/utils";
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
        {/* <div className="font-bold text-base">Welcome to Leaflet!</div> */}
        <div>
          Welcome to <strong>Leaflet</strong> — a fun, fast, easy-to-share
          document editor.
        </div>
        <div
          className="py-2 px-1 -mx-1 rounded-md "
          style={{
            backgroundColor:
              "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 85%)",
          }}
        >
          <a
            href="https://leaflet.pub/0325b34c-1948-412c-a6fb-d155fd2fe6ed"
            target="_blank"
          >
            <strong>Learn more</strong>
          </a>{" "}
          about Leaflet, or{" "}
          <a href="mailto:contact@hyperlink.academy">
            <strong>email us</strong>
          </a>{" "}
          with questions or feedback!
        </div>
        <Media mobile={false}>
          <hr className="text-border my-1" />
          <div className="flex flex-col gap-1">
            <Label>Text Shortcuts</Label>
            <KeyboardShortcut name="Bold" keys={[metaKey(), "B"]} />
            <KeyboardShortcut name="Italic" keys={[metaKey(), "I"]} />
            <KeyboardShortcut name="Underline" keys={[metaKey(), "U"]} />
            <KeyboardShortcut
              name="Highlight"
              keys={[metaKey(), isMac() ? "Ctrl" : "Meta", "H"]}
            />
            <KeyboardShortcut
              name="Strikethrough"
              keys={[metaKey(), isMac() ? "Ctrl" : "Meta", "X"]}
            />
            <KeyboardShortcut name="Inline Link" keys={[metaKey(), "K"]} />

            <Label>Block Shortcuts</Label>
            {/* shift + up/down arrows (or click + drag): select multiple blocks */}
            <KeyboardShortcut
              name="Move Block Up"
              keys={["Shift", metaKey(), "↑"]}
            />
            <KeyboardShortcut
              name="Move Block Down"
              keys={["Shift", metaKey(), "↓"]}
            />
            {/* cmd/ctrl-a: first selects all text in a block; again selects all blocks on page */}
            {/* cmd/ctrl + up/down arrows: go to beginning / end of doc */}

            <Label>Outliner Shortcuts</Label>
            <KeyboardShortcut
              name="Make List"
              keys={[metaKey(), isMac() ? "Opt" : "Alt", "L"]}
            />
            {/* tab / shift + tab: indent / outdent */}
            <KeyboardShortcut
              name="Toggle Checkbox"
              keys={[metaKey(), "Enter"]}
            />
            <KeyboardShortcut
              name="Toggle Fold"
              keys={[metaKey(), "Shift", "Enter"]}
            />
            <KeyboardShortcut
              name="Fold All"
              keys={[metaKey(), isMac() ? "Opt" : "Alt", "Shift", "↑"]}
            />
            <KeyboardShortcut
              name="Unfold All"
              keys={[metaKey(), isMac() ? "Opt" : "Alt", "Shift", "↓"]}
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