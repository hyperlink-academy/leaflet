"use client";
import { useState } from "react";
import { SubscribeInput } from "components/Subscribe/SubscribeButton";
import { ButtonPrimary } from "components/Buttons";

// The subscribe control that sits at the right edge of the publication nav.
// Collapsed it shows a "Subscribe" button; hovering, focusing, or typing an
// email expands it into the full SubscribeInput. Shared by the editor nav
// (PublicationPagesNav) and the published nav (PublicationNav) so they stay
// identical. Desktop only — mobile subscribes from the header.
export function PublicationNavSubscribe(props: {
  publicationUri: string;
  publicationUrl?: string;
  publicationName: string;
  publicationDescription?: string;
  newsletterMode: boolean;
}) {
  let [hovered, setHovered] = useState(false);
  let [focused, setFocused] = useState(false);
  let [hasValue, setHasValue] = useState(false);
  let open = hovered || focused || hasValue;

  return (
    <div
      className="sm:block hidden min-w-0 max-w-64 w-fit pb-1"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setFocused(false);
      }}
      onInput={(e) => {
        let target = e.target as HTMLInputElement;
        if (target.type === "email") setHasValue(!!target.value);
      }}
    >
      {open ? (
        <SubscribeInput
          compact
          publicationUri={props.publicationUri}
          publicationUrl={props.publicationUrl}
          publicationName={props.publicationName}
          publicationDescription={props.publicationDescription}
          newsletterMode={props.newsletterMode}
        />
      ) : (
        <ButtonPrimary compact className="pubPageSubscribe text-sm!">
          Subscribe
        </ButtonPrimary>
      )}
    </div>
  );
}
