import { useUIState } from "src/useUIState";
import { ToolbarButton } from ".";
import { useCallback } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { Props } from "components/Icons/Props";

export function TextAlignmentToolbar() {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let { rep } = useReplicache();
  let setAlignment = useCallback(
    (alignment: "right" | "center" | "left") => {
      if (focusedBlock?.entityType === "page" || !focusedBlock) return null;
      rep?.mutate.assertFact({
        entity: focusedBlock?.entityID,
        attribute: "block/text-alignment",
        data: { type: "text-alignment-type-union", value: alignment },
      });
    },
    [focusedBlock, rep],
  );
  return (
    <>
      <ToolbarButton
        onClick={() => setAlignment("left")}
        tooltipContent="Align Left"
      >
        <AlignLeftSmall />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => setAlignment("center")}
        tooltipContent="Align Center"
      >
        <AlignCenterSmall />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => setAlignment("right")}
        tooltipContent="Align Right"
      >
        <AlignRightSmall />
      </ToolbarButton>
    </>
  );
}

export function TextAlignmentButton(props: {
  setToolbarState: (s: "text-alignment") => void;
  className?: string;
}) {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let alignment =
    useEntity(focusedBlock?.entityID || null, "block/text-alignment")?.data
      .value || "left";
  return (
    <ToolbarButton
      hiddenOnCanvas
      tooltipContent={<div>Align</div>}
      className={`${props.className}`}
      onClick={() => {
        props.setToolbarState("text-alignment");
      }}
    >
      {alignment === "left" ? (
        <AlignLeftSmall />
      ) : alignment === "center" ? (
        <AlignCenterSmall />
      ) : (
        <AlignRightSmall />
      )}
    </ToolbarButton>
  );
}

export const AlignLeftSmall = (props: Props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.5 6.19983C3.5 5.64754 3.94772 5.19983 4.5 5.19983H19.6547C20.2069 5.19983 20.6547 5.64754 20.6547 6.19983C20.6547 6.75211 20.2069 7.19983 19.6547 7.19983H4.5C3.94772 7.19983 3.5 6.75211 3.5 6.19983ZM3.5 12C3.5 11.4477 3.94772 11 4.5 11H12.8243C13.3766 11 13.8243 11.4477 13.8243 12C13.8243 12.5523 13.3766 13 12.8243 13H4.5C3.94772 13 3.5 12.5523 3.5 12ZM4.5 16.7999C3.94772 16.7999 3.5 17.2476 3.5 17.7999C3.5 18.3522 3.94772 18.7999 4.5 18.7999H16.1426C16.6949 18.7999 17.1426 18.3522 17.1426 17.7999C17.1426 17.2476 16.6949 16.7999 16.1426 16.7999H4.5Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const AlignCenterSmall = (props: Props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.5 6.19983C3.5 5.64754 3.94772 5.19983 4.5 5.19983H19.6547C20.2069 5.19983 20.6547 5.64754 20.6547 6.19983C20.6547 6.75211 20.2069 7.19983 19.6547 7.19983H4.5C3.94772 7.19983 3.5 6.75211 3.5 6.19983ZM6.91519 12C6.91519 11.4477 7.36291 11 7.91519 11H16.2395C16.7918 11 17.2395 11.4477 17.2395 12C17.2395 12.5523 16.7918 13 16.2395 13H7.91519C7.36291 13 6.91519 12.5523 6.91519 12ZM6.25601 16.7999C5.70373 16.7999 5.25601 17.2476 5.25601 17.7999C5.25601 18.3522 5.70373 18.7999 6.25601 18.7999H17.8987C18.4509 18.7999 18.8987 18.3522 18.8987 17.7999C18.8987 17.2476 18.4509 16.7999 17.8987 16.7999H6.25601Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const AlignRightSmall = (props: Props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.5 6.19983C3.5 5.64754 3.94772 5.19983 4.5 5.19983H19.6547C20.2069 5.19983 20.6547 5.64754 20.6547 6.19983C20.6547 6.75211 20.2069 7.19983 19.6547 7.19983H4.5C3.94772 7.19983 3.5 6.75211 3.5 6.19983ZM10.3304 12C10.3304 11.4477 10.7781 11 11.3304 11H19.6547C20.2069 11 20.6547 11.4477 20.6547 12C20.6547 12.5523 20.2069 13 19.6547 13H11.3304C10.7781 13 10.3304 12.5523 10.3304 12ZM8.01202 16.7999C7.45974 16.7999 7.01202 17.2476 7.01202 17.7999C7.01202 18.3522 7.45974 18.7999 8.01202 18.7999H19.6547C20.2069 18.7999 20.6547 18.3522 20.6547 17.7999C20.6547 17.2476 20.2069 16.7999 19.6547 16.7999H8.01202Z"
        fill="currentColor"
      />
    </svg>
  );
};
