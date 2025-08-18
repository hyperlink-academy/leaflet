"use client";
import Link from "next/link";
import { AtUri } from "@atproto/syntax";
import { PubLeafletDocument } from "lexicons/api";
import { EditTiny } from "components/Icons/EditTiny";

import { usePublicationData } from "./PublicationSWRProvider";
import { Fragment, useState } from "react";
import { useParams } from "next/navigation";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { Menu, MenuItem } from "components/Layout";
import { deletePost } from "./deletePost";
import { mutate } from "swr";
import { Button } from "react-aria-components";
import { ButtonPrimary } from "components/Buttons";
import { MoreOptionsVerticalTiny } from "components/Icons/MoreOptionsVerticalTiny";
import { DeleteSmall } from "components/Icons/DeleteSmall";
import { ShareSmall } from "components/Icons/ShareSmall";
import { ShareButton } from "components/ShareOptions";

export function PublishedPostsList() {
  let { data: publication } = usePublicationData();
  let params = useParams();
  if (!publication) return null;
  if (publication.documents_in_publications.length === 0)
    return (
      <div className="italic text-tertiary w-full container text-center place-items-center flex flex-col gap-3 p-3">
        Nothing's been published yet...
      </div>
    );
  return (
    <div className="publishedList w-full flex flex-col gap-4 pb-4">
      {publication.documents_in_publications
        .sort((a, b) => {
          let aRecord = a.documents?.data! as PubLeafletDocument.Record;
          let bRecord = b.documents?.data! as PubLeafletDocument.Record;
          const aDate = aRecord.publishedAt
            ? new Date(aRecord.publishedAt)
            : new Date(0);
          const bDate = bRecord.publishedAt
            ? new Date(bRecord.publishedAt)
            : new Date(0);
          return bDate.getTime() - aDate.getTime(); // Sort by most recent first
        })
        .map((doc) => {
          if (!doc.documents) return null;
          let leaflet = publication.leaflets_in_publications.find(
            (l) => doc.documents && l.doc === doc.documents.uri,
          );
          let uri = new AtUri(doc.documents.uri);
          let record = doc.documents.data as PubLeafletDocument.Record;

          return (
            <Fragment key={doc.documents?.uri}>
              <div className="flex gap-2 w-full ">
                <div className="publishedPost grow flex flex-col hover:!no-underline">
                  <div className="flex justify-between gap-2">
                    <a
                      className="hover:!no-underline"
                      target="_blank"
                      href={`${getPublicationURL(publication)}/${uri.rkey}`}
                    >
                      <h3 className="text-primary grow leading-snug">
                        {record.title}
                      </h3>
                    </a>
                    <div className="flex justify-start align-top flex-row gap-1">
                      {leaflet && (
                        <Link className="pt-[6px]" href={`/${leaflet.leaflet}`}>
                          <EditTiny />
                        </Link>
                      )}
                      <Options document_uri={doc.documents.uri} />
                    </div>
                  </div>

                  {record.description ? (
                    <p className="italic text-secondary">
                      {record.description}
                    </p>
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
                </div>
              </div>
              <hr className="last:hidden border-border-light" />
            </Fragment>
          );
        })}
    </div>
  );
}

let Options = (props: { document_uri: string }) => {
  return (
    <Menu
      align="end"
      alignOffset={20}
      asChild
      trigger={
        <button className="text-secondary rounded-md selected-outline !border-transparent hover:!border-border h-min">
          <MoreOptionsVerticalTiny />
        </button>
      }
    >
      <>
        <OptionsMenu document_uri={props.document_uri} />
      </>
    </Menu>
  );
};

function OptionsMenu(props: { document_uri: string }) {
  let { mutate, data: publication } = usePublicationData();
  let [state, setState] = useState<"normal" | "confirm">("normal");

  let postLink = publication
    ? `${getPublicationURL(publication)}/${new AtUri(props.document_uri).rkey}`
    : null;

  if (state === "normal") {
    return (
      <>
        <ShareButton
          className="justify-end"
          text={
            <div className="flex gap-2">
              Share Post Link
              <ShareSmall />
            </div>
          }
          subtext=""
          smokerText="Post link copied!"
          id="get-post-link"
          fullLink={postLink?.includes("https") ? postLink : undefined}
          link={postLink}
        />

        <hr className="border-border-light" />
        <MenuItem
          className="justify-end"
          onSelect={async (e) => {
            e.preventDefault();
            setState("confirm");
            return;
          }}
        >
          Delete Post
          <DeleteSmall />
        </MenuItem>
      </>
    );
  }
  if (state === "confirm") {
    return (
      <div className="flex flex-col items-center font-bold text-secondary px-2 py-1">
        Are you sure?
        <div className="text-sm text-tertiary font-normal">
          This action cannot be undone!
        </div>
        <ButtonPrimary
          className="mt-2"
          onClick={async () => {
            await mutate((data) => {
              if (!data) return data;
              return {
                ...data,
                leaflets_in_publications: data.leaflets_in_publications.filter(
                  (l) => l.doc !== props.document_uri,
                ),
                documents_in_publications:
                  data.documents_in_publications.filter(
                    (d) => d.documents?.uri !== props.document_uri,
                  ),
              };
            }, false);
            await deletePost(props.document_uri);
          }}
        >
          Delete
        </ButtonPrimary>
      </div>
    );
  }
}
