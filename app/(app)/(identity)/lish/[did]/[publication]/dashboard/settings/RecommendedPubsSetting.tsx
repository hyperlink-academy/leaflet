"use client";

import { useEffect, useState } from "react";
import { callRPC } from "app/api/rpc/client";
import { Input } from "components/Input";
import { Combobox, ComboboxResult } from "components/Combobox";
import { InputSetting, SettingsSection } from "components/SettingsLayout";
import { DeleteTiny } from "components/Icons/DeleteTiny";
import { StandardSitePublicationItem } from "components/Blocks/StandardSitePublicationBlock/StandardSitePublicationItem";

const MAX_RECOMMENDATIONS = 3;

export function RecommendationSettings(props: {
  publicationUri: string;
  // null while the saved recommendations are still loading — edits are
  // blocked then so a save can't overwrite recommendations we haven't loaded.
  recommendations: string[] | null;
  setRecommendations: (recs: string[]) => void;
}) {
  let [query, setQuery] = useState("");
  let [results, setResults] = useState<{ uri: string; name: string }[]>([]);
  let [dropdownOpen, setDropdownOpen] = useState(false);
  let [highlighted, setHighlighted] = useState<string | undefined>(undefined);

  let recommendations = props.recommendations ?? [];
  let atLimit = recommendations.length >= MAX_RECOMMENDATIONS;
  let loading = props.recommendations === null;

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setDropdownOpen(false);
      return;
    }
    let stale = false;
    let handler = setTimeout(async () => {
      let publications = await callRPC("search_publication_names", {
        query: query.trim(),
        limit: 10,
      });
      if (stale) return;
      let found = publications.result.publications.map((p) => ({
        uri: p.uri,
        name: p.name,
      }));
      setResults(found);
      setDropdownOpen(found.length > 0);
    }, 300);
    return () => {
      stale = true;
      clearTimeout(handler);
    };
  }, [query]);

  // Filtered at render rather than in the search effect so adding/removing a
  // recommendation doesn't re-trigger the search.
  let visibleResults = results.filter(
    (r) => r.uri !== props.publicationUri && !recommendations.includes(r.uri),
  );

  let select = (uri: string | undefined) => {
    let pub = visibleResults.find((r) => r.uri === uri);
    if (!pub) return;
    props.setRecommendations([...recommendations, pub.uri]);
    setQuery("");
    setResults([]);
    setDropdownOpen(false);
    setHighlighted(undefined);
  };

  return (
    <SettingsSection title="Recommendations">
      <p>
        Recommend up to {MAX_RECOMMENDATIONS} Standard Site publications. <br />
        They'll be shown to readers after they subscribe.
      </p>
      <InputSetting label="Publications">
        <div className="flex flex-col gap-2">
          {!atLimit && (
            <Combobox
              open={dropdownOpen && visibleResults.length > 0}
              onOpenChange={(open) => {
                if (!open) {
                  setDropdownOpen(false);
                  setHighlighted(undefined);
                }
              }}
              results={visibleResults.map((r) => r.uri)}
              highlighted={highlighted}
              setHighlighted={setHighlighted}
              onSelect={() => select(highlighted)}
              zIndex={60}
              sideOffset={4}
              className="w-(--radix-popover-trigger-width)!"
              trigger={
                <Input
                  className="input-with-border w-full text-primary"
                  type="text"
                  placeholder="search publications…"
                  value={query}
                  disabled={loading}
                  onChange={(e) => setQuery(e.currentTarget.value)}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      // Adding a recommendation shouldn't submit the whole
                      // settings form.
                      e.preventDefault();
                      e.stopPropagation();
                      select(highlighted);
                    }
                  }}
                  autoComplete="off"
                />
              }
            >
              {visibleResults.map((pub) => (
                <ComboboxResult
                  key={pub.uri}
                  result={pub.uri}
                  highlighted={highlighted}
                  setHighlighted={setHighlighted}
                  onSelect={() => select(pub.uri)}
                  className="text-sm leading-snug"
                >
                  {pub.name}
                </ComboboxResult>
              ))}
            </Combobox>
          )}
          {recommendations.map((uri) => (
            <div
              key={uri}
              className="relative border border-border-light rounded-md bg-bg-page overflow-hidden light-container"
            >
              <StandardSitePublicationItem uri={uri} />
              <button
                type="button"
                className="absolute top-2 right-2 z-10 bg-accent-1 rounded-full text-accent-2 h-5 w-5 flex justify-center items-center"
                aria-label="Remove recommendation"
                onClick={() =>
                  props.setRecommendations(
                    recommendations.filter((r) => r !== uri),
                  )
                }
              >
                <DeleteTiny />
              </button>
            </div>
          ))}
        </div>
      </InputSetting>
    </SettingsSection>
  );
}
