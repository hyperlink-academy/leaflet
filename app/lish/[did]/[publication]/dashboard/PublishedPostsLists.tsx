"use client";
import { AtUri } from "@atproto/syntax";
import { EditTiny } from "components/Icons/EditTiny";

import {
  usePublicationData,
  useNormalizedPublicationRecord,
  type PublishedDocument,
} from "./PublicationSWRProvider";
import { Fragment } from "react";
import { useParams } from "next/navigation";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { SpeedyLink } from "components/SpeedyLink";
import { InteractionPreview } from "components/InteractionsPreview";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { LeafletOptions } from "app/(home-pages)/home/LeafletList/LeafletOptions";
import { StaticLeafletDataContext } from "components/PageSWRDataProvider";

export function PublishedPostsList(props: {
  searchValue: string;
  showPageBackground: boolean;
}) {
  let { data } = usePublicationData();
  let { publication, documents } = data || {};
  const pubRecord = useNormalizedPublicationRecord();

  if (!publication) return null;
  if (!documents || documents.length === 0)
    return (
      <div className="italic text-tertiary w-full container text-center place-items-center flex flex-col gap-3 p-3">
        Nothing's been published yet...
      </div>
    );

  // Sort by publishedAt (most recent first)
  const sortedDocuments = [...documents].sort((a, b) => {
    const aDate = a.record.publishedAt
      ? new Date(a.record.publishedAt)
      : new Date(0);
    const bDate = b.record.publishedAt
      ? new Date(b.record.publishedAt)
      : new Date(0);
    return bDate.getTime() - aDate.getTime();
  });

  return (
    <div className="publishedList w-full flex flex-col gap-2 pb-4">
      {sortedDocuments.map((doc) => (
        <PublishedPostItem
          key={doc.uri}
          doc={doc}
          publication={publication}
          pubRecord={pubRecord}
          showPageBackground={props.showPageBackground}
        />
      ))}
    </div>
  );
}

function PublishedPostItem(props: {
  doc: PublishedDocument;
  publication: NonNullable<
    NonNullable<ReturnType<typeof usePublicationData>["data"]>["publication"]
  >;
  pubRecord: ReturnType<typeof useNormalizedPublicationRecord>;
  showPageBackground: boolean;
}) {
  const { doc, publication, pubRecord, showPageBackground } = props;
  const uri = new AtUri(doc.uri);
  const leaflet = publication.leaflets_in_publications.find(
    (l) => l.doc === doc.uri,
  );

  return (
    <Fragment>
      <div className="flex gap-2 w-full ">
        <div
          className={`publishedPost grow flex flex-col  hover:no-underline! rounded-lg border ${showPageBackground ? "border-border-light py-1 px-2" : "border-transparent px-1"}`}
          style={{
            backgroundColor: showPageBackground
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
                {doc.record.title}
              </h3>
            </a>
            <div className="flex justify-start align-top flex-row gap-1">
              {leaflet && leaflet.permission_tokens && (
                <>
                  <SpeedyLink className="pt-[6px]" href={`/${leaflet.leaflet}`}>
                    <EditTiny />
                  </SpeedyLink>

                  <StaticLeafletDataContext
                    value={{
                      ...leaflet.permission_tokens,
                      leaflets_in_publications: [
                        {
                          ...leaflet,
                          publications: publication,
                          documents: {
                            uri: doc.uri,
                            indexed_at: doc.indexed_at,
                            sort_date: doc.sort_date,
                            data: doc.data,
                          },
                        },
                      ],
                      leaflets_to_documents: [],
                      blocked_by_admin: null,
                      custom_domain_routes: [],
                    }}
                  >
                    <LeafletOptions loggedIn={true} />
                  </StaticLeafletDataContext>
                </>
              )}
            </div>
          </div>

          {doc.record.description ? (
            <p className="italic text-secondary">{doc.record.description}</p>
          ) : null}
          <div className="text-sm text-tertiary flex gap-3 justify-between sm:justify-start items-center pt-3">
            {doc.record.publishedAt ? (
              <PublishedDate dateString={doc.record.publishedAt} />
            ) : null}
            <InteractionPreview
              quotesCount={doc.mentionsCount}
              commentsCount={doc.commentsCount}
              recommendsCount={doc.recommendsCount}
              documentUri={doc.uri}
              tags={doc.record.tags || []}
              showComments={pubRecord?.preferences?.showComments !== false}
              showMentions={pubRecord?.preferences?.showMentions !== false}
              postUrl={`${getPublicationURL(publication)}/${uri.rkey}`}
            />
          </div>
        </div>
      </div>
      {!showPageBackground && (
        <hr className="last:hidden border-border-light" />
      )}
    </Fragment>
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
