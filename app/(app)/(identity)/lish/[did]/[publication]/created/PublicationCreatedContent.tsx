"use client";
import Link from "next/link";
import { ButtonPrimary } from "components/Buttons";
import { PubListing } from "app/(app)/(identity)/(home-pages)/p/[didOrHandle]/PubListing";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "../dashboard/PublicationSWRProvider";

export function PublicationCreatedContent(props: { dashboardHref: string }) {
  let { data } = usePublicationData();
  let record = useNormalizedPublicationRecord();
  let publication = data?.publication;
  if (!publication || !record) return null;

  return (
    <div className="publicationCreatedPage relative w-full h-full flex items-stretch bg-bg-leaflet p-4">
      <div className="h-full flex items-center max-w-sm w-full mx-auto">
        <div className="w-full flex flex-col gap-4 items-center text-center">
          <div className="flex flex-col gap-1">
            <h2>Publication created!</h2>
            <a
              href={record.url}
              target="_blank"
              rel="noreferrer"
              className="font-bold break-all"
            >
              {record.url.replace(/^https?:\/\//, "")}
            </a>
          </div>
          <div className="w-full">
            <PubListing
              uri={publication.uri}
              record={record}
              publication_newsletter_settings={
                publication.publication_newsletter_settings
              }
            />
          </div>
          <Link href={props.dashboardHref}>
            <ButtonPrimary type="button">Go to Pub Dashboard</ButtonPrimary>
          </Link>
        </div>
      </div>
    </div>
  );
}
