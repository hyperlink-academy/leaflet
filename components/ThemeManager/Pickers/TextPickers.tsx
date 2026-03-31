"use client";

import { Input } from "components/Input";
import { useRef, useState } from "react";
import { Menu, MenuItem, RadioMenuGroup, RadioMenuItem } from "components/Menu";
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
import { ButtonPrimary } from "components/Buttons";
import { useSmoker } from "components/Toast";
import { DotLoader } from "components/utils/DotLoader";

export const FontPicker = (props: {
  label: string;
  value: string | undefined;
  onChange: (fontId: string) => void;
}) => {
  let isMobile = useIsMobile();
  let smoker = useSmoker();
  let inputWrapperRef = useRef<HTMLDivElement>(null);
  let [showCustomInput, setShowCustomInput] = useState(false);
  let [customFontValue, setCustomFontValue] = useState("");
  let fontId = props.value || defaultFontId;
  let font = getFontConfig(fontId);
  let isCustom = isCustomFontId(fontId);

  let fontList = Object.values(fonts).sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );

  let [loading, setLoading] = useState(false);

  const handleCustomSubmit = async () => {
    const parsed = parseGoogleFontInput(customFontValue);
    if (!parsed) return;

    setLoading(true);
    try {
      const url = `https://fonts.googleapis.com/css2?family=${parsed.googleFontsFamily}&display=swap`;
      const res = await fetch(url, { method: "HEAD" });
      if (!res.ok) {
        const rect = inputWrapperRef.current?.getBoundingClientRect();
        smoker({
          error: true,
          position: {
            x: rect ? rect.left + rect.width / 2 : 0,
            y: rect ? rect.top - 8 : 0,
          },
          text: "No font found!",
        });
        return;
      }
      const customId = createCustomFontId(
        parsed.fontName,
        parsed.googleFontsFamily,
      );
      props.onChange(customId);
      setShowCustomInput(false);
      setCustomFontValue("");
    } catch {
      const rect = inputWrapperRef.current?.getBoundingClientRect();
      smoker({
        error: true,
        position: {
          x: rect ? rect.left + rect.width / 2 : 0,
          y: rect ? rect.top - 8 : 0,
        },
        text: "No font found!",
      });
    } finally {
      setLoading(false);
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
      className="w-fit !gap-0 !outline-none max-h-72 "
    >
      {showCustomInput ? (
        <div className="p-2 flex flex-col gap-2">
          <div>
            <div className="font-bold text-secondary">
              Paste any Google Font name
            </div>
            <div className="text-sm text-tertiary">This is case sensitive</div>
          </div>
          <div ref={inputWrapperRef}>
            <Input
              value={customFontValue}
              className="w-full input-with-border"
              placeholder="e.g. Roboto, Open Sans"
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
          </div>
          <div className="flex gap-2 self-end items-center">
            <button
              className="px-1 py-0 rounded-md text-accent-contrast font-bold hover:bg-border-light"
              onClick={() => {
                setShowCustomInput(false);
                setCustomFontValue("");
              }}
            >
              Nevermind
            </button>
            <ButtonPrimary
              compact
              className=""
              disabled={loading}
              onClick={handleCustomSubmit}
            >
              {loading ? <DotLoader /> : "Add Font"}
            </ButtonPrimary>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full overflow-auto gap-0 py-1">
          <RadioMenuGroup value={fontId} onValueChange={props.onChange}>
            {fontList.map((fontOption) => {
              return (
                <FontOption
                  key={fontOption.id}
                  font={fontOption}
                  selected={fontOption.id === fontId}
                />
              );
            })}
            {isCustom && (
              <FontOption key={fontId} font={font} selected={true} />
            )}
          </RadioMenuGroup>
          <hr className="mx-2 my-1 border-border" />
          <MenuItem
            onSelect={(e) => {
              e.preventDefault();
              setShowCustomInput(true);
            }}
          >
            Add a Custom Font
          </MenuItem>
        </div>
      )}
    </Menu>
  );
};

const FontOption = (props: { font: FontConfig; selected: boolean }) => {
  return (
    <RadioMenuItem
      value={props.font.id}
      selected={props.selected}
      className={`
        fontOption text-normal!
      `}
    >
      {props.font.displayName}
    </RadioMenuItem>
  );
};
