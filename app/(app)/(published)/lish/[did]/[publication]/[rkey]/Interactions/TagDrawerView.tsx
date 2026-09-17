"use client";
import { useDocument } from "contexts/DocumentContext";
import { TagPostsList } from "components/Interactions/TagPostsList";

export function TagDrawerView(props: { tag: string }) {
  const { uri, publication, normalizedPublication } = useDocument();
  return (
    <TagPostsList
      tag={props.tag}
      documentUri={uri}
      publicationUri={publication?.uri}
      showOtherPublications={
        normalizedPublication?.preferences?.showOtherPublicationsInTags !==
        false
      }
    />
  );
}
