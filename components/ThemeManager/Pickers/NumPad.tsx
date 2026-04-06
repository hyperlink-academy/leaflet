"use client";

import { useState, useCallback, useRef } from "react";
import { Color } from "react-aria-components";
import { Popover } from "components/Popover";
import { GoToArrow } from "components/Icons/GoToArrow";

const NUM_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
] as const;

const NumKey = (props: {
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
        border border-[#CCCCCC] text-[#969696]
        disabled:bg-[#DBDBDB] disabled:border-[#DBDBDB] disabled:text-[#CCCCCC] disabled:cursor-not-allowed
        ${props.className ?? ""}
      `}
    >
      {props.children}
    </button>
  );
};

export const NumPad = (props: {
  value: Color | undefined;
  setValue: (c: Color) => void;
}) => {
  let alphaPercent = props.value
    ? Math.round(props.value.getChannelValue("alpha") * 100)
    : 100;

  let displayValue = `${alphaPercent}%`;

  let [draft, setDraft] = useState(String(alphaPercent));
  let committed = useRef(false);

  let syncDraftToValue = useCallback(() => {
    let percent = props.value
      ? Math.round(props.value.getChannelValue("alpha") * 100)
      : 100;
    setDraft(String(percent));
    committed.current = true;
  }, [props.value]);

  let handleKey = (key: string) => {
    if (committed.current) {
      committed.current = false;
      setDraft(key);
      return;
    }
    setDraft((prev) => {
      let next = prev === "0" ? key : prev + key;
      // Don't allow more than 3 digits (max 100)
      if (next.length > 3) return prev;
      let num = parseInt(next, 10);
      if (num > 100) return prev;
      return next;
    });
  };

  let handleDelete = () => {
    committed.current = false;
    setDraft((prev) => {
      if (prev.length <= 1) return "0";
      return prev.slice(0, -1);
    });
  };

  let handleSubmit = () => {
    let num = parseInt(draft, 10);
    if (isNaN(num) || num < 0 || num > 100) {
      syncDraftToValue();
      return;
    }
    if (props.value) {
      let updated = props.value.withChannelValue("alpha", num / 100);
      props.setValue(updated);
    }
    committed.current = true;
  };

  let isValid = /^\d{1,3}$/.test(draft) && parseInt(draft, 10) <= 100;

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
        <button className="w-[64px] pl-[6px] text-left bg-transparent outline-hidden truncate">
          {displayValue}
        </button>
      }
    >
      <div className="flex flex-col gap-2">
        {/* Display current draft value */}
        <div
          className={`
            flex items-center
            rounded-md border px-2 py-1 text-sm font-mono
            text-[#595959]!
            ${isValid ? "border-[#CCCCCC]" : "border-red-400"}
          `}
        >
          <span className="select-all">{draft}%</span>
        </div>

        {/* Numpad grid — 3 columns */}
        <div className="grid grid-cols-3 gap-1">
          {NUM_ROWS.map((row) =>
            row.map((key) => (
              <NumKey key={key} onClick={() => handleKey(key)}>
                {key}
              </NumKey>
            )),
          )}

          {/* Bottom row: 0, delete, submit */}
          <NumKey onClick={() => handleKey("0")}>0</NumKey>
          <NumKey
            onClick={handleDelete}
            ariaLabel="Delete"
            className="bg-accent-1! border-accent-1! text-accent-2!"
          >
            &#x232B;
          </NumKey>
          <NumKey
            onClick={handleSubmit}
            disabled={!isValid}
            ariaLabel="Apply"
            className="bg-accent-1! border-accent-1! text-accent-2!"
          >
            <GoToArrow />
          </NumKey>
        </div>
      </div>
    </Popover>
  );
};
