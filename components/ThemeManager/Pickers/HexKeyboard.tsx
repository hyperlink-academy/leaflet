"use client";

import { useState, useCallback, useRef } from "react";
import { Color, parseColor } from "react-aria-components";
import { Popover } from "components/Popover";
import { GoToArrow } from "components/Icons/GoToArrow";

const HEX_ROWS = [
  ["1", "2", "3", "A", "B", "C"],
  ["4", "5", "6", "D", "E", "F"],
] as const;

const BOTTOM_ROW = ["7", "8", "9", "0"] as const;

const HexKey = (props: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) => {
  return (
    <button
      onPointerDown={(e) => e.preventDefault()}
      onClick={props.onClick}
      disabled={props.disabled}
      aria-label={props.ariaLabel}
      className={`
        h-10 w-10 rounded-md
         font-bold
        flex items-center justify-center
        border border-[#CCCCCC]] text-[#969696]
        disabled:bg-[#DBDBDB] disabled:border-[#DBDBDB] disabled:text-[#CCCCCC] disabled:cursor-not-allowed
        ${props.className ?? ""}
      `}
    >
      {props.children}
    </button>
  );
};

export const HexKeyboard = (props: {
  value: Color | undefined;
  setValue: (c: Color) => void;
}) => {
  let hexString = props.value
    ? props.value.toString("hex").toUpperCase()
    : "#000000";

  let [draft, setDraft] = useState(hexString);
  let committed = useRef(false);

  let syncDraftToValue = useCallback(() => {
    let hex = props.value
      ? props.value.toString("hex").toUpperCase()
      : "#000000";
    setDraft(hex);
    committed.current = true;
  }, [props.value]);

  let handleKey = (key: string) => {
    if (committed.current) {
      setDraft("#" + key);
      committed.current = false;
      return;
    }
    // Max hex length is 7 chars including #
    if (draft.length >= 7) return;
    setDraft((prev) => prev + key);
  };

  let handleDelete = () => {
    committed.current = false;
    setDraft((prev) => {
      // Don't delete the # prefix
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  };

  let handleSubmit = () => {
    try {
      // Pad short values: if user typed #ABC, expand to #AABBCC
      let raw = draft.replace("#", "");
      let padded = raw;
      if (raw.length === 3) {
        padded = raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2];
      } else if (raw.length < 6) {
        padded = raw.padEnd(6, "0");
      }
      let color = parseColor("#" + padded);
      props.setValue(color);
      setDraft("#" + padded.toUpperCase());
      committed.current = true;
    } catch {
      // Invalid color, reset draft
      syncDraftToValue();
    }
  };

  let isValidPartialHex = /^#[0-9A-Fa-f]{0,6}$/.test(draft);
  let isSubmittable =
    /^#[0-9A-Fa-f]{3}$/.test(draft) || /^#[0-9A-Fa-f]{6}$/.test(draft);

  return (
    <Popover
      align="center"
      className="p-2! w-fit bg-white! text-[#595959] border-[#CCCCCC]!"
      arrowFill="white"
      border="#CCCCCC"
      onOpenChange={(open) => {
        if (open) {
          syncDraftToValue();
        }
      }}
      trigger={
        <div className="w-[72px] text-left bg-transparent outline-hidden truncate">
          {hexString}
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        {/* Display current draft value */}
        <div
          className={`
            flex items-center
            rounded-md border px-2 py-1 text-sm font-mono
             text-[#595959]!
            ${isValidPartialHex ? "border-[#CCCCCC]}" : "border-red-400"}
          `}
        >
          <span className="select-all">{draft}</span>
        </div>

        {/* Hex keyboard grid — 6 columns */}
        <div className="grid grid-cols-6 gap-1">
          {/* Row 1: 1 2 3 A B C */}
          {HEX_ROWS[0].map((key) => (
            <HexKey key={key} onClick={() => handleKey(key)}>
              {key}
            </HexKey>
          ))}

          {/* Row 2: 4 5 6 D E F */}
          {HEX_ROWS[1].map((key) => (
            <HexKey key={key} onClick={() => handleKey(key)}>
              {key}
            </HexKey>
          ))}

          {/* Row 3: 7 8 9 0 [delete] [submit] */}
          {BOTTOM_ROW.map((key) => (
            <HexKey key={key} onClick={() => handleKey(key)}>
              {key}
            </HexKey>
          ))}
          <HexKey
            onClick={handleDelete}
            ariaLabel="Delete"
            className="bg-accent-1! border-accent-1! text-accent-2!"
          >
            &#x232B;
          </HexKey>
          <HexKey
            onClick={handleSubmit}
            disabled={!isSubmittable && !isValidPartialHex}
            ariaLabel="Apply"
            className="bg-accent-1! border-accent-1! text-accent-2!"
          >
            <GoToArrow />
          </HexKey>
        </div>
      </div>
    </Popover>
  );
};
