import { useEditorStates } from "src/state/useEditorState";
import { useUIState } from "src/useUIState";
import { useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { insertFootnote } from "components/Blocks/TextBlock/insertFootnote";
import { TooltipButton } from "components/Buttons";
import { Props } from "components/Icons/Props";

export function FootnoteButton() {
  let rep = useReplicache();
  let entity_set = useEntitySetContext();
  let focusedBlock = useUIState((s) => s.focusedEntity);

  return (
    <TooltipButton
      tooltipContent={<div className="text-center">Footnote</div>}
      onMouseDown={async (e) => {
        e.preventDefault();
        if (!focusedBlock || focusedBlock.entityType !== "block") return;
        let editorState =
          useEditorStates.getState().editorStates[focusedBlock.entityID];
        if (!editorState?.view || !rep.rep) return;
        await insertFootnote(
          editorState.view,
          focusedBlock.entityID,
          rep.rep,
          entity_set.set,
        );
      }}
    >
      <FootnoteIcon />
    </TooltipButton>
  );
}

function FootnoteIcon(props: Props) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <text
        x="6"
        y="18"
        fontSize="14"
        fontWeight="bold"
        fill="currentColor"
        fontFamily="serif"
      >
        f
      </text>
      <text
        x="14"
        y="12"
        fontSize="9"
        fill="currentColor"
        fontFamily="sans-serif"
      >
        n
      </text>
    </svg>
  );
}
