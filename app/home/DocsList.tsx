"use client";

import { useEffect, useState } from "react";
import { getHomeDocs, HomeDoc } from "./storage";
import useSWR from "swr";
import { ReplicacheProvider } from "src/replicache";
import { DocPreview } from "./DocPreview";

export function DocsList() {
  let { data: docs } = useSWR("docs", () => getHomeDocs(), {
    fallbackData: [],
  });

  return (
    <div className="homeDocGrid grow w-full h-full overflow-y-scroll no-scrollbar pt-3 pb-28 sm:pt-6 sm:pb-12 ">
      <div className="grid auto-rows-max md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-y-8 gap-x-4 sm:gap-6 grow">
        {docs
          .sort((a, b) => (a.added_at > b.added_at ? -1 : 1))
          .filter((d) => !d.hidden)
          .map(({ token: doc }) => (
            <ReplicacheProvider
              key={doc.id}
              rootEntity={doc.root_entity}
              token={doc}
              name={doc.root_entity}
              initialFacts={[]}
            >
              <DocPreview token={doc} doc_id={doc.root_entity} />
            </ReplicacheProvider>
          ))}
      </div>
    </div>
  );
}
