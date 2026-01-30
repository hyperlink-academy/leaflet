"use client";

import { Color } from "react-aria-components";
import { Input } from "components/Input";
import { useState } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { Menu } from "components/Menu";
import { pickers } from "../ThemeSetter";
import { ColorPicker } from "./ColorPicker";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useIsMobile } from "src/hooks/isMobile";
import {
  fonts,
  defaultFontId,
  FontConfig,
  isCustomFontId,
  parseGoogleFontInput,
  createCustomFontId,
  getFontConfig,
} from "src/fonts";

export const TextColorPicker = (props: {
  openPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
  value: Color;
  setValue: (c: Color) => void;
}) => {
  return (
    <ColorPicker
      label="Text"
      value={props.value}
      setValue={props.setValue}
      thisPicker={"text"}
      openPicker={props.openPicker}
      setOpenPicker={props.setOpenPicker}
      closePicker={() => props.setOpenPicker("null")}
    />
  );
};

type FontAttribute = "theme/heading-font" | "theme/body-font";

export const FontPicker = (props: {
  label: string;
  entityID: string;
  attribute: FontAttribute;
}) => {
  let isMobile = useIsMobile();
  let { rep } = useReplicache();
  let [showCustomInput, setShowCustomInput] = useState(false);
  let [customFontValue, setCustomFontValue] = useState("");
  let currentFont = useEntity(props.entityID, props.attribute);
  let fontId = currentFont?.data.value || defaultFontId;
  let font = getFontConfig(fontId);
  let isCustom = isCustomFontId(fontId);

  let fontList = Object.values(fonts).sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );

  const handleCustomSubmit = () => {
    const parsed = parseGoogleFontInput(customFontValue);
    if (parsed) {
      const customId = createCustomFontId(
        parsed.fontName,
        parsed.googleFontsFamily,
      );
      rep?.mutate.assertFact({
        entity: props.entityID,
        attribute: props.attribute,
        data: { type: "string", value: customId },
      });
      setShowCustomInput(false);
      setCustomFontValue("");
    }
  };

  return (
    <Menu
      asChild
      trigger={
        <button className="flex gap-2 items-center w-full !outline-none min-w-0">
          <div
            className={`w-6 h-6 rounded-md border border-border relative text-sm bg-bg-page shrink-0 ${props.label === "Heading" ? "font-bold" : "text-secondary"}`}
          >
            <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 ">
              Aa
            </div>
          </div>
          <div className="font-bold shrink-0">{props.label}</div>
          <div className="truncate">{font.displayName}</div>
        </button>
      }
      side={isMobile ? "bottom" : "right"}
      align="start"
      className="w-[250px] !gap-0 !outline-none max-h-72 "
    >
      {showCustomInput ? (
        <div className="p-2 flex flex-col gap-2">
          <div className="text-sm text-secondary">
            Paste a Google Fonts URL or font name
          </div>
          <Input
            value={customFontValue}
            className="w-full"
            placeholder="e.g. Roboto or fonts.google.com/..."
            autoFocus
            onChange={(e) => setCustomFontValue(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCustomSubmit();
              } else if (e.key === "Escape") {
                setShowCustomInput(false);
                setCustomFontValue("");
              }
            }}
          />
          <div className="flex gap-2">
            <button
              className="flex-1 px-2 py-1 text-sm rounded-md bg-accent-1 text-accent-2 hover:opacity-80"
              onClick={handleCustomSubmit}
            >
              Add Font
            </button>
            <button
              className="px-2 py-1 text-sm rounded-md text-secondary hover:bg-border-light"
              onClick={() => {
                setShowCustomInput(false);
                setCustomFontValue("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full overflow-auto gap-0 py-1">
          {fontList.map((fontOption) => {
            return (
              <FontOption
                key={fontOption.id}
                onSelect={() => {
                  rep?.mutate.assertFact({
                    entity: props.entityID,
                    attribute: props.attribute,
                    data: { type: "string", value: fontOption.id },
                  });
                }}
                font={fontOption}
                selected={fontOption.id === fontId}
              />
            );
          })}
          {isCustom && (
            <FontOption
              key={fontId}
              onSelect={() => {}}
              font={font}
              selected={true}
            />
          )}
          <hr className="mx-2 my-1 border-border" />
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              setShowCustomInput(true);
            }}
            className={`
              fontOption
              z-10 px-1 py-0.5
              text-left text-secondary
              data-[highlighted]:bg-border-light data-[highlighted]:text-secondary
              hover:bg-border-light hover:text-secondary
              outline-none
              cursor-pointer
            `}
          >
            <div className="px-2 py-0 rounded-md">Custom Google Font...</div>
          </DropdownMenu.Item>
        </div>
      )}
    </Menu>
  );
};

const FontOption = (props: {
  onSelect: () => void;
  font: FontConfig;
  selected: boolean;
}) => {
  return (
    <DropdownMenu.RadioItem
      value={props.font.id}
      onSelect={props.onSelect}
      className={`
        fontOption
        z-10  px-1 py-0.5
      text-left text-secondary
      data-[highlighted]:bg-border-light data-[highlighted]:text-secondary
      hover:bg-border-light hover:text-secondary
      outline-none
      cursor-pointer

      `}
    >
      <div
        className={`px-2 py-0 rounded-md ${props.selected && "bg-accent-1 text-accent-2"}`}
      >
        {props.font.displayName}
      </div>
    </DropdownMenu.RadioItem>
  );
};
