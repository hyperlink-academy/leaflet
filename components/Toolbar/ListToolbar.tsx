import { Separator, ShortcutKey } from "components/Layout";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { metaKey } from "src/utils/metaKey";
import { ToolbarButton } from ".";
import { indent, outdent, outdentFull, orderListItems, unorderListItems } from "src/utils/list-operations";
import { useEffect } from "react";
import { Props } from "components/Icons/Props";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";

export const ListButton = (props: { setToolbarState: (s: "list") => void }) => {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let isList = useEntity(focusedBlock?.entityID || null, "block/is-list");
  let siblings = useBlocks(
    focusedBlock?.entityType === "block" ? focusedBlock.parent : null,
  );

  let block = siblings.find((s) => s.value === focusedBlock?.entityID);

  let { rep } = useReplicache();

  return (
    <div className="flex items-center gap-1">
      <ToolbarButton
        tooltipContent={
          <div className="flex flex-col gap-1 justify-center">
            <div className="text-center">Make List</div>
            <div className="flex gap-1">
              {
                <>
                  <ShortcutKey> {metaKey()}</ShortcutKey> +{" "}
                  <ShortcutKey> Alt </ShortcutKey> +{" "}
                  <ShortcutKey> L </ShortcutKey>
                </>
              }
            </div>
          </div>
        }
        onClick={(e) => {
          e.preventDefault();
          if (!focusedBlock || !block) return;
          if (!isList?.data.value) {
            rep?.mutate.assertFact({
              entity: focusedBlock?.entityID,
              attribute: "block/is-list",
              data: { value: true, type: "boolean" },
            });
          } else {
            outdentFull(block, rep);
          }
        }}
      >
        <ListUnorderedSmall />
      </ToolbarButton>
      {isList?.data.value && (
        <ToolbarButton
          tooltipContent="List Options"
          onClick={() => {
            props.setToolbarState("list");
          }}
          className="-ml-1"
        >
          <ArrowRightTiny />
        </ToolbarButton>
      )}
    </div>
  );
};

export const ListToolbar = (props: { onClose: () => void }) => {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let foldedBlocks = useUIState((s) => s.foldedBlocks);
  let toggleFold = useUIState((s) => s.toggleFold);
  let siblings = useBlocks(
    focusedBlock?.entityType === "block" ? focusedBlock.parent : null,
  );

  let isCheckbox = useEntity(
    focusedBlock?.entityID || null,
    "block/check-list",
  );
  let isList = useEntity(focusedBlock?.entityID || null, "block/is-list");

  let block = siblings.find((s) => s.value === focusedBlock?.entityID);
  let previousBlock =
    siblings[siblings.findIndex((b) => b.value === focusedBlock?.entityID) - 1];
  let { rep } = useReplicache();

  useEffect(() => {
    if (!isList?.data.value) {
      let timeout = setTimeout(() => props.onClose(), 50);
      return () => clearTimeout(timeout);
    }
  }, [props, isList]);

  return (
    <div className="flex items-center gap-[6px]">
      <ToolbarButton
        disabled={!isList?.data.value}
        tooltipContent={
          <div className="flex flex-col gap-1 justify-center">
            <div className="text-center">Outdent Item</div>
            <div className="flex gap-1 justify-center">
              <ShortcutKey>Shift</ShortcutKey> + <ShortcutKey>Tab</ShortcutKey>
            </div>
          </div>
        }
        onClick={async () => {
          if (!rep || !block) return;
          await outdent(block, previousBlock, rep, { foldedBlocks, toggleFold });
        }}
      >
        <ListIndentDecreaseSmall />
      </ToolbarButton>
      <ToolbarButton
        tooltipContent={
          <div className="flex flex-col gap-1 justify-center">
            <div className="text-center">Indent Item</div>
            <div className="flex gap-1 justify-center">
              <ShortcutKey>Tab</ShortcutKey>
            </div>
          </div>
        }
        disabled={
          !previousBlock?.listData ||
          previousBlock.listData.depth < block?.listData?.depth!
        }
        onClick={async () => {
          if (!rep || !block || !previousBlock) return;
          await indent(block, previousBlock, rep, { foldedBlocks, toggleFold });
        }}
      >
        <ListIndentIncreaseSmall />
      </ToolbarButton>
      <Separator classname="h-6!" />
      <ToolbarButton
        disabled={!isList?.data.value}
        tooltipContent="Unordered List"
        onClick={() => {
          if (!block || !rep) return;
          unorderListItems(block, rep);
        }}
      >
        <ListUnorderedSmall />
      </ToolbarButton>
      <ToolbarButton
        disabled={!isList?.data.value}
        tooltipContent="Ordered List"
        onClick={() => {
          if (!block || !rep) return;
          orderListItems(block, rep);
        }}
      >
        <ListOrderedSmall />
      </ToolbarButton>
      <Separator classname="h-6" />
      <ToolbarButton
        disabled={!isList?.data.value}
        tooltipContent=<div className="flex flex-col gap-1 justify-center">
          <div className="text-center">Add a Checkbox</div>
          <div className="flex gap-1 font-normal">
            <ShortcutKey>[</ShortcutKey>
            <ShortcutKey>]</ShortcutKey>
          </div>
        </div>
        onClick={() => {
          if (!focusedBlock) return;

          if (!isCheckbox) {
            rep?.mutate.assertFact({
              entity: focusedBlock.entityID,
              attribute: "block/check-list",
              data: { type: "boolean", value: false },
            });
          } else {
            rep?.mutate.retractFact({
              factID: isCheckbox.id,
            });
          }
        }}
      >
        <ListCheckboxSmall />
      </ToolbarButton>
    </div>
  );
};

