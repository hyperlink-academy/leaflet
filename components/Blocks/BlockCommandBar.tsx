import { useEffect, useRef, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-popover";
import { blockCommands } from "./BlockCommands";
import { useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";

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

  let { rep } = useReplicache();
  let entity_set = useEntitySetContext();

  let commandResults = blockCommands.filter((command) =>
    command.name.toLocaleLowerCase().includes(searchValue.toLocaleLowerCase()),
  );
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
      let input = document.getElementById("block-search");
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
        e.preventDefault();
        rep &&
          commandResults[currentHighlightIndex]?.onSelect(rep, {
            ...props,
            entity_set: entity_set.set,
          });
        return;
      }

      // radix menu component handles esc
      if (e.key === "Escape") return;

      // any keypress that is not up down, left right, enter, esc, space focuses the search
      if (input) {
        input.focus();
      }
    };
    window.addEventListener("keydown", listener);

    return () => window.removeEventListener("keydown", listener);
  }, [highlighted, setHighlighted, commandResults, rep, entity_set.set, props]);

  return (
    <DropdownMenu.Root open>
      <DropdownMenu.Trigger className="absolute left-0"></DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={16}
          collisionPadding={16}
          ref={ref}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={`commandMenuContent group/cmd-menu z-20 h-[333px] flex data-[side=top]:items-end items-start`}
        >
          <div className="flex flex-col group-data-[side=top]/cmd-menu:flex-col-reverse bg-bg-page py-1 gap-0.5 border border-border rounded-md shadow-md">
            {commandResults.length === 0 ? (
              <div className="text-tertiary text-center italic py-2">
                No blocks found
              </div>
            ) : (
              commandResults.map((result, index) => (
                <>
                  <CommandResult
                    key={index}
                    name={result.name}
                    icon={result.icon}
                    onSelect={() => {
                      rep &&
                        result.onSelect(rep, {
                          ...props,
                          entity_set: entity_set.set,
                        });
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
                </>
              ))
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
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
      className={`text-left flex gap-2 mx-1 px-1 py-0.5 rounded-md text-secondary ${isHighlighted && "bg-border-light"}`}
      onMouseOver={() => {
        isHighlighted
          ? props.setHighlighted(undefined)
          : props.setHighlighted(props.name);
      }}
      onMouseDown={() => props.onSelect()}
    >
      <div className="text-tertiary w-8 shrink-0 flex justify-center">
        {props.icon}
      </div>
      {props.name}
    </button>
  );
};
