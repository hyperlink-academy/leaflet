"use client";
import { Agent } from "@atproto/api";
import { Input } from "components/Input";
import * as RadixPopover from "@radix-ui/react-popover";
import { useState } from "react";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";

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
}) => {
  let [handleValue, setHandleValue] = useState("");
  let [suggestions, setSuggestions] = useState<ActorSuggestion[]>([]);
  let [dropdownOpen, setDropdownOpen] = useState(false);
  let [selectedIndex, setSelectedIndex] = useState(0);

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
      setSelectedIndex(0);
    },
    300,
    [handleValue],
  );

  const handleSelect = (selected: string) => {
    setHandleValue(selected);
    setDropdownOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!dropdownOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && suggestions[selectedIndex]) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex].handle);
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
    }
  };

  return (
    <RadixPopover.Root open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <RadixPopover.Anchor asChild>
        <div
          className={`handleInput input-with-border relative py-0! flex items-center gap-1 w-full ${props.large && "px-2!"} ${props.className} `}
        >
          <div className="text-tertiary text-center shrink-0  flex justify-end h-full items-center">
            @
          </div>
          <Input
            autoFocus={props.autoFocus}
            className={`appearance-none! grow outline-none!  ${props.large ? "py-1!" : "py-0.5 "} `}
            placeholder="atmosphere.handle"
            size={0}
            value={handleValue}
            onChange={(e) => setHandleValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          {props.action}
        </div>
      </RadixPopover.Anchor>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="dropdownMenu z-20 bg-bg-page flex flex-col p-1 gap-1 text-primary border border-border rounded-md shadow-md w-(--radix-popover-trigger-width)"
        >
          {suggestions.map((actor, index) => (
            <button
              key={actor.did}
              type="button"
              className={`menuItem w-full flex-row! gap-2! text-secondary leading-snug text-sm py-1! ${index === selectedIndex ? "bg-[var(--accent-light)]!" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(actor.handle)}
            >
              {actor.avatar ? (
                <img
                  src={actor.avatar}
                  alt=""
                  className="w-5 h-5 rounded-full shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-border shrink-0" />
              )}
              <div className="flex flex-col min-w-0 flex-1 text-left">
                <div className="truncate">
                  {actor.displayName || actor.handle}
                </div>
                {actor.displayName && (
                  <div className="text-tertiary text-xs italic truncate">
                    @{actor.handle}
                  </div>
                )}
              </div>
            </button>
          ))}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
};