export const ListUnorderedSmall = (props: Props) => {
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
        d="M8.1687 5.19995C7.61642 5.19995 7.1687 5.64767 7.1687 6.19995C7.1687 6.75224 7.61642 7.19995 8.1687 7.19995H19.5461C20.0984 7.19995 20.5461 6.75224 20.5461 6.19995C20.5461 5.64767 20.0984 5.19995 19.5461 5.19995H8.1687ZM4.35361 7.10005C4.85067 7.10005 5.25361 6.69711 5.25361 6.20005C5.25361 5.70299 4.85067 5.30005 4.35361 5.30005C3.85656 5.30005 3.45361 5.70299 3.45361 6.20005C3.45361 6.69711 3.85656 7.10005 4.35361 7.10005ZM5.25361 12.0001C5.25361 12.4972 4.85067 12.9001 4.35361 12.9001C3.85656 12.9001 3.45361 12.4972 3.45361 12.0001C3.45361 11.503 3.85656 11.1001 4.35361 11.1001C4.85067 11.1001 5.25361 11.503 5.25361 12.0001ZM8.1687 11C7.61642 11 7.1687 11.4477 7.1687 12C7.1687 12.5523 7.61642 13 8.1687 13H19.5461C20.0984 13 20.5461 12.5523 20.5461 12C20.5461 11.4477 20.0984 11 19.5461 11H8.1687ZM5.25361 17.8001C5.25361 18.2972 4.85067 18.7001 4.35361 18.7001C3.85656 18.7001 3.45361 18.2972 3.45361 17.8001C3.45361 17.3031 3.85656 16.9001 4.35361 16.9001C4.85067 16.9001 5.25361 17.3031 5.25361 17.8001ZM8.1687 16.8C7.61642 16.8 7.1687 17.2478 7.1687 17.8C7.1687 18.3523 7.61642 18.8 8.1687 18.8H19.5461C20.0984 18.8 20.5461 18.3523 20.5461 17.8C20.5461 17.2478 20.0984 16.8 19.5461 16.8H8.1687Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const ListOrderedSmall = (props: Props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Horizontal lines */}
      <path
        d="M9 6H20M9 12H20M9 18H20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Numbers 1, 2, 3 */}
      <text
        x="4.5"
        y="7.5"
        fontSize="7"
        fill="currentColor"
        fontFamily="system-ui, -apple-system, sans-serif"
        textAnchor="middle"
      >
        1.
      </text>
      <text
        x="4.5"
        y="13.5"
        fontSize="7"
        fill="currentColor"
        fontFamily="system-ui, -apple-system, sans-serif"
        textAnchor="middle"
      >
        2.
      </text>
      <text
        x="4.5"
        y="19.5"
        fontSize="7"
        fill="currentColor"
        fontFamily="system-ui, -apple-system, sans-serif"
        textAnchor="middle"
      >
        3.
      </text>
    </svg>
  );
};

