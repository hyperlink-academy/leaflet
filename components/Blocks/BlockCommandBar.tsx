import { useState } from "react";
import { blockCommands } from "./BlockCommands";
import { useEntity, useReplicache } from "src/replicache";
import { useSubscribe } from "src/replicache/useSubscribe";
import { getBlocksWithType } from "src/replicache/getBlocks";
import { useEntitySetContext } from "components/EntitySetProvider";
import {
  useLeafletPublicationData,
  useLeafletPublicationPage,
} from "components/PageSWRDataProvider";
import { setEditorState, useEditorStates } from "src/state/useEditorState";
import { Combobox, ComboboxResult } from "components/Combobox";

type Props = {
  parent: string;
  entityID: string | null;
  position: string | null;
  nextPosition: string | null;
  factID?: string | undefined;
  first?: boolean;
  className?: string;
};

export const BlockCommandBar = ({
  props,
  searchValue,
}: {
  props: Props;
  searchValue: string;
}) => {
  let [highlighted, setHighlighted] = useState<string | undefined>(undefined);

  let { rep, undoManager, rootEntity } = useReplicache();
  let entity_set = useEntitySetContext();
  let { data: pub } = useLeafletPublicationData();
  let publicationPage = useLeafletPublicationPage();
  let inPublicationEdit = !!publicationPage;

  // Gating for the members-only delimiter: memberships enabled, first page
  // only (that's the page the server truncates), and at most one per post.
  let membershipsEnabled =
    !!pub?.publications?.publication_membership_settings?.enabled;
  let firstPage = useEntity(rootEntity, "root/page")[0]?.data.value;
  let hasMembersDelimiter = useSubscribe(
    rep,
    async (tx) => {
      let blocks = await getBlocksWithType(tx, props.parent);
      return !!blocks?.some((b) => b.type === "members-only-delimiter");
    },
    { default: false, dependencies: [props.parent] },
  );

  // This clears '/' AND anything typed after it
  const clearCommandSearchText = () => {
    if (!props.entityID) return;
    const entityID = props.entityID;

    const existingState = useEditorStates.getState().editorStates[entityID];
    if (!existingState) return;

    const tr = existingState.editor.tr;
    tr.deleteRange(1, tr.doc.content.size - 1);
    // Dispatch through the view so trackUndoRedo records an inverse entry;
    // a direct apply left the cleared scaffolding text with no inverse and it
    // reappeared on redo.
    if (existingState.view) existingState.view.dispatch(tr);
    else setEditorState(entityID, { editor: existingState.editor.apply(tr) });
  };

  let commandResults = blockCommands.filter((command) => {
    const lowerSearchValue = searchValue.toLocaleLowerCase();
    const matchesName = command.name
      .toLocaleLowerCase()
      .includes(lowerSearchValue);
    const matchesAlternate =
      command.alternateNames?.some((altName) =>
        altName.toLocaleLowerCase().includes(lowerSearchValue),
      ) ?? false;
    const matchesSearch = matchesName || matchesAlternate;
    const isVisible = !pub || !command.hiddenInPublication;
    // Publication-only blocks (post list, subscribe) are available on any
    // leaflet within a publication — both posts and the publication's pages.
    // pub is also set for standalone published docs (with no publication),
    // so gate on the joined publication record rather than pub itself.
    const allowedInContext = !command.publicationOnly || !!pub?.publications;
    // Subpage/canvas blocks don't belong in a publication's own pages.
    const allowedOnPage =
      !command.hiddenOnPublicationPage || !inPublicationEdit;
    const allowedDelimiter =
      !command.membersOnlyDelimiter ||
      (membershipsEnabled &&
        props.parent === firstPage &&
        !hasMembersDelimiter);
    return (
      matchesSearch &&
      isVisible &&
      allowedInContext &&
      allowedOnPage &&
      allowedDelimiter
    );
  });

  return (
    <Combobox
      open
      triggerClassName="absolute left-0"
      resultsClassName="py-1"
      results={commandResults.map((r) => r.name)}
      highlighted={highlighted}
      setHighlighted={setHighlighted}
      onSelect={async () => {
        await undoManager.withUndoGroup(async () => {
          let command = commandResults.find((c) => c.name === highlighted);
          if (!command || !rep) return;
          await command.onSelect(
            rep,
            { ...props, entity_set: entity_set.set },
            undoManager,
          );
        });
      }}
      onOpenChange={() => clearCommandSearchText()}
    >
      {commandResults.length === 0 ? (
        <div className="w-full text-tertiary text-center italic py-2 px-2 ">
          No blocks found
        </div>
      ) : (
        commandResults.map((result, index) => (
          <div key={index} className="contents">
            <ComboboxResult
              className="pl-0!"
              result={result.name}
              onSelect={() =>
                undoManager.withUndoGroup(async () => {
                  if (!rep) return;
                  await result.onSelect(
                    rep,
                    { ...props, entity_set: entity_set.set },
                    undoManager,
                  );
                })
              }
              highlighted={highlighted}
              setHighlighted={setHighlighted}
            >
              <div className="text-tertiary w-8 shrink-0 flex justify-center">
                {result.icon}
              </div>
              {result.name}
            </ComboboxResult>
            {commandResults[index + 1] &&
              result.type !== commandResults[index + 1].type && (
                <hr className="mx-2 my-0.5 border-border" />
              )}
          </div>
        ))
      )}
    </Combobox>
  );
};
