"use client";

import { useState } from "react";
import { Menu } from "components/Menu";
import { Input } from "components/Input";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useIsMobile } from "src/hooks/isMobile";
import { fonts, defaultFontId, FontConfig } from "src/fonts";

export const PubFontPicker = (props: {
  label: string;
  value: string | undefined;
  onChange: (fontId: string) => void;
}) => {
  let isMobile = useIsMobile();
  let [searchValue, setSearchValue] = useState("");
  let fontId = props.value || defaultFontId;
  let font = fonts[fontId] || fonts[defaultFontId];

  let fontList = Object.values(fonts);
  let filteredFonts = fontList
    .filter((f) => {
      const matchesSearch = f.displayName
        .toLocaleLowerCase()
        .includes(searchValue.toLocaleLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      return a.displayName.localeCompare(b.displayName);
    });

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
      <Input
        value={searchValue}
        className="px-3 pb-1 appearance-none !outline-none bg-transparent"
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
              key={fontOption.id}
              onSelect={() => {
                props.onChange(fontOption.id);
              }}
              font={fontOption}
              selected={fontOption.id === fontId}
            />
          );
        })}
      </div>
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
