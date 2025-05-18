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
export const PublicationMetadata = ({
  cardBorderHidden,
}: {
  cardBorderHidden: boolean;
}) => {
  let { permission_token } = useReplicache();
  let { identity } = useIdentityData();
  let { data: publicationData, mutate } = useLeafletPublicationData();
  let pub = publicationData?.[0];
  let [titleState, setTitleState] = useState(pub?.title || "");
  let [descriptionState, setDescriptionState] = useState(pub?.title || "");

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
      className={`flex flex-col px-3 sm:px-4 pb-4 sm:pb-5  ${cardBorderHidden ? "sm:pt-6 pt-0" : "sm:pt-3 pt-2"}`}
    >
      <div className="flex gap-2">
        <Link
          href={`/lish/${identity?.resolved_did?.alsoKnownAs?.[0].slice(5)}/${pub.publications.name}`}
          className="text-accent-contrast font-bold hover:no-underline"
        >
          {pub.publications?.name}
        </Link>
        <div className="font-bold text-tertiary px-1 bg-border-light rounded-md ">
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
          <p className="text-sm text-tertiary">Published XX/XX/XXX</p>
          <Separator classname="h-4" />
          <Link
            target="_blank"
            className="text-sm"
            href={`/lish/${identity?.resolved_did?.alsoKnownAs?.[0].slice(5)}/${pub.publications.name}/${new AtUri(pub.doc).rkey}`}
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

const Title = () => {};
