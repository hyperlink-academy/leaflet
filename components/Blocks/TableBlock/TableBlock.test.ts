// @vitest-environment jsdom
import { act, createElement as h, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import { useUIState } from "src/useUIState";
import { TableBlock } from "./index";

vi.mock("../Block", () => ({
  BlockLayout: ({ children }: { children: ReactNode }) =>
    h("div", null, children),
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
vi.mock("src/utils/copySelection", () => ({ copySelection: async () => {} }));
vi.mock("./useTableSnapshot", () => {
  const cols = ["a", "b"];
  const rows = ["first", "second"];
  const cells = Object.fromEntries(
    rows.map((row) => [
      row,
      Object.fromEntries(
        cols.map((col) => [col, { id: row + col, text: null, generation: "" }]),
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
    await act(async () =>
      root.render(
        h(TableBlock, {
          pageType: "doc",
          entityID: "table",
          factID: "fact",
          parent: "page",
          position: "a0",
          nextPosition: null,
          type: "table",
          previousBlock: null,
          nextBlock: null,
        }),
      ),
    );
    expect(node.querySelector('[aria-label="Table options"]')).toBeNull();
    const firstRowSecondCell = node.querySelectorAll("th")[1];
    await act(async () => {
      firstRowSecondCell.dispatchEvent(
        new PointerEvent("pointerdown", {
          pointerType: "mouse",
          button: 0,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(activeLabel()).toBe("Row 1, column 2");
    expect(node.querySelector('[aria-label="Table options"]')).not.toBeNull();
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
