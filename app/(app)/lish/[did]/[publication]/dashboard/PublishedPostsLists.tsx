"use client";
import { EditTiny } from "components/Icons/EditTiny";
import { EmptyState } from "components/EmptyState";

import {
  usePublicationData,
  useNormalizedPublicationRecord,
  type PublishedDocument,
} from "./PublicationSWRProvider";
import { Fragment } from "react";
import { useParams } from "next/navigation";
import {
  getPublicationURL,
  getDocumentURL,
} from "app/(app)/lish/createPub/getPublicationURL";
import { SpeedyLink } from "components/SpeedyLink";
import { InteractionPreview } from "components/Interactions/InteractionsPreview";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { LeafletOptions } from "app/(app)/(home-pages)/(writer)/home/LeafletList/LeafletOptions";
import { StaticLeafletDataContext } from "components/PageSWRDataProvider";
import { useIdentityData } from "components/IdentityProvider";
import { EmailTiny } from "components/Icons/EmailTiny";
import { Popover } from "components/Popover";

export function PublishedPostsList(props: {
  searchValue: string;
  showPageBackground: boolean;
}) {
  let { data } = usePublicationData();
  let { publication, documents } = data || {};
  const pubRecord = useNormalizedPublicationRecord();
  if (!publication) return null;
  if (!documents || documents.length === 0)
    return <EmptyState title="Nothing's been published yet..." />;

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
    <div className="publishedList w-full flex flex-col gap-2 pt-3 pb-6">
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
  const { identity } = useIdentityData();
  const leaflet = publication.leaflets_in_publications.find(
    (l) => l.doc === doc.uri,
  );
  const docUrl = getDocumentURL(doc.record, doc.uri, publication);

  // Owners can edit every post; contributors can only edit posts where they
  // appear in that leaflet's leaflet_contributors.
  const isOwner =
    !!identity?.atp_did && identity.atp_did === publication.identity_did;
  const canEdit =
    isOwner ||
    (leaflet?.permission_tokens?.leaflet_contributors ?? []).some(
      (c: { contributor_did: string }) =>
        c.contributor_did === identity?.atp_did,
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
            <a className="hover:no-underline!" target="_blank" href={docUrl}>
              <h3 className="text-primary grow leading-snug">
                {doc.record.title === "" || doc.record.title === undefined
                  ? "Untitled"
                  : doc.record.title}
              </h3>
            </a>
            <div className="flex justify-start items-start flex-row gap-2">
              {doc.postSend ? <PostSendStatus send={doc.postSend} /> : null}
              {leaflet && leaflet.permission_tokens && canEdit && (
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
                            bsky_like_count: doc.bsky_like_count ?? 0,
                            indexed: true,
                            recommend_count: doc.recommendsCount ?? 0,
                          },
                        },
                      ],
                      leaflets_to_documents: [],
                      publications: [],
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
          <div className="text-sm text-tertiary flex gap-3 justify-between items-center pt-3">
            {doc.record.publishedAt ? (
              <PublishedDate dateString={doc.record.publishedAt} />
            ) : null}

            <InteractionPreview
              postRecord={doc.record}
              shareType="weak"
              quotesCount={doc.mentionsCount}
              commentsCount={doc.commentsCount}
              recommendsCount={doc.recommendsCount}
              documentUri={doc.uri}
              tags={doc.record.tags || []}
              publication={pubRecord || undefined}
              pubUri={publication?.uri || undefined}
              showComments={pubRecord?.preferences?.showComments !== false}
              showMentions={pubRecord?.preferences?.showMentions !== false}
              showRecommends={pubRecord?.preferences?.showRecommends !== false}
              postUrl={docUrl}
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

  return <p className="text-sm text-tertiary"> {formattedDate}</p>;
}

function PostSendStatus(props: {
  send: NonNullable<PublishedDocument["postSend"]>;
}) {
  const { status, subscriber_count } = props.send;
  if (status === "sent") {
    return (
      <Popover
        trigger={
          <div className="accent-container flex h-6 place-items-center font-bold text-accent-contrast text-xs px-1.5">
            SENT
          </div>
        }
      >
        <p className="text-sm text-tertiary">
          Sent to{" "}
          {subscriber_count !== null
            ? `${subscriber_count.toLocaleString()} ${subscriber_count === 1 ? "subscriber" : "subscribers"}`
            : "subscribers"}
        </p>
      </Popover>
    );
  }
  if (status === "sending" || status === "pending") {
    return (
      <div className="light-container font-bold text-accent-contrast text-xs px-1.5">
        SENDING…
      </div>
    );
  }
  if (status === "failed") {
    return (
      <Popover
        trigger={
          <div className="accent-container font-bold text-accent-2! bg-accent-1! text-xs px-1.5">
            FAILED
          </div>
        }
      >
        <p className="text-sm text-tertiary">
          Something went wrong and we couldn't send this email… Try republishing
          and sending again.
        </p>
        <p className="text-sm text-tertiary">
          If the issue persists,{" "}
          <a href="mailto:contact@leaflet.pub">contact us</a>.
        </p>
      </Popover>
    );
  }
  return null;
}
