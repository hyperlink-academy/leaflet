"use client";
import { AtUri } from "@atproto/syntax";
import { PubLeafletDocument } from "lexicons/api";
import { EditTiny } from "components/Icons/EditTiny";

import { usePublicationData } from "./PublicationSWRProvider";
import { Fragment, useState } from "react";
import { useParams } from "next/navigation";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { Menu, MenuItem } from "components/Layout";
import { deletePost } from "./deletePost";
import { ButtonPrimary } from "components/Buttons";
import { MoreOptionsVerticalTiny } from "components/Icons/MoreOptionsVerticalTiny";
import { DeleteSmall } from "components/Icons/DeleteSmall";
import { ShareSmall } from "components/Icons/ShareSmall";
import { ShareButton } from "components/ShareOptions";
import { SpeedyLink } from "components/SpeedyLink";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { CommentTiny } from "components/Icons/CommentTiny";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { LeafletOptions } from "app/(home-pages)/home/LeafletList/LeafletOptions";

export function PublishedPostsList(props: {
  searchValue: string;
  showPageBackground: boolean;
}) {
  let { data } = usePublicationData();
  let params = useParams();
  let { publication } = data!;
  if (!publication) return null;
  if (publication.documents_in_publications.length === 0)
    return (
      <div className="italic text-tertiary w-full container text-center place-items-center flex flex-col gap-3 p-3">
        Nothing's been published yet...
      </div>
    );
  return (
    <div className="publishedList w-full flex flex-col gap-2 pb-4">
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
          let quotes = doc.documents.document_mentions_in_bsky[0]?.count || 0;
          let comments = doc.documents.comments_on_documents[0]?.count || 0;

          let postLink = data?.publication
            ? `${getPublicationURL(data?.publication)}/${new AtUri(doc.documents.uri).rkey}`
            : "";

          return (
            <Fragment key={doc.documents?.uri}>
              <div className="flex gap-2 w-full ">
                <div
                  className={`publishedPost grow flex flex-col  hover:no-underline! rounded-lg border ${props.showPageBackground ? "border-border-light py-1 px-2" : "border-transparent px-1"}`}
                  style={{
                    backgroundColor: props.showPageBackground
                      ? "rgba(var(--bg-page), var(--bg-page-alpha))"
                      : "transparent",
                  }}
                >
                  <div className="flex justify-between gap-2">
                    <a
                      className="hover:no-underline!"
                      target="_blank"
                      href={`${getPublicationURL(publication)}/${uri.rkey}`}
                    >
                      <h3 className="text-primary grow leading-snug">
                        {record.title}
                      </h3>
                    </a>
                    <div className="flex justify-start align-top flex-row gap-1">
                      {leaflet && (
                        <>
                          <SpeedyLink
                            className="pt-[6px]"
                            href={`/${leaflet.leaflet}`}
                          >
                            <EditTiny />
                          </SpeedyLink>

                          <LeafletOptions
                            leaflet={leaflet?.permission_tokens!}
                            document_uri={doc.documents.uri}
                            shareLink={postLink}
                            loggedIn={true}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {record.description ? (
                    <p className="italic text-secondary">
                      {record.description}
                    </p>
                  ) : null}
                  <div className="text-sm text-tertiary flex gap-1 flex-wrap pt-3">
                    {record.publishedAt ? (
                      <PublishedDate dateString={record.publishedAt} />
                    ) : null}
                    {(comments > 0 || quotes > 0) && record.publishedAt
                      ? " | "
                      : ""}
                    {quotes > 0 && (
                      <SpeedyLink
                        href={`${getPublicationURL(publication)}/${uri.rkey}?interactionDrawer=quotes`}
                        className="flex flex-row gap-1 text-sm text-tertiary items-center"
                      >
                        <QuoteTiny /> {quotes}
                      </SpeedyLink>
                    )}
                    {comments > 0 && quotes > 0 ? " " : ""}
                    {comments > 0 && (
                      <SpeedyLink
                        href={`${getPublicationURL(publication)}/${uri.rkey}?interactionDrawer=comments`}
                        className="flex flex-row gap-1 text-sm text-tertiary items-center"
                      >
                        <CommentTiny /> {comments}
                      </SpeedyLink>
                    )}
                  </div>
                </div>
              </div>
              {!props.showPageBackground && (
                <hr className="last:hidden border-border-light" />
              )}
            </Fragment>
          );
        })}
    </div>
  );
}

// function OptionsMenu(props: { document_uri: string }) {
//   let { mutate, data } = usePublicationData();
//   let [state, setState] = useState<"normal" | "confirm">("normal");

//   if (state === "normal") {
//     return (
//       <>
//         <ShareButton
//           className="justify-end"
//           text={
//             <div className="flex gap-2">
//               Share Post Link
//               <ShareSmall />
//             </div>
//           }
//           subtext=""
//           smokerText="Post link copied!"
//           id="get-post-link"
//           fullLink={postLink?.includes("https") ? postLink : undefined}
//           link={postLink}
//         />

//         <hr className="border-border-light" />
//         <MenuItem
//           className="justify-end"
//           onSelect={async (e) => {
//             e.preventDefault();
//             setState("confirm");
//             return;
//           }}
//         >
//           Delete Post
//           <DeleteSmall />
//         </MenuItem>
//       </>
//     );
//   }
//   if (state === "confirm") {
//     return (
//       <div className="flex flex-col items-center font-bold text-secondary px-2 py-1">
//         Are you sure?
//         <div className="text-sm text-tertiary font-normal">
//           This action cannot be undone!
//         </div>
//         <ButtonPrimary
//           className="mt-2"
//           onClick={async () => {
//             await mutate((data) => {
//               if (!data) return data;
//               return {
//                 ...data,
//                 publication: {
//                   ...data.publication!,
//                   leaflets_in_publications:
//                     data.publication?.leaflets_in_publications.filter(
//                       (l) => l.doc !== props.document_uri,
//                     ) || [],
//                   documents_in_publications:
//                     data.publication?.documents_in_publications.filter(
//                       (d) => d.documents?.uri !== props.document_uri,
//                     ) || [],
//                 },
//               };
//             }, false);
//             await deletePost(props.document_uri);
//           }}
//         >
//           Delete
//         </ButtonPrimary>
//       </div>
//     );
//   }
//}

function PublishedDate(props: { dateString: string }) {
  const formattedDate = useLocalizedDate(props.dateString, {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });

  return <p className="text-sm text-tertiary">Published {formattedDate}</p>;
}