const ListIndentIncreaseSmall = (props: Props) => {
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
        d="M8.2771 5.19995C7.72481 5.19995 7.2771 5.64767 7.2771 6.19995C7.2771 6.75224 7.72481 7.19995 8.2771 7.19995H19.6545C20.2068 7.19995 20.6545 6.75224 20.6545 6.19995C20.6545 5.64767 20.2068 5.19995 19.6545 5.19995H8.2771ZM4.46201 7.10005C4.95907 7.10005 5.36201 6.6971 5.36201 6.20005C5.36201 5.70299 4.95907 5.30005 4.46201 5.30005C3.96496 5.30005 3.56201 5.70299 3.56201 6.20005C3.56201 6.6971 3.96496 7.10005 4.46201 7.10005ZM11.1218 12.0001C11.1218 12.4972 10.7188 12.9001 10.2218 12.9001C9.72472 12.9001 9.32178 12.4972 9.32178 12.0001C9.32178 11.503 9.72472 11.1001 10.2218 11.1001C10.7188 11.1001 11.1218 11.503 11.1218 12.0001ZM14.0369 11C13.4846 11 13.0369 11.4477 13.0369 12C13.0369 12.5523 13.4846 13 14.0369 13H19.6545C20.2068 13 20.6545 12.5523 20.6545 12C20.6545 11.4477 20.2068 11 19.6545 11H14.0369ZM11.1218 17.8002C11.1218 18.2973 10.7188 18.7002 10.2218 18.7002C9.72472 18.7002 9.32178 18.2973 9.32178 17.8002C9.32178 17.3032 9.72472 16.9002 10.2218 16.9002C10.7188 16.9002 11.1218 17.3032 11.1218 17.8002ZM14.037 16.8C13.4847 16.8 13.037 17.2478 13.037 17.8C13.037 18.3523 13.4847 18.8 14.037 18.8L19.6547 18.8C20.207 18.8 20.6547 18.3523 20.6547 17.8C20.6547 17.2478 20.207 16.8 19.6547 16.8L14.037 16.8ZM5.00428 15.5359H2.23413C1.88895 15.5359 1.60913 15.2561 1.60913 14.9109C1.60913 14.5657 1.88895 14.2859 2.23413 14.2859H5.00453L4.00116 13.2825C3.70827 12.9896 3.70827 12.5148 4.00116 12.2219C4.29406 11.929 4.76893 11.929 5.06182 12.2219L7.75072 14.9108L5.06182 17.5997C4.76893 17.8926 4.29406 17.8926 4.00116 17.5997C3.70827 17.3068 3.70827 16.8319 4.00116 16.539L5.00428 15.5359Z"
        fill="currentColor"
      />
    </svg>
  );
};

