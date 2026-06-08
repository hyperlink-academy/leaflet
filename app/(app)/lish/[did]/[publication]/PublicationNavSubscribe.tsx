"use client";
import {
  SubscribeButton,
  SubscribeInput,
} from "components/Subscribe/SubscribeButton";

// The subscribe control that sits at the right edge of the publication nav.
// Renders the compact SubscribeButton: a one-click subscribe for signed-in
// users, or a "Subscribe" button that opens the full subscribe form in a
// popover otherwise. Shared by the editor nav (PublicationPagesNav) and the
// published nav (PublicationNav) so they stay identical. Desktop only — mobile
// subscribes from the header.
//
// When `input` is set (single-page publications with no tabs to show) the nav
// has the whole row to itself, so render the full inline SubscribeInput
// centered instead of the compact button.
export function PublicationNavSubscribe(props: {
  input?: boolean;
  publicationUri: string;
  publicationUrl?: string;
  publicationName: string;
  publicationDescription?: string;
  newsletterMode: boolean;
}) {
  if (props.input) {
    return (
      <div className="min-w-0 w-full max-w-sm mx-auto pb-1">
        <SubscribeInput {...props} />
      </div>
    );
  }
  return (
    <div className="sm:block hidden min-w-0 max-w-64 w-fit pb-1">
      <SubscribeButton {...props} />
    </div>
  );
}
