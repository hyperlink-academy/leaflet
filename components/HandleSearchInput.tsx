"use client";
import { useRef } from "react";
import { isValidHandle } from "@atproto/syntax";
import { Input } from "components/Input";
import { Combobox, ComboboxResult } from "components/Combobox";
import {
  useActorTypeahead,
  type ActorSuggestion,
} from "src/hooks/useActorTypeahead";
import { DotLoader } from "components/utils/DotLoader";
import { Avatar } from "components/Avatar";
import { theme } from "tailwind.config";
import { AtmosphereAccount } from "components/Icons/AtmosphereAccount";
import { INPUT_HIGHLIGHT_CLASS } from "./Subscribe/inputHighlight";

export const HandleSearchInput = (props: {
  autoFocus?: boolean;
  action?: React.ReactNode;
  // For callers that need a real button component (not the plain wrapper the
  // `action` node gets); receives the submit callback and the current value.
  renderAction?: (submit: () => void, value: string) => React.ReactNode;
  // `null` renders no leading slot; undefined falls back to the Atmosphere icon.
  leading?: React.ReactNode | null;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  large?: boolean;
  compact?: boolean;
  loading?: boolean;
  // Called with the typed or selected handle; `actor` is present when the value
  // came from a suggestion. Resolving `true` clears the input (e.g. after a
  // successful invite).
  onSubmit?: (
    handle: string,
    actor?: ActorSuggestion,
  ) => void | boolean | Promise<void | boolean>;
  // Fires on every keystroke and on suggestion select, for callers that stash
  // the handle instead of submitting (e.g. the paid join modal).
  onChange?: (value: string) => void;
  // Flags the input as needing attention (e.g. a tier was picked before a
  // handle was entered); cleared on focus via onFocus.
  highlight?: boolean;
  onFocus?: () => void;
  // Reject typed values that aren't syntactically valid handles with a native
  // validation bubble instead of submitting them (suggestion picks are trusted).
  validateHandle?: boolean;
}) => {
  let {
    handleValue,
    setHandleValue,
    suggestions,
    setSuggestions,
    dropdownOpen,
    setDropdownOpen,
    highlighted,
    setHighlighted,
  } = useActorTypeahead();

  let triggerRef = useRef<HTMLDivElement>(null);

  const handleSelect = async (handle?: string) => {
    let selected = handle ?? handleValue;
    if (!selected) return;
    const actor = suggestions.find((s) => s.handle === selected);
    if (props.validateHandle && !actor) {
      selected = selected.trim().replace(/^@/, "");
      if (!isValidHandle(selected)) {
        let input = triggerRef.current?.querySelector("input");
        input?.setCustomValidity(
          "Please enter a full handle, like name.bsky.social",
        );
        input?.reportValidity();
        return;
      }
    }
    setHandleValue(selected);
    setDropdownOpen(false);
    setSuggestions([]);
    setHighlighted(undefined);
    props.onChange?.(selected);
    let submitted = await props.onSubmit?.(selected, actor);
    if (submitted) setHandleValue("");
  };

  const handles = suggestions.map((s) => s.handle);
  const leading =
    props.leading === undefined ? <AtmosphereAccount /> : props.leading;

  return (
    <Combobox
      open={dropdownOpen && !props.loading}
      onOpenChange={(open) => {
        if (!open) {
          setDropdownOpen(false);
          setHighlighted(undefined);
        }
      }}
      results={handles}
      highlighted={highlighted}
      setHighlighted={setHighlighted}
      onSelect={() => handleSelect(highlighted)}
      zIndex={60}
      sideOffset={4}
      triggerClassName={props.triggerClassName}
      className="w-(--radix-popover-trigger-width)!"
      trigger={
        <div
          ref={triggerRef}
          className={`handleInput input-with-border relative py-0! flex items-center gap-2 w-full ${props.large && "px-2!"} ${props.highlight ? INPUT_HIGHLIGHT_CLASS : ""} ${props.className}`}
          style={
            props.loading
              ? {
                  backgroundColor: theme.colors["border-light"],
                  color: theme.colors.tertiary,
                }
              : {
                  backgroundColor: theme.colors["bg-page"],
                  color: theme.colors.primary,
                }
          }
        >
          {leading && (
            <div className="text-tertiary text-center shrink-0 flex justify-end h-full items-center">
              {leading}
            </div>
          )}
          <Input
            autoFocus={props.autoFocus}
            className={`appearance-none! grow outline-none! min-w-0 ${props.large ? "py-1!" : props.compact ? "py-0!" : "py-0.5"}`}
            placeholder={props.placeholder ?? "atmosphere.handle"}
            size={0}
            value={handleValue}
            onChange={(e) => {
              e.currentTarget.setCustomValidity("");
              setHandleValue(e.target.value);
              props.onChange?.(e.target.value);
            }}
            onFocus={props.onFocus}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                // handle Enter here (with the current handleValue) instead of
                // relying on the Combobox's window listener, which only submits
                // when a suggestion is highlighted. stopPropagation keeps that
                // listener from also firing with a stale value.
                e.stopPropagation();
                handleSelect(highlighted);
              }
            }}
            autoComplete="off"
            disabled={props.loading}
          />
          {props.renderAction ? (
            props.renderAction(() => handleSelect(), handleValue)
          ) : props.loading ? (
            <DotLoader />
          ) : props.onSubmit && props.action ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect();
              }}
              disabled={!handleValue}
            >
              {props.action}
            </button>
          ) : (
            props.action
          )}
        </div>
      }
    >
      {suggestions.map((actor) => (
        <ComboboxResult
          key={actor.did}
          result={actor.handle}
          highlighted={highlighted}
          setHighlighted={setHighlighted}
          onSelect={() => handleSelect(actor.handle)}
          className=" flex-row! gap-2! leading-snug text-sm"
        >
          <Avatar
            src={actor.avatar}
            displayName={actor.displayName || actor.handle}
            size="medium"
            className="mr-2"
          />
          <div className="flex flex-col min-w-0 flex-1 text-left">
            <div className="truncate font-bold">
              {actor.displayName || actor.handle}
            </div>
            {actor.displayName && (
              <div className="text-tertiary text-xs italic truncate">
                @{actor.handle}
              </div>
            )}
          </div>
        </ComboboxResult>
      ))}
    </Combobox>
  );
};
