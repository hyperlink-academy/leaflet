import { LegalContent } from "app/legal/content";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col h-[80vh] mx-auto sm:px-4 px-3 sm:py-6 py-4 max-w-prose gap-4 text-lg">
        <p>
          Leaflet.pub is a web app for instantly creating and collaborating on
          documents.{" "}
          <Link href="/" prefetch={false}>
            Click here
          </Link>{" "}
          to create one and get started!
        </p>

        <p>
          Leaflet is made by Learning Futures Inc. Previously we built{" "}
          <a href="https://hyperlink.academy">hyperlink.academy</a>
        </p>
        <p>
          You can find us on{" "}
          <a href="https://bsky.app/profile/leaflet.pub">Bluesky</a> or email as
          at <a href="mailto:contact@leaflet.pub">contact@leaflet.pub</a>
        </p>
      </div>
      <LegalContent />
    </div>
  );
}
