"use client";
import { ShortcutKey } from "../../../components/Layout";
import { Media } from "../../../components/Media";
import { Popover } from "../../../components/Popover";
import { metaKey } from "src/utils/metaKey";
import { useEntitySetContext } from "../../../components/EntitySetProvider";
import { useState } from "react";
import { ActionButton } from "components/ActionBar/ActionButton";
import { HelpSmall } from "../../../components/Icons/HelpSmall";
import { isMac } from "src/utils/isDevice";
import { useIsMobile } from "src/hooks/isMobile";

export const HelpButton = (props: { noShortcuts?: boolean }) => {
  let entity_set = useEntitySetContext();
  let isMobile = useIsMobile();

  return entity_set.permissions.write ? (
    <Popover
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      asChild
      className="max-w-xs w-full"
      trigger={<ActionButton icon={<HelpSmall />} label="About" />}
    >
      <div className="flex flex-col text-sm gap-2 text-secondary">
        {/* about links */}
        <HelpLink text="📖 Leaflet Manual" url="https://about.leaflet.pub" />
        <HelpLink text="💡 Make with Leaflet" url="https://make.leaflet.pub" />
        <HelpLink
          text="✨ Explore Publications"
          url="https://leaflet.pub/discover"
        />
        <HelpLink text="📣 Newsletter" url="https://buttondown.com/leaflet" />
        {/* contact links */}
        <div className="columns-2 gap-2">
          <HelpLink
            text="🦋 Bluesky"
            url="https://bsky.app/profile/leaflet.pub"
          />
          <HelpLink text="💌 Email" url="mailto:contact@leaflet.pub" />
        </div>
        {/* keyboard shortcuts: desktop only */}
        <Media mobile={false}>
          {!props.noShortcuts && (
            <>
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
                <KeyboardShortcut
                  name="Make Title"
                  keys={[metaKey(), isMac() ? "Opt" : "Alt", "1"]}
                />
                <KeyboardShortcut
                  name="Make Heading"
                  keys={[metaKey(), isMac() ? "Opt" : "Alt", "2"]}
                />
                <KeyboardShortcut
                  name="Make Subheading"
                  keys={[metaKey(), isMac() ? "Opt" : "Alt", "3"]}
                />
                <KeyboardShortcut
                  name="Regular Text"
                  keys={[metaKey(), isMac() ? "Opt" : "Alt", "P"]}
                />
                <KeyboardShortcut
                  name="Large Text"
                  keys={[metaKey(), isMac() ? "Opt" : "Alt", "+"]}
                />
                <KeyboardShortcut
                  name="Small Text"
                  keys={[metaKey(), isMac() ? "Opt" : "Alt", "-"]}
                />

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
            </>
          )}
        </Media>
        {/* links: terms and privacy */}
        <hr className="text-border my-1" />
        {/* <HelpLink
          text="Terms and Privacy Policy"
          url="https://leaflet.pub/legal"
        /> */}
        <div>
          <a href="https://leaflet.pub/legal" target="_blank">
            Terms and Privacy Policy
          </a>
        </div>
      </div>
    </Popover>
  ) : null;
};

const KeyboardShortcut = (props: { name: string; keys: string[] }) => {
  return (
    <div className="flex gap-2 justify-between items-center">
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
          ? "rgb(var(--accent-light))"
          : "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 75%)",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <strong>{props.text}</strong>
    </a>
  );
};
