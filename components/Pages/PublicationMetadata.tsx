import Link from "next/link";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { Input } from "components/Input";
import { useEffect, useState } from "react";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";
import { updateLeafletDraftMetadata } from "actions/publications/updateLeafletDraftMetadata";
import { useReplicache } from "src/replicache";
import { useIdentityData } from "components/IdentityProvider";
import { AutosizeTextarea } from "components/utils/AutosizeTextarea";
import { Separator } from "components/Layout";
import { AtUri } from "@atproto/syntax";
import { PubLeafletDocument } from "lexicons/api";
import { publications } from "drizzle/schema";
import {
  getBasePublicationURL,
  getPublicationURL,
} from "app/lish/createPub/getPublicationURL";
export const PublicationMetadata = ({
  cardBorderHidden,
}: {
  cardBorderHidden: boolean;
}) => {
  let { permission_token } = useReplicache();
  let { data: pub, mutate } = useLeafletPublicationData();
  let [titleState, setTitleState] = useState(pub?.title || "");
  let [descriptionState, setDescriptionState] = useState(
    pub?.description || "",
  );
  let record = pub?.documents?.data as PubLeafletDocument.Record | null;
  let publishedAt = record?.publishedAt;

  useEffect(() => {
    setTitleState(pub?.title || "");
    setDescriptionState(pub?.description || "");
  }, [pub]);
  useDebouncedEffect(
    async () => {
      if (!pub || !pub.publications) return;
      if (pub.title === titleState && pub.description === descriptionState)
        return;
      await updateLeafletDraftMetadata(
        permission_token.id,
        pub.publications?.uri,
        titleState,
        descriptionState,
      );
      mutate();
    },
    1000,
    [pub, titleState, descriptionState, permission_token],
  );
  if (!pub || !pub.publications) return null;

  return (
    <div
      className={`flex flex-col px-3 sm:px-4 pb-5 ${cardBorderHidden ? "sm:pt-6 pt-0" : "sm:pt-3 pt-2"}`}
    >
      <div className="flex gap-2">
        <Link
          href={`${getBasePublicationURL(pub.publications)}/dashboard`}
          className="text-accent-contrast font-bold hover:no-underline"
        >
          {pub.publications?.name}
        </Link>
        <div className="font-bold text-tertiary px-1 text-sm flex place-items-center bg-border-light rounded-md ">
          Editor
        </div>
      </div>
      <Input
        className="text-xl font-bold outline-none bg-transparent"
        value={titleState}
        onChange={(e) => {
          setTitleState(e.currentTarget.value);
        }}
        placeholder="Untitled"
      />
      <AutosizeTextarea
        placeholder="add an optional description..."
        className="italic text-secondary outline-none bg-transparent"
        value={descriptionState}
        onChange={(e) => {
          setDescriptionState(e.currentTarget.value);
        }}
      />
      {pub.doc ? (
        <div className="flex flex-row items-center gap-2 pt-3">
          <p className="text-sm text-tertiary">
            Published{" "}
            {publishedAt &&
              new Date(publishedAt).toLocaleString(undefined, {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
          </p>
          <Separator classname="h-4" />
          <Link
            target="_blank"
            className="text-sm"
            href={`${getPublicationURL(pub.publications)}/${new AtUri(pub.doc).rkey}`}
          >
            View Post
          </Link>
        </div>
      ) : (
        <p className="text-sm text-tertiary pt-2">Draft</p>
      )}
    </div>
  );
};

export const PublicationMetadataPreview = () => {
  let { data: pub } = useLeafletPublicationData();
  let record = pub?.documents?.data as PubLeafletDocument.Record | null;
  let publishedAt = record?.publishedAt;

  if (!pub || !pub.publications) return null;

  return (
    <div className={`flex flex-col px-3 sm:px-4 pb-5 sm:pt-3 pt-2`}>
      <div className="text-accent-contrast font-bold hover:no-underline">
        {pub.publications?.name}
      </div>

      <div
        className={`text-xl font-bold outline-none bg-transparent ${!pub.title && "text-tertiary italic"}`}
      >
        {pub.title ? pub.title : "Untitled"}
      </div>
      <div className="italic text-secondary outline-none bg-transparent">
        {pub.description}
      </div>

      {pub.doc ? (
        <div className="flex flex-row items-center gap-2 pt-3">
          <p className="text-sm text-tertiary">
            Published{" "}
            {publishedAt &&
              new Date(publishedAt).toLocaleString(undefined, {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
          </p>
        </div>
      ) : (
        <p className="text-sm text-tertiary pt-2">Draft</p>
      )}
    </div>
  );
};
