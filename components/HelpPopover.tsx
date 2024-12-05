import { isMac } from "@react-aria/utils";
import { HelpSmall } from "./Icons";
import { ShortcutKey } from "./Layout";
import { Media } from "./Media";
import { Popover } from "./Popover";
import { metaKey } from "src/utils/metaKey";
import { useEntitySetContext } from "./EntitySetProvider";
import Link from "next/link";
import { useState } from "react";
import { HoverButton } from "./Buttons";

export const HelpPopover = () => {
  let entity_set = useEntitySetContext();
  return entity_set.permissions.write ? (
    <Popover
      className="max-w-xs w-full"
      trigger={
        <HoverButton
          icon={<HelpSmall />}
          noLabelOnMobile
          label="About This App"
          background="bg-accent-1"
          text="text-accent-2"
        />
      }
    >
      <div className="flex flex-col text-sm gap-2 text-secondary ">
        <div>
          Welcome to <strong>Leaflet</strong> — a fun, fast, easy-to-share
          document editor.
        </div>
        <HelpLink
          text="💡 Learn more"
          url="https://leaflet.pub/0325b34c-1948-412c-a6fb-d155fd2fe6ed"
        />
        <HelpLink text="💌 Get updates" url="https://buttondown.com/leaflet" />
        <HelpLink
          text="📖 Explore templates"
          url="https://leaflet.pub/templates"
        />
        <HelpLink
          text="🍃 Email us feedback"
          url="mailto:contact@hyperlink.academy"
        />
        <HelpLink
          text="📄 Terms and Privacy Policy"
          url="https://leaflet.pub/legal"
        />
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

            <Label>Canvas Shortcuts</Label>
            <OtherShortcut name="Add Block" description="Double click" />
            <OtherShortcut name="Select Block" description="Long press" />

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
  ) : null;
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

const OtherShortcut = (props: { name: string; description: string }) => {
  return (
    <div className="flex justify-between items-center">
      <span>{props.name}</span>
      <span>
        <strong>{props.description}</strong>
      </span>
    </div>
  );
};

const Label = (props: { children: React.ReactNode }) => {
  return <div className="text-tertiary font-bold pt-2 ">{props.children}</div>;
};

const HelpLink = (props: { url: string; text: string }) => {
  const [isHovered, setIsHovered] = useState(false);
  const handleMouseEnter = () => {
    setIsHovered(true);
  };
  const handleMouseLeave = () => {
    setIsHovered(false);
  };
  return (
    <a
      href={props.url}
      target="_blank"
      className="py-2 px-2 rounded-md flex flex-col gap-1 bg-border-light hover:bg-border hover:no-underline"
      style={{
        backgroundColor: isHovered
          ? "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 85%)"
          : "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 75%)",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <strong>{props.text}</strong>
    </a>
  );
};
