// @vitest-environment jsdom
import { act, createElement as h, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import { Doc } from "yjs";
import {
  applyAwarenessUpdate,
  Awareness,
  encodeAwarenessUpdate,
} from "y-protocols/awareness";
import { useUIState } from "src/useUIState";
import { TableBlock } from "./index";

let awareness: Awareness | undefined;
const block = {
  pageType: "doc",
  entityID: "table",
  factID: "fact",
  parent: "page",
  position: "a0",
  nextPosition: null,
  type: "table",
  previousBlock: null,
  nextBlock: null,
} as const;

vi.mock("../Block", () => ({
  BlockLayout: ({
    children,
    extraOptions,
    isSelected,
  }: {
    children: ReactNode;
    extraOptions?: ReactNode;
    isSelected: boolean;
  }) => h("div", null, children, isSelected ? extraOptions : null),
}));
vi.mock("../SettingsTriggerButton", () => ({
  SettingsTriggerButton: (props: React.ComponentProps<"button">) =>
    h("button", props),
}));
vi.mock("components/EntitySetProvider", () => ({
  useEntitySetContext: () => ({ permissions: { write: true }, set: "set" }),
}));
vi.mock("components/Menu", () => ({
  Menu: ({ trigger }: { trigger: ReactNode }) => trigger,
  MenuItem: () => null,
  MenuSeparator: () => null,
  CheckboxMenuItem: () => null,
  RadioMenuGroup: () => null,
  RadioMenuItem: () => null,
}));
vi.mock("src/replicache", () => {
  const rep = {};
  return { useReplicache: () => ({ rep }) };
});
vi.mock("../TextBlock/RenderYJSFragment", () => ({
  RenderYJSFragment: () => null,
}));
vi.mock("../TextBlock/useCollabText", () => ({
  flushPendingTextWrites: async () => {},
}));
vi.mock("src/yjsRealtime", () => ({
  useYjsRealtime: () => (awareness ? { awareness } : null),
}));
vi.mock("src/utils/copySelection", () => ({ copySelection: async () => {} }));
vi.mock("./useTableSnapshot", () => {
  const cols = ["a", "b"];
  const rows = ["first", "second"];
  const cells = Object.fromEntries(
    rows.map((row) => [
      row,
      Object.fromEntries(
        cols.map((col) => [
          col,
          {
            id: row + col,
            text: null,
            generation: row === "second" && col === "b" ? "pasted" : "",
          },
        ]),
      ),
    ]),
  );
  const snapshot = {
    rows,
    columns: cols,
    cells,
    alignments: ["left", "right"],
    header: true,
    striped: false,
    borders: true,
    loaded: true,
  };
  return { useTableSnapshot: () => snapshot };
});
vi.mock("./TableCellEditor", () => ({
  TableCellEditor: ({
    label,
    onNavigate,
  }: {
    label: string;
    onNavigate: (key: string) => boolean;
  }) =>
    h("div", {
      tabIndex: 0,
      "aria-label": label,
      ref: (node: HTMLElement | null) => {
        node?.focus();
      },
      onKeyDown: (event: KeyboardEvent) => {
        if (onNavigate(event.key)) event.preventDefault();
      },
    }),
}));

test("the first pointer press edits its cell and Enter stays in the same column", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const node = document.createElement("div");
  document.body.appendChild(node);
  const root = createRoot(node);
  const activeLabel = () => document.activeElement?.getAttribute("aria-label");
  try {
    useUIState.setState({ focusedEntity: null, selectedBlocks: [] });
    await act(async () => root.render(h(TableBlock, block)));
    expect(node.querySelector('[aria-label="Table options"]')).toBeNull();
    const firstRowSecondCell = node.querySelectorAll("th")[1];
    await act(async () => {
      firstRowSecondCell.dispatchEvent(
        new MouseEvent("pointerdown", {
          button: 0,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(activeLabel()).toBe("Row 1, column 2");
    expect(node.querySelector('[aria-label="Table options"]')).not.toBeNull();
    const blockMouseDown = vi.fn();
    document.body.addEventListener("mousedown", blockMouseDown);
    const editor = document.activeElement!;
    editor.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(blockMouseDown).not.toHaveBeenCalled();
    editor.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, shiftKey: true }),
    );
    expect(blockMouseDown).toHaveBeenCalledTimes(1);
    document.body.removeEventListener("mousedown", blockMouseDown);
    await act(async () => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(activeLabel()).toBe("Row 2, column 2");
  } finally {
    await act(async () => root.unmount());
    useUIState.setState({ focusedEntity: null, selectedBlocks: [] });
    node.remove();
    vi.unstubAllGlobals();
  }
});

test("outlines a peer's inactive cell until the peer moves or leaves", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const node = document.createElement("div");
  const root = createRoot(node);
  const local = new Awareness(new Doc());
  const peer = new Awareness(new Doc());
  awareness = local;
  const receive = () =>
    applyAwarenessUpdate(
      local,
      encodeAwarenessUpdate(peer, [peer.clientID]),
      "peer",
    );
  try {
    local.setLocalStateField("cursor", { entityID: "firsta" });
    await act(async () => root.render(h(TableBlock, block)));
    const [first, second] = node.querySelectorAll("th");
    const pasted = node.querySelectorAll("td")[1];
    expect(first.style.boxShadow).toBe("");
    await act(async () => {
      peer.setLocalState({ cursor: { entityID: "firstb" }, user: { hue: 45 } });
      receive();
    });
    expect(second.style.boxShadow).toContain("inset");
    await act(async () => {
      peer.setLocalStateField("cursor", { entityID: "secondb" });
      receive();
    });
    expect(second.style.boxShadow).toBe("");
    expect(pasted.style.boxShadow).toBe("");
    await act(async () => {
      peer.setLocalStateField("cursor", { entityID: "secondb:pasted" });
      receive();
    });
    expect(pasted.style.boxShadow).toContain("inset");
    await act(async () => {
      peer.setLocalState(null);
      receive();
    });
    expect(pasted.style.boxShadow).toBe("");
  } finally {
    await act(async () => root.unmount());
    awareness = undefined;
    local.doc.destroy();
    peer.doc.destroy();
    vi.unstubAllGlobals();
  }
});
