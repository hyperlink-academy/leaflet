"use client";

import { Color, Input } from "react-aria-components";
import { useMemo, useState } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { useColorAttribute } from "components/ThemeManager/useColorAttribute";
import { Menu } from "components/Layout";
import { pickers, setColorAttribute } from "../ThemeSetter";
import { ColorPicker } from "./ColorPicker";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useIsMobile } from "src/hooks/isMobile";
import { CanvasBGPatternPicker } from "./BackgroundPickers";

export const TextPickers = (props: {
  entityID: string;
  openPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
  noFontOptions?: boolean;
}) => {
  let { rep } = useReplicache();
  let set = useMemo(() => {
    return setColorAttribute(rep, props.entityID);
  }, [rep, props.entityID]);

  let pageType = useEntity(props.entityID, "page/type")?.data.value || "doc";
  let primaryValue = useColorAttribute(props.entityID, "theme/primary");

  return (
    <div
      className="leafletCanvasBG flex flex-col gap-2 h-full text-primary bg-bg-leaflet p-2 rounded-md border border-primary shadow-[0_0_0_1px_rgb(var(--bg-page))]"
      style={{ backgroundColor: "rgba(var(--bg-page), 0.6)" }}
    >
      {pageType === "canvas" && (
        <>
          <CanvasBGPatternPicker entityID={props.entityID} rep={rep} />{" "}
          <hr className="border-border-light w-full" />
        </>
      )}
      <PageTextPicker
        value={primaryValue}
        setValue={set("theme/primary")}
        openPicker={props.openPicker}
        setOpenPicker={props.setOpenPicker}
      />
      {!props.noFontOptions && (
        <>
          <FontPicker label="Heading" />
          <FontPicker label="Body" />
        </>
      )}
    </div>
  );
};

export const PageTextPicker = (props: {
  openPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
  value: Color;
  setValue: (c: Color) => void;
}) => {
  return (
    <>
      <ColorPicker
        label="Text"
        value={props.value}
        setValue={props.setValue}
        thisPicker={"text"}
        openPicker={props.openPicker}
        setOpenPicker={props.setOpenPicker}
        closePicker={() => props.setOpenPicker("null")}
      />
    </>
  );
};

const FontPicker = (props: { label: string }) => {
  let isMobile = useIsMobile();
  let [searchValue, setSearchValue] = useState("");
  let [font, setFont] = useState("Quattro");

  let filteredFonts = fontOptions
    .filter((font) => {
      const matchesSearch = font
        .toLocaleLowerCase()
        .includes(searchValue.toLocaleLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      return a.localeCompare(b);
    });
  return (
    <Menu
      asChild
      trigger={
        <button className="flex gap-2 items-center w-full !outline-none">
          <div
            className={`w-6 h-6 rounded-md border border-border relative text-sm bg-bg-page shrink-0 ${props.label === "Heading" ? "font-bold" : "text-secondary"}`}
          >
            <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 ">
              Aa
            </div>
          </div>
          <div className="font-bold">{props.label}</div>
          <div className="">{font}</div>
        </button>
      }
      side={isMobile ? "bottom" : "right"}
      sideOffset={isMobile ? -2 : 4}
      align="start"
      className="w-[250px] !gap-0 !outline-none max-h-72 "
    >
      <Input
        value={searchValue}
        className="px-3 pb-1 appearance-none !outline-none"
        placeholder="search..."
        onChange={(e) => {
          setSearchValue(e.currentTarget.value);
        }}
      />
      <hr className="mx-2 border-border" />
      <div className="flex flex-col h-full overflow-auto gap-0 pt-1">
        {filteredFonts.map((fontOption) => {
          return (
            <FontOption
              onSelect={() => {
                setFont(fontOption);
              }}
              name={fontOption}
              selected={fontOption === font}
            />
          );
        })}
      </div>
    </Menu>
  );
};

const FontOption = (props: {
  onSelect: () => void;
  name: string;
  selected: boolean;
}) => {
  return (
    <DropdownMenu.RadioItem
      value={props.name}
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
        {props.name}
      </div>
    </DropdownMenu.RadioItem>
  );
};

const fontOptions = [
  "Garamond",
  "Ariel",
  "Bookerville",
  "Quattro",
  "Noto Sans",
  "Open Sans",
  "Crimson",
  "Lucinda",
  "Helvetica",
  "Nunito",
  "Comic Sans",
  "Times New Roman",
  "Windings",
  "Roboto",
  "Roboto Mono",
];
