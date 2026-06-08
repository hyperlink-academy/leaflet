"use client";
import { SubscribeButton } from "components/Subscribe/SubscribeButton";

// The subscribe control that sits at the right edge of the publication nav.
// Renders the compact SubscribeButton: a one-click subscribe for signed-in
// users, or a "Subscribe" button that opens the full subscribe form in a
// popover otherwise. Shared by the editor nav (PublicationPagesNav) and the
// published nav (PublicationNav) so they stay identical. Desktop only — mobile
// subscribes from the header.
export function PublicationNavSubscribe(props: {
  publicationUri: string;
  publicationUrl?: string;
  publicationName: string;
  publicationDescription?: string;
  newsletterMode: boolean;
}) {
  return (
    <div className="sm:block hidden min-w-0 max-w-64 w-fit pb-1">
      <SubscribeButton {...props} />
    </div>
  );
}
