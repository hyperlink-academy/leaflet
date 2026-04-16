"use client";
import { Agent } from "@atproto/api";
import { Input } from "components/Input";
import { Combobox, ComboboxResult } from "components/Combobox";
import { useState } from "react";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";
import { DotLoader } from "components/utils/DotLoader";
import { theme } from "tailwind.config";
import { AtmosphereAccount } from "components/Icons/AtmosphereAccount";

type ActorSuggestion = {
  handle: string;
  did: string;
  displayName?: string;
  avatar?: string;
};

export const HandleInput = (props: {
  autoFocus?: boolean;
  action?: React.ReactNode;
  className?: string;
  large?: boolean;
  loading?: boolean;
  onSubmit?: (handle: string) => void;
}) => {
  let [handleValue, setHandleValue] = useState("");
  let [suggestions, setSuggestions] = useState<ActorSuggestion[]>([]);
  let [dropdownOpen, setDropdownOpen] = useState(false);
  let [highlighted, setHighlighted] = useState<string | undefined>(undefined);

  useDebouncedEffect(
    async () => {
      if (!handleValue) {
        setSuggestions([]);
        setDropdownOpen(false);
        return;
      }
      const agent = new Agent("https://public.api.bsky.app");
      const result = await agent.searchActorsTypeahead({
        q: handleValue,
        limit: 8,
      });
      const actors = result.data.actors.map((actor) => ({
        handle: actor.handle,
        did: actor.did,
        displayName: actor.displayName,
        avatar: actor.avatar,
      }));
      setSuggestions(actors);
      setDropdownOpen(actors.length > 0);
    },
    300,
    [handleValue],
  );

  const handleSelect = (handle?: string) => {
    const selected = handle ?? handleValue;
    if (!selected) return;
    setHandleValue(selected);
    setDropdownOpen(false);
    setSuggestions([]);
    setHighlighted(undefined);
    props.onSubmit?.(selected);
  };

  const handles = suggestions.map((s) => s.handle);

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
      className="w-(--radix-popover-trigger-width)!"
      trigger={
        <div
          className={`handleInput input-with-border relative py-0! flex items-center gap-2 w-full ${props.large && "px-2!"} ${props.className}`}
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
          <div className="text-tertiary text-center shrink-0 flex justify-end h-full items-center">
            <AtmosphereAccount />
          </div>
          <Input
            autoFocus={props.autoFocus}
            className={`appearance-none! grow outline-none! ${props.large ? "py-1!" : "py-0.5"}`}
            placeholder="atmosphere.handle"
            size={0}
            value={handleValue}
            onChange={(e) => setHandleValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            autoComplete="off"
            disabled={props.loading}
          />
          {props.loading ? (
            <DotLoader />
          ) : props.onSubmit ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                props.onSubmit!(handleValue);
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
          {actor.avatar ? (
            <img
              src={actor.avatar}
              alt=""
              className="w-6 h-6 rounded-full shrink-0 mr-2"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-border shrink-0 mr-2" />
          )}
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
