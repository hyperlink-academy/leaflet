"use client";
import { Menu, MenuItem, RadioMenuGroup, RadioMenuItem } from "components/Menu";
import { ButtonPrimary } from "components/Buttons";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";
import { RSSTiny } from "components/Icons/RSSTiny";
import type { SubscribeMode } from "./SubscribeButton";

export type SubscribeButtonModeMenuAccount = {
  value: SubscribeMode;
  label: string;
  icon: React.ReactNode;
  // The account the main button currently subscribes with — marked in the menu.
  selected: boolean;
  // Subscribe with this account directly, rather than just toggling selection.
  onSelect: () => void;
};

// The caret dropdown beside the compact subscribe button. Each account is a
// one-click subscribe (it runs the subscribe action, not just a toggle), and
// the optional RSS item links the feed. Shared by the atproto (HandleSubscribe)
// and email (EmailSubscribe) buttons.
export const SubscribeButtonModeMenu = (props: {
  disabled: boolean;
  publicationUrl?: string;
  accounts: SubscribeButtonModeMenuAccount[];
}) => {
  let selectedValue =
    props.accounts.find((a) => a.selected)?.value ?? props.accounts[0]?.value;
  return (
    <Menu
      align="end"
      asChild
      className="text-sm"
      trigger={
        <ButtonPrimary
          compact
          disabled={props.disabled}
          aria-label="Choose how to subscribe"
          className="rounded-l-none! border-l-accent-2! py-0! h-full! hover:outline-transparent! focus:outline-transparent! active:outline-transparent! px-0.5!"
        >
          <ArrowDownTiny />
        </ButtonPrimary>
      }
    >
      <div className="text-tertiary text-sm px-1 pt-0.5 ">Subscribe with…</div>
      <RadioMenuGroup value={selectedValue ?? ""}>
        {props.accounts.map((account) => (
          <RadioMenuItem
            key={account.value}
            className="py-0.5! font-normal!"
            value={account.value}
            selected={account.selected}
            onSelect={() => account.onSelect()}
          >
            <span className="flex items-center gap-2 min-w-0">
              {account.icon}
              <span className="truncate">{account.label}</span>
            </span>
          </RadioMenuItem>
        ))}
      </RadioMenuGroup>

      {props.publicationUrl && (
        <MenuItem
          className="py-0.5! font-normal!"
          onSelect={() =>
            window.open(
              `${props.publicationUrl}/rss`,
              "_blank",
              "noopener,noreferrer",
            )
          }
        >
          <span className="flex items-center gap-2">
            <RSSTiny className="shrink-0 text-tertiary" /> RSS Feed
          </span>
        </MenuItem>
      )}
    </Menu>
  );
};