const ListIndentDecreaseSmall = (props: Props) => {
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
        d="M8.27716 5.19995C7.72488 5.19995 7.27716 5.64767 7.27716 6.19995C7.27716 6.75224 7.72488 7.19995 8.27716 7.19995H19.6546C20.2069 7.19995 20.6546 6.75224 20.6546 6.19995C20.6546 5.64767 20.2069 5.19995 19.6546 5.19995H8.27716ZM4.46208 7.10005C4.95913 7.10005 5.36208 6.69711 5.36208 6.20005C5.36208 5.70299 4.95913 5.30005 4.46208 5.30005C3.96502 5.30005 3.56208 5.70299 3.56208 6.20005C3.56208 6.69711 3.96502 7.10005 4.46208 7.10005ZM5.36208 12.0001C5.36208 12.4972 4.95913 12.9001 4.46208 12.9001C3.96502 12.9001 3.56208 12.4972 3.56208 12.0001C3.56208 11.503 3.96502 11.1001 4.46208 11.1001C4.95913 11.1001 5.36208 11.503 5.36208 12.0001ZM8.27716 11C7.72488 11 7.27716 11.4477 7.27716 12C7.27716 12.5523 7.72488 13 8.27716 13H20.106C20.6583 13 21.106 12.5523 21.106 12C21.106 11.4477 20.6583 11 20.106 11H8.27716ZM11.1218 17.8001C11.1218 18.2972 10.7189 18.7001 10.2218 18.7001C9.72479 18.7001 9.32184 18.2972 9.32184 17.8001C9.32184 17.3031 9.72479 16.9001 10.2218 16.9001C10.7189 16.9001 11.1218 17.3031 11.1218 17.8001ZM14.0372 16.8C13.4849 16.8 13.0372 17.2478 13.0372 17.8C13.0372 18.3523 13.4849 18.8 14.0372 18.8L19.6549 18.8C20.2071 18.8 20.6549 18.3523 20.6549 17.8C20.6549 17.2478 20.2071 16.8 19.6549 16.8L14.0372 16.8ZM4.48975 17.1753L5.4936 16.1721C5.78659 15.8793 5.78675 15.4044 5.49395 15.1114C5.20115 14.8185 4.72628 14.8183 4.43329 15.1111L1.74243 17.8002L4.43329 20.4892C4.72628 20.782 5.20115 20.7819 5.49395 20.4889C5.78675 20.1959 5.78659 19.721 5.4936 19.4282L4.48999 18.4253H6.96185C7.30703 18.4253 7.58685 18.1455 7.58685 17.8003C7.58685 17.4551 7.30703 17.1753 6.96185 17.1753H4.48975Z"
        fill="currentColor"
      />
    </svg>
  );
};

const ListCheckboxSmall = (props: Props) => {
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
        d="M19.2777 7.26811C19.6649 6.79541 19.5956 6.09831 19.1229 5.7111C18.6502 5.32389 17.9531 5.3932 17.5658 5.86591L11.0608 13.8073L8.55229 11.4827C8.10409 11.0674 7.40406 11.094 6.98873 11.5422C6.57339 11.9904 6.60003 12.6905 7.04823 13.1058L10.4194 16.2298C10.6432 16.4372 10.9428 16.543 11.2472 16.5221C11.5517 16.5012 11.834 16.3554 12.0273 16.1194L19.2777 7.26811ZM5.72192 5.78943C4.61735 5.78943 3.72192 6.68486 3.72192 7.78943V17.2894C3.72192 18.394 4.61735 19.2894 5.72192 19.2894H15.2219C16.3265 19.2894 17.2219 18.394 17.2219 17.2894V14.4884C17.2219 14.0741 16.8861 13.7384 16.4719 13.7384C16.0577 13.7384 15.7219 14.0741 15.7219 14.4884V17.2894C15.7219 17.5656 15.4981 17.7894 15.2219 17.7894H5.72192C5.44578 17.7894 5.22192 17.5656 5.22192 17.2894V7.78943C5.22192 7.51329 5.44578 7.28943 5.72192 7.28943H12.9815C13.3957 7.28943 13.7315 6.95364 13.7315 6.53943C13.7315 6.12522 13.3957 5.78943 12.9815 5.78943H5.72192Z"
        fill="currentColor"
      />
    </svg>
  );
};
