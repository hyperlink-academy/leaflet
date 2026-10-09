"use client";

import { ButtonPrimary } from "components/Buttons";
import { Input } from "components/Input";
import { SettingsSection } from "components/SettingsLayout";
import { useSmoker } from "components/Toast";
import { getPublicationURL } from "src/utils/getPublicationURL";
import { usePublicationData } from "../PublicationSWRProvider";

export function SubscribePageSettings() {
  return (
    <SettingsSection title="Subscribe Page">
      <p>
        Link people to this page or embed it in an iframe to allow them to
        subscribe to your publication
      </p>
      <SubscribePageLinkInput />
    </SettingsSection>
  );
}

export function SubscribePageLinkInput(props: { id?: string }) {
  let { data } = usePublicationData();
  let smoker = useSmoker();
  let pub = data?.publication;
  if (!pub) return null;

  let appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://leaflet.pub";
  // getPublicationURL is relative off production; the link is meant to be
  // shared, so always resolve it to an absolute URL.
  let subscribeUrl = new URL(
    `${getPublicationURL(pub).replace(/\/$/, "")}/subscribe`,
    appUrl,
  ).toString();

  return (
    <div className="relative">
      <Input
        id={props.id}
        aria-label="Subscribe page URL"
        className="input-with-border w-full text-primary pr-16"
        readOnly
        value={subscribeUrl}
        onFocus={(e) => e.currentTarget.select()}
      />
      <div className="absolute top-[4px] right-1">
        <ButtonPrimary
          type="button"
          compact
          onClick={async (e) => {
            let rect = e.currentTarget.getBoundingClientRect();
            let position = {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height + 2,
            };
            try {
              await navigator.clipboard.writeText(subscribeUrl);
              smoker({ position, text: "Copied!" });
            } catch {
              smoker({ position, error: true, text: "Couldn't copy link!" });
            }
          }}
        >
          Copy
        </ButtonPrimary>
      </div>
    </div>
  );
}
