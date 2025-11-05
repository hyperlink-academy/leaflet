import { useEffect, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { blockCommands } from "./BlockCommands";
import { useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { NestedCardThemeProvider } from "components/ThemeManager/ThemeProvider";
import { UndoManager } from "src/undoManager";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { setEditorState, useEditorStates } from "src/state/useEditorState";

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
  let ref = useRef<HTMLDivElement>(null);

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
    const matchesSearch = command.name
      .toLocaleLowerCase()
      .includes(searchValue.toLocaleLowerCase());
    const isVisible = !pub || !command.hiddenInPublication;
    return matchesSearch && isVisible;
  });

  useEffect(() => {
    if (
      !highlighted ||
      !commandResults.find((result) => result.name === highlighted)
    )
      setHighlighted(commandResults[0]?.name);
    if (commandResults.length === 1) {
      setHighlighted(commandResults[0].name);
    }
  }, [commandResults, setHighlighted, highlighted]);
  useEffect(() => {
    let listener = async (e: KeyboardEvent) => {
      let reverseDir = ref.current?.dataset.side === "top";
      let currentHighlightIndex = commandResults.findIndex(
        (command: { name: string }) =>
          highlighted && command.name === highlighted,
      );

      if (reverseDir ? e.key === "ArrowUp" : e.key === "ArrowDown") {
        setHighlighted(
          commandResults[
            currentHighlightIndex === commandResults.length - 1 ||
            currentHighlightIndex === undefined
              ? 0
              : currentHighlightIndex + 1
          ].name,
        );
        return;
      }
      if (reverseDir ? e.key === "ArrowDown" : e.key === "ArrowUp") {
        setHighlighted(
          commandResults[
            currentHighlightIndex === 0 ||
            currentHighlightIndex === undefined ||
            currentHighlightIndex === -1
              ? commandResults.length - 1
              : currentHighlightIndex - 1
          ].name,
        );
        return;
      }

      // on enter, select the highlighted item
      if (e.key === "Enter") {
        undoManager.startGroup();
        e.preventDefault();
        rep &&
          (await commandResults[currentHighlightIndex]?.onSelect(
            rep,
            {
              ...props,
              entity_set: entity_set.set,
            },
            undoManager,
          ));
        undoManager.endGroup();
        return;
      }
    };
    window.addEventListener("keydown", listener);

    return () => window.removeEventListener("keydown", listener);
  }, [highlighted, setHighlighted, commandResults, rep, entity_set.set, props]);

  return (
    <Popover.Root
      open
      onOpenChange={(open) => {
        if (!open) {
          clearCommandSearchText();
        }
      }}
    >
      <Popover.Trigger className="absolute left-0"></Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={16}
          collisionPadding={16}
          ref={ref}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={`
            commandMenuContent group/cmd-menu
            z-20 w-[264px]
            flex data-[side=top]:items-end items-start
            `}
        >
          <NestedCardThemeProvider>
            <div className="commandMenuResults w-full max-h-(--radix-popover-content-available-height) overflow-auto flex flex-col group-data-[side=top]/cmd-menu:flex-col-reverse bg-bg-page py-1 gap-0.5 border border-border rounded-md shadow-md">
              {commandResults.length === 0 ? (
                <div className="w-full text-tertiary text-center italic py-2 px-2 ">
                  No blocks found
                </div>
              ) : (
                commandResults.map((result, index) => (
                  <div key={index} className="contents">
                    <CommandResult
                      name={result.name}
                      icon={result.icon}
                      onSelect={() => {
                        rep &&
                          result.onSelect(
                            rep,
                            {
                              ...props,
                              entity_set: entity_set.set,
                            },
                            undoManager,
                          );
                      }}
                      highlighted={highlighted}
                      setHighlighted={(highlighted) =>
                        setHighlighted(highlighted)
                      }
                    />
                    {commandResults[index + 1] &&
                      result.type !== commandResults[index + 1].type && (
                        <hr className="mx-2 my-0.5 border-border" />
                      )}
                  </div>
                ))
              )}
            </div>
          </NestedCardThemeProvider>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

const CommandResult = (props: {
  name: string;
  icon: React.ReactNode;
  onSelect: () => void;
  highlighted: string | undefined;
  setHighlighted: (state: string | undefined) => void;
}) => {
  let isHighlighted = props.highlighted === props.name;

  return (
    <button
      className={`commandResult text-left flex gap-2 mx-1 pr-2 py-0.5 rounded-md text-secondary ${isHighlighted && "bg-border-light"}`}
      onMouseOver={() => {
        props.setHighlighted(props.name);
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        props.onSelect();
      }}
    >
      <div className="text-tertiary w-8 shrink-0 flex justify-center">
        {props.icon}
      </div>
      {props.name}
    </button>
  );
};
function usePublicationContext() {
  throw new Error("Function not implemented.");
}
