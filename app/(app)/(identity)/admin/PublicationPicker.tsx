"use client";

import { useState } from "react";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { Input } from "components/Input";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import {
  searchPublications,
  type AdminPublicationSearchResult,
} from "actions/admin/importSubscribers";

// Search-and-select a publication by name, handle, DID, or at:// uri. Shared
// by the admin import tools.
export function PublicationPicker(props: {
  publication: AdminPublicationSearchResult | null;
  onChange: (p: AdminPublicationSearchResult | null) => void;
}) {
  let toaster = useToaster();
  let [query, setQuery] = useState("");
  let [searching, setSearching] = useState(false);
  let [results, setResults] = useState<AdminPublicationSearchResult[] | null>(
    null,
  );

  let runSearch = async () => {
    let q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    let res = await searchPublications(q);
    setSearching(false);
    if (!res.ok) {
      toaster({ type: "error", content: "Search failed: " + res.error });
      return;
    }
    setResults(res.value);
  };

  if (props.publication) {
    return (
      <div className="flex flex-col gap-3">
        <h3>Publication</h3>
        <div className="flex items-center gap-3 border border-border-light rounded-md px-3 py-2">
          <PublicationLabel publication={props.publication} />
          <ButtonSecondary compact onClick={() => props.onChange(null)}>
            Change
          </ButtonSecondary>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h3>Publication</h3>
      <div className="input-with-border py-0! flex items-center gap-2 w-full">
        <Input
          className="appearance-none! grow outline-none! min-w-0 py-1!"
          placeholder="name, handle.bsky.social, did:plc:…, or at:// uri"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch();
            }
          }}
        />
        <ButtonSecondary
          compact
          type="button"
          disabled={!query.trim() || searching}
          onClick={runSearch}
        >
          {searching ? <DotLoader /> : "Search"}
        </ButtonSecondary>
      </div>
      {results?.length === 0 && (
        <div className="text-tertiary text-sm">No publications found.</div>
      )}
      {results?.map((pub) => (
        <div
          key={pub.uri}
          className="flex items-center gap-3 border border-border-light rounded-md px-3 py-2"
        >
          <PublicationLabel publication={pub} />
          <ButtonPrimary compact onClick={() => props.onChange(pub)}>
            Select
          </ButtonPrimary>
        </div>
      ))}
    </div>
  );
}

function PublicationLabel(props: {
  publication: AdminPublicationSearchResult;
}) {
  let pub = props.publication;
  return (
    <div className="flex flex-col min-w-0 grow leading-snug">
      <div className="font-bold text-primary text-sm truncate">{pub.name}</div>
      <div className="text-tertiary text-xs flex flex-wrap gap-x-2">
        {pub.handle && <span>@{pub.handle}</span>}
        <span>
          {pub.subscriberCount} email subscriber
          {pub.subscriberCount === 1 ? "" : "s"}
        </span>
      </div>
      <div className="text-tertiary text-xs font-mono truncate">{pub.uri}</div>
    </div>
  );
}
