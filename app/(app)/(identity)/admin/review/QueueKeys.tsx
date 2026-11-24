"use client";

import { useEffect } from "react";

const Key = (props: { children: string }) => (
  <kbd className="font-mono border border-border-light rounded-md px-1">
    {props.children}
  </kbd>
);

// Keyboard stepping over the server-rendered account cards. The card with
// focus is the current one, so there is no client copy of the list.
export function QueueKeys() {
  useEffect(() => {
    let onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      let target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      let cards = [
        ...document.querySelectorAll<HTMLElement>("[data-review-account]"),
      ];
      let current =
        document.activeElement?.closest<HTMLElement>("[data-review-account]") ??
        null;
      let index = current ? cards.indexOf(current) : -1;
      if (e.key === "j" || e.key === "k") {
        let next = cards[e.key === "j" ? index + 1 : Math.max(0, index - 1)];
        if (next) {
          next.focus({ preventScroll: true });
          next.scrollIntoView({ block: "start", behavior: "smooth" });
        } else if (e.key === "j")
          document
            .querySelector<HTMLAnchorElement>("[data-review-next-page]")
            ?.click();
        e.preventDefault();
        return;
      }
      if (!current) return;
      // "b" only moves focus to the button: Enter is the deliberate step.
      if (e.key === "b") {
        current
          .querySelector<HTMLButtonElement>("[data-review-action]")
          ?.focus();
        e.preventDefault();
      }
      if (e.key === "o") {
        current
          .querySelector<HTMLAnchorElement>("[data-review-profile]")
          ?.click();
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="text-xs text-tertiary hidden sm:block">
      <Key>j</Key> <Key>k</Key> next / previous · <Key>o</Key> open profile ·{" "}
      <Key>b</Key> then <Key>Enter</Key> block or unblock
    </div>
  );
}
