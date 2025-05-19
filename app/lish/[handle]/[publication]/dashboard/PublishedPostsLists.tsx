"use client";
import Link from "next/link";
import { AtUri } from "@atproto/syntax";
import { PubLeafletDocument } from "lexicons/api";
import { EditTiny } from "components/Icons/EditTiny";
import { MoreOptionsVerticalTiny } from "components/Icons/MoreOptionsVerticalTiny";
import { Menu, MenuItem } from "components/Layout";

import { usePublicationData } from "./PublicationSWRProvider";
import { Fragment } from "react";
import { useParams } from "next/navigation";

export function PublishedPostsList() {
  let publication = usePublicationData();
  let params = useParams();
  if (!publication) return null;
  if (publication.documents_in_publications.length === 0)
    return (
      <div className="italic text-tertiary w-full container text-center place-items-center flex flex-col gap-3 p-3">
        Nothing's been published yet...
      </div>
    );
  return (
    <div className="publishedList w-full flex flex-col gap-4 pb-8 sm:pb-12">
      {publication.documents_in_publications.map((doc) => {
        if (!doc.documents) return null;
        let leaflet = publication.leaflets_in_publications.find(
          (l) => doc.documents && l.doc === doc.documents.uri,
        );
        let uri = new AtUri(doc.documents.uri);
        let record = doc.documents.data as PubLeafletDocument.Record;

        return (
          <Fragment key={doc.documents?.uri}>
            <div className="flex  w-full ">
              <Link
                target="_blank"
                href={`/lish/${params.handle}/${params.publication}/${uri.rkey}`}
                className="publishedPost grow flex flex-col hover:!no-underline"
              >
                <h3 className="text-primary">{record.title}</h3>
                {record.description ? (
                  <p className="italic text-secondary">{record.description}</p>
                ) : null}
                {record.publishedAt ? (
                  <p className="text-sm text-tertiary pt-3">
                    Published{" "}
                    {new Date(record.publishedAt).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "long",
                        day: "2-digit",
                      },
                    )}
                  </p>
                ) : null}
              </Link>
              {leaflet && (
                <Link className="pt-[6px]" href={`/${leaflet.leaflet}`}>
                  <EditTiny />
                </Link>
              )}
            </div>
            <hr className="last:hidden border-border-light" />
          </Fragment>
        );
      })}
    </div>
  );
}
