"use client";
import { ActionButton } from "components/ActionBar/ActionButton";
import { BlockDocPageSmall } from "components/Icons/BlockDocPageSmall";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPublicationPage } from "actions/createPublicationPage";
import { usePublicationData } from "./PublicationSWRProvider";

export function EditPagesNavLink(props: {
  publication: string;
  did: string;
  publicationName: string;
}) {
  let router = useRouter();
  let { data, mutate } = usePublicationData();
  let [loading, setLoading] = useState(false);

  let pages = data?.publication?.publication_pages || [];

  async function handleClick() {
    if (loading) return;
    let targetPath: string | null;
    let existing = pages[0];
    if (existing) {
      targetPath = existing.path;
    } else {
      setLoading(true);
      let created = await createPublicationPage({
        publication_uri: props.publication,
        path: "/",
        title: "home",
        includePostsList: true,
      });
      setLoading(false);
      if (!created) return;
      targetPath = created.path;
      mutate();
    }
    let routeSegment = targetPath && targetPath !== "/" ? targetPath : "";
    router.push(
      `/lish/${props.did}/${props.publicationName}/edit${routeSegment}`,
    );
  }

  return (
    <ActionButton
      id="edit-pages-button"
      icon={<BlockDocPageSmall />}
      label={loading ? "Creating..." : "Edit Pages"}
      onClick={handleClick}
      className="w-full"
    />
  );
}
