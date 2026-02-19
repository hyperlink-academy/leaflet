import { useState } from "react";
import { blockCommands } from "./BlockCommands";
import { useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
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

  let { rep, undoManager } = useReplicache();
  let entity_set = useEntitySetContext();
  let { data: pub } = useLeafletPublicationData();

  // This clears '/' AND anything typed after it
  const clearCommandSearchText = () => {
    if (!props.entityID) return;
    const entityID = props.entityID;

    const existingState = useEditorStates.getState().editorStates[entityID];
    if (!existingState) return;

    const tr = existingState.editor.tr;
    tr.deleteRange(1, tr.doc.content.size - 1);
    setEditorState(entityID, { editor: existingState.editor.apply(tr) });
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
    return matchesSearch && isVisible;
  });

  return (
    <Combobox
      triggerClassName="absolute left-0"
      results={commandResults.map((r) => r.name)}
      highlighted={highlighted}
      setHighlighted={setHighlighted}
      onSelect={async () => {
        let command = commandResults.find((c) => c.name === highlighted);
        if (!command || !rep) return;
        undoManager.startGroup();
        await command.onSelect(
          rep,
          { ...props, entity_set: entity_set.set },
          undoManager,
        );
        undoManager.endGroup();
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
              className="pl-1!"
              result={result.name}
              onSelect={() => {
                rep &&
                  result.onSelect(
                    rep,
                    { ...props, entity_set: entity_set.set },
                    undoManager,
                  );
              }}
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
